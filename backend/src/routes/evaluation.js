'use strict';

const express = require('express');
const axios = require('axios');
const { authenticate, authorize } = require('../middleware/auth');
const { Grievance } = require('../models/Grievance');
const Pattern = require('../models/Pattern');
const Action = require('../models/Action');
const Outcome = require('../models/Outcome');

const router = express.Router();

function AI_URL() {
  return process.env.AI_SERVICE_URL || 'http://localhost:8000';
}

// ---------------------------------------------------------------------------
// GET /api/evaluation/metrics
// ---------------------------------------------------------------------------
router.get('/metrics', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [
      totalGrievances, resolvedGrievances, grievancesByCategory,
      totalPatterns, activePatterns,
      totalActions, approvedActions, resolvedActions,
      totalOutcomes, outcomesByDirection, recurrenceDetectedCount,
      allGrievances,
    ] = await Promise.all([
      Grievance.countDocuments({}),
      Grievance.countDocuments({ status: 'Resolved' }),
      Grievance.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Pattern.countDocuments({}),
      Pattern.countDocuments({ status: 'active' }),
      Action.countDocuments({}),
      Action.countDocuments({ approvalStatus: 'Approved' }),
      Action.countDocuments({ actionStatus: 'Resolved' }),
      Outcome.countDocuments({}),
      Outcome.aggregate([{ $group: { _id: '$outcomeDirection', count: { $sum: 1 } } }]),
      Outcome.countDocuments({ recurrenceStatus: 'Detected' }),
      Grievance.find({ status: 'Resolved' }).select('statusHistory').lean(),
    ]);

    let avgResolutionTimeDays = null;
    const deltas = [];
    for (const g of allGrievances) {
      if (!g.statusHistory || g.statusHistory.length === 0) continue;
      const submitted = g.statusHistory.find((h) => h.status === 'Submitted');
      const resolved  = g.statusHistory.find((h) => h.status === 'Resolved');
      if (submitted && resolved) {
        const diffMs = new Date(resolved.changedAt).getTime() - new Date(submitted.changedAt).getTime();
        if (diffMs > 0) deltas.push(diffMs / (1000 * 60 * 60 * 24));
      }
    }
    if (deltas.length > 0)
      avgResolutionTimeDays = Math.round((deltas.reduce((s, d) => s + d, 0) / deltas.length) * 10) / 10;

    const byCategoryMap = {};
    for (const item of grievancesByCategory) byCategoryMap[item._id || 'Unknown'] = item.count;

    const directionMap = { Improved: 0, Stable: 0, Worsened: 0 };
    for (const item of outcomesByDirection) if (item._id in directionMap) directionMap[item._id] = item.count;

    const resolvedPct = totalGrievances > 0 ? Math.round((resolvedGrievances / totalGrievances) * 1000) / 10 : 0;

    let aiMetrics = null;
    try {
      const aiRes = await axios.get(`${AI_URL()}/api/ai/evaluate`, { timeout: 5000 });
      aiMetrics = aiRes.data?.metrics || null;
    } catch { /* AI service unavailable */ }

    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          grievances: { total: totalGrievances, resolved: resolvedGrievances, resolvedPct, avgResolutionTimeDays, byCategory: byCategoryMap },
          patterns:   { total: totalPatterns, active: activePatterns },
          actions:    { total: totalActions, approved: approvedActions, resolved: resolvedActions },
          outcomes:   { total: totalOutcomes, improved: directionMap.Improved, stable: directionMap.Stable, worsened: directionMap.Worsened, recurrenceDetected: recurrenceDetectedCount },
          ai: aiMetrics,
        },
      },
    });
  } catch (err) { return next(err); }
});

