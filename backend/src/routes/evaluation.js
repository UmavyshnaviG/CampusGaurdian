'use strict';

const express = require('express');
const axios = require('axios');
const { authenticate, authorize } = require('../middleware/auth');
const { Grievance } = require('../models/Grievance');
const Pattern = require('../models/Pattern');
const Action = require('../models/Action');
const Outcome = require('../models/Outcome');

const router = express.Router();

function AI_SERVICE_URL() {
  return process.env.AI_SERVICE_URL || 'http://localhost:8000';
}

// ---------------------------------------------------------------------------
// GET /api/evaluation/metrics — system-wide metrics (admin only)
// ---------------------------------------------------------------------------
router.get(
  '/metrics',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      // Run aggregations in parallel
      const [
        totalGrievances,
        resolvedGrievances,
        grievancesByCategory,
        totalPatterns,
        activePatterns,
        totalActions,
        approvedActions,
        resolvedActions,
        totalOutcomes,
        outcomesByDirection,
        recurrenceDetectedCount,
        allGrievances,
      ] = await Promise.all([
        Grievance.countDocuments({}),
        Grievance.countDocuments({ status: 'Resolved' }),
        Grievance.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Pattern.countDocuments({}),
        Pattern.countDocuments({ status: 'active' }),
        Action.countDocuments({}),
        Action.countDocuments({ approvalStatus: 'Approved' }),
        Action.countDocuments({ actionStatus: 'Resolved' }),
        Outcome.countDocuments({}),
        Outcome.aggregate([
          { $group: { _id: '$outcomeDirection', count: { $sum: 1 } } },
        ]),
        Outcome.countDocuments({ recurrenceStatus: 'Detected' }),
        // For avgResolutionTime calculation
        Grievance.find({ status: 'Resolved' })
          .select('statusHistory')
          .lean(),
      ]);

      // Compute average resolution time in days
      let avgResolutionTimeDays = null;
      const deltas = [];
      for (const g of allGrievances) {
        if (!g.statusHistory || g.statusHistory.length === 0) continue;
        const submitted = g.statusHistory.find((h) => h.status === 'Submitted');
        const resolved = g.statusHistory.find((h) => h.status === 'Resolved');
        if (submitted && resolved) {
          const diffMs =
            new Date(resolved.changedAt).getTime() -
            new Date(submitted.changedAt).getTime();
          if (diffMs > 0) {
            deltas.push(diffMs / (1000 * 60 * 60 * 24));
          }
        }
      }
      if (deltas.length > 0) {
        avgResolutionTimeDays =
          Math.round(
            (deltas.reduce((sum, d) => sum + d, 0) / deltas.length) * 10,
          ) / 10;
      }

      // Map grievances by category into a plain object
      const byCategoryMap = {};
      for (const item of grievancesByCategory) {
        byCategoryMap[item._id || 'Unknown'] = item.count;
      }

      // Map outcomes by direction
      const directionMap = { Improved: 0, Stable: 0, Worsened: 0 };
      for (const item of outcomesByDirection) {
        if (item._id in directionMap) {
          directionMap[item._id] = item.count;
        }
      }

      const resolvedPct =
        totalGrievances > 0
          ? Math.round((resolvedGrievances / totalGrievances) * 1000) / 10
          : 0;

      // Non-fatal AI metrics call
      let aiMetrics = null;
      try {
        const aiRes = await axios.get(
          `${AI_SERVICE_URL()}/api/ai/evaluate`,
          { timeout: 5000 },
        );
        aiMetrics = aiRes.data?.metrics || null;
      } catch {
        // AI service unavailable — continue without it
      }

      return res.status(200).json({
        success: true,
        data: {
          metrics: {
            grievances: {
              total: totalGrievances,
              resolved: resolvedGrievances,
              resolvedPct,
              avgResolutionTimeDays,
              byCategory: byCategoryMap,
            },
            patterns: {
              total: totalPatterns,
              active: activePatterns,
            },
            actions: {
              total: totalActions,
              approved: approvedActions,
              resolved: resolvedActions,
            },
            outcomes: {
              total: totalOutcomes,
              improved: directionMap.Improved,
              stable: directionMap.Stable,
              worsened: directionMap.Worsened,
              recurrenceDetected: recurrenceDetectedCount,
            },
            ai: aiMetrics,
          },
        },
      });
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
