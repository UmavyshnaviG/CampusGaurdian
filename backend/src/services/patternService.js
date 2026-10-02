'use strict';

const axios = require('axios');
const mongoose = require('mongoose');
const { Grievance } = require('../models/Grievance');
const Pattern = require('../models/Pattern');

const AI_SERVICE_URL = () => process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// refreshPatterns
// ---------------------------------------------------------------------------
/**
 * Fetch all grievances with valid 384-dim embeddings from MongoDB,
 * send to the AI service /api/ai/discover-patterns,
 * upsert the returned patterns by patternKey,
 * update clusterId on each member grievance,
 * and return a summary object.
 *
 * @returns {{ patternsUpserted: number, grievancesUpdated: number, warnings: string[] }}
 */
async function refreshPatterns() {
  // 1. Load grievances that have been AI-processed and have embeddings
  const grievances = await Grievance.find({
    aiProcessingStatus: 'completed',
    'aiMetadata.embedding': { $exists: true, $not: { $size: 0 } },
  })
    .select(
      '_id category location description rawSeverity anonymous ' +
      'aiMetadata submittedBy submitterDept submitterYear submitterType ' +
      'createdAt status isSensitive',
    )
    .lean();

  if (grievances.length === 0) {
    return {
      patternsUpserted: 0,
      grievancesUpdated: 0,
      warnings: ['No AI-processed grievances with embeddings found.'],
    };
  }

  // 2. Serialise for AI service (convert ObjectId → string, Date → ISO string)
  const serialised = grievances.map((g) => ({
    ...g,
    _id: g._id.toString(),
    submittedBy: g.submittedBy ? g.submittedBy.toString() : null,
    createdAt: g.createdAt ? new Date(g.createdAt).toISOString() : null,
    location: g.location || {},
    aiMetadata: g.aiMetadata || {},
  }));

  // 3. Call AI service
  let agentResponse;
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL()}/api/ai/discover-patterns`,
      { grievances: serialised },
      { timeout: 120000 }, // pattern discovery can be slow on large datasets
    );
    agentResponse = response.data;
  } catch (err) {
    throw new Error(`AI service call failed: ${err.message}`);
  }

  if (!agentResponse || agentResponse.status === 'failed') {
    const msgs = (agentResponse && agentResponse.warnings) || ['Unknown AI error'];
    throw new Error(`Pattern discovery failed: ${msgs.join('; ')}`);
  }

  const patterns = (agentResponse.data && agentResponse.data.patterns) || [];
  const clusterLabels = (agentResponse.data && agentResponse.data.clusterLabels) || {};
  const warnings = agentResponse.warnings || [];

  if (patterns.length === 0) {
    return {
      patternsUpserted: 0,
      grievancesUpdated: 0,
      warnings: warnings.length ? warnings : ['No patterns discovered.'],
    };
  }

  // 4. Upsert patterns by patternKey
  let patternsUpserted = 0;
  for (const p of patterns) {
    try {
      // Convert memberGrievanceIds strings → ObjectIds where valid
      const memberIds = (p.memberGrievanceIds || [])
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      // Convert timeWindow date strings → Date objects
      const timeWindow = {};
      if (p.timeWindow) {
        if (p.timeWindow.firstSeen) timeWindow.firstSeen = new Date(p.timeWindow.firstSeen);
        if (p.timeWindow.lastSeen)  timeWindow.lastSeen  = new Date(p.timeWindow.lastSeen);
        if (p.timeWindow.peakWeek)  timeWindow.peakWeek  = p.timeWindow.peakWeek;
      }

      await Pattern.findOneAndUpdate(
        { patternKey: p.patternKey },
        {
          $set: {
            title:                  p.title               || '',
            description:            p.description         || '',
            clusterId:              p.clusterId           || '',
            category:               p.category            || '',
            primaryLocation:        p.primaryLocation     || '',
            locations:              p.locations           || [],
            stakeholderGroups:      p.stakeholderGroups   || {},
            timeWindow,
            timeRange:              p.timeRange           || '',
            reportCount:            p.reportCount         || 0,
            memberGrievanceIds:     memberIds,
            severityDistribution:   p.severityDistribution  || {},
            sentimentDistribution:  p.sentimentDistribution || {},
            categoryDistribution:   p.categoryDistribution  || {},
            weeklyTrend:            p.weeklyTrend         || {},
            topKeywords:            p.topKeywords         || [],
            evidence:               p.evidence            || [],
            possibleFactors:        (p.diagnosis && p.diagnosis.possibleFactors) || [],
            diagnosis:              p.diagnosis           || null,
            responsibleDepartment:  p.responsibleDepartment || '',
            silhouetteScore:        p.silhouetteScore     || 0,
            clusterMethod:          p.clusterMethod       || '',
            avgUrgency:             p.avgUrgency          || 0,
            avgConfidence:          p.avgConfidence       || 0,
            updatedAt:              new Date(),
          },
        },
        { upsert: true, new: true },
      );
      patternsUpserted += 1;
    } catch (upsertErr) {
      warnings.push(`Failed to upsert pattern '${p.patternKey}': ${upsertErr.message}`);
    }
  }

  // 5. Update clusterId on each grievance
  let grievancesUpdated = 0;
  const updateOps = Object.entries(clusterLabels).map(([grievanceId, clusterId]) => ({
    updateOne: {
      filter: { _id: mongoose.Types.ObjectId.isValid(grievanceId) ? new mongoose.Types.ObjectId(grievanceId) : grievanceId },
      update: { $set: { 'aiMetadata.clusterId': String(clusterId) } },
    },
  }));

  if (updateOps.length > 0) {
    try {
      const result = await Grievance.bulkWrite(updateOps, { ordered: false });
      grievancesUpdated = result.modifiedCount || 0;
    } catch (bulkErr) {
      warnings.push(`Bulk clusterId update partially failed: ${bulkErr.message}`);
    }
  }

  return { patternsUpserted, grievancesUpdated, warnings };
}

// ---------------------------------------------------------------------------
// getPatterns
// ---------------------------------------------------------------------------
/**
 * Query patterns with optional filters.
 *
 * @param {{ category?: string, status?: string }} filters
 * @returns {Promise<Pattern[]>}
 */
async function getPatterns(filters = {}) {
  const query = {};
  if (filters.category) query.category = filters.category;
  if (filters.status)   query.status   = filters.status;

  return Pattern.find(query)
    .sort({ reportCount: -1, createdAt: -1 })
    .lean();
}

// ---------------------------------------------------------------------------
// getPatternById
// ---------------------------------------------------------------------------
/**
 * Get a single pattern by MongoDB _id, populating up to 10 member grievances.
 *
 * @param {string} id
 * @returns {Promise<Pattern|null>}
 */
async function getPatternById(id) {
  const pattern = await Pattern.findById(id)
    .populate({
      path: 'memberGrievanceIds',
      select: 'trackingCode category description rawSeverity status createdAt submitterType',
      options: { limit: 10 },
    })
    .lean();

  return pattern || null;
}

module.exports = { refreshPatterns, getPatterns, getPatternById };