// ---------------------------------------------------------------------------
// GET /api/evaluation/weekly-trend
// Returns complaint counts grouped by ISO week for the last 12 weeks
// ---------------------------------------------------------------------------
router.get('/weekly-trend', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const twelveWeeksAgo = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000);
    const weeklyData = await Grievance.aggregate([
      { $match: { createdAt: { $gte: twelveWeeksAgo } } },
      {
        $group: {
          _id: { week: { $isoWeek: '$createdAt' }, year: { $isoWeekYear: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
      { $project: { _id: 0, week: { $concat: ['W', { $toString: '$_id.week' }] }, count: 1, year: '$_id.year' } },
    ]);

    return res.status(200).json({ success: true, data: { weeklyData } });
  } catch (err) { return next(err); }
});

// ---------------------------------------------------------------------------
// GET /api/evaluation/processing-status
// Returns aiProcessingStatus counts across the grievances collection
// ---------------------------------------------------------------------------
router.get('/processing-status', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [total, completed, failed, pending] = await Promise.all([
      Grievance.countDocuments({}),
      Grievance.countDocuments({ aiProcessingStatus: 'completed' }),
      Grievance.countDocuments({ aiProcessingStatus: 'failed' }),
      Grievance.countDocuments({ aiProcessingStatus: 'pending' }),
    ]);

    return res.status(200).json({ success: true, data: { total, completed, failed, pending } });
  } catch (err) { return next(err); }
});

// ---------------------------------------------------------------------------
// POST /api/evaluation/process-pending
// Processes up to `batchSize` pending grievances through the AI service
// ---------------------------------------------------------------------------
router.post('/process-pending', authenticate, authorize('admin'), async (req, res, next) => {
  const batchSize = Math.min(parseInt(req.body.batchSize || 50, 10), 200);
  const aiUrl = AI_URL();

  try {
    const pending = await Grievance.find({ aiProcessingStatus: 'pending' })
      .select('_id description category rawSeverity')
      .limit(batchSize)
      .lean();

    if (pending.length === 0) {
      return res.status(200).json({ success: true, data: { processed: 0, succeeded: 0, failed: 0, remaining: 0, message: 'No pending grievances.' } });
    }

    let succeeded = 0;
    let failed = 0;

    // Process in parallel batches of 10
    const CHUNK = 10;
    for (let i = 0; i < pending.length; i += CHUNK) {
      const chunk = pending.slice(i, i + CHUNK);
      await Promise.all(chunk.map(async (g) => {
        try {
          const response = await axios.post(`${aiUrl}/api/ai/analyze-one`, {
            grievanceId: g._id.toString(),
            text: g.description,
            category: g.category,
            severity: g.rawSeverity,
          }, { timeout: 30000 });

          const agent = response.data;
          if (agent?.status === 'success' && agent?.data?.metadata) {
            const meta = agent.data.metadata;
            await Grievance.findByIdAndUpdate(g._id, {
              aiMetadata: {
                topic: meta.topic, subTopic: meta.subTopic, issueType: meta.issueType,
                keywords: meta.keywords, sentiment: meta.sentiment, sentimentScore: meta.sentimentScore,
                urgency: meta.urgency, duplicateProbability: meta.duplicateProbability,
                similarityGroup: meta.similarityGroup || null, clusterId: meta.clusterId || null,
                recurrenceIndicator: meta.recurrenceIndicator, priorityRecommendation: meta.priorityRecommendation,
                confidence: meta.confidence, sensitiveFlag: meta.sensitiveFlag, processedAt: new Date(),
                embedding: meta.embedding || [],
              },
              aiProcessingStatus: 'completed',
            });
            succeeded++;
          } else {
            await Grievance.findByIdAndUpdate(g._id, { aiProcessingStatus: 'failed' });
            failed++;
          }
        } catch {
          await Grievance.findByIdAndUpdate(g._id, { aiProcessingStatus: 'failed' });
          failed++;
        }
      }));
    }

    const remaining = await Grievance.countDocuments({ aiProcessingStatus: 'pending' });

    return res.status(200).json({
      success: true,
      data: { processed: pending.length, succeeded, failed, remaining },
    });
  } catch (err) { return next(err); }
});

module.exports = router;

