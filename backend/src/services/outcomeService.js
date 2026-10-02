'use strict';

const axios = require('axios');
const mongoose = require('mongoose');
const Outcome = require('../models/Outcome');
const Pattern = require('../models/Pattern');
const Action = require('../models/Action');
const { Grievance } = require('../models/Grievance');

const AI_SERVICE_URL = () => process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// measureOutcome
// ---------------------------------------------------------------------------
/**
 * Compute before/after outcome metrics for a pattern/action pair.
 *
 * 1. Fetch the action and its pattern.
 * 2. Determine the split date: action.resolutionDate or (action.createdAt + 30 days).
 * 3. Split pattern member grievances into before / after sets.
 * 4. Also pull in any grievances with the same category + location submitted
 *    within 30 days after the split (for the after set).
 * 5. Call AI service /measure-outcome.
 * 6. Upsert Outcome document.
 *
 * @param {string} patternId  MongoDB ObjectId string
 * @param {string} actionId   MongoDB ObjectId string
 * @returns {Promise<Outcome>}
 */
async function measureOutcome(patternId, actionId) {
  // ---- 1. Fetch action ----
  const action = await Action.findById(actionId).lean();
  if (!action) {
    const err = new Error('Action not found.');
    err.status = 404;
    throw err;
  }

  // ---- 2. Fetch pattern ----
  const pattern = await Pattern.findById(patternId).lean();
  if (!pattern) {
    const err = new Error('Pattern not found.');
    err.status = 404;
    throw err;
  }

  // ---- 3. Determine split date ----
  const splitDate = action.resolutionDate
    ? new Date(action.resolutionDate)
    : new Date(action.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);

  const OBSERVATION_DAYS = 30;
  const afterWindowEnd = new Date(splitDate.getTime() + OBSERVATION_DAYS * 24 * 60 * 60 * 1000);

  // ---- 4. Fetch before grievances (pattern members created before split) ----
  const memberIds = (pattern.memberGrievanceIds || []).filter(
    (id) => id && mongoose.Types.ObjectId.isValid(id),
  );

  const beforeGrievances = await Grievance.find({
    _id: { $in: memberIds },
    createdAt: { $lt: splitDate },
  }).lean();

  // ---- 5. Fetch after grievances (same category + location, after split, within window) ----
  const locationQuery = pattern.primaryLocation
    ? {
        $or: [
          { 'location.building': { $regex: pattern.primaryLocation, $options: 'i' } },
          { 'location.block': { $regex: pattern.primaryLocation, $options: 'i' } },
          { 'location.campus': { $regex: pattern.primaryLocation, $options: 'i' } },
        ],
      }
    : {};

  const afterGrievances = await Grievance.find({
    category: pattern.category,
    createdAt: { $gte: splitDate, $lte: afterWindowEnd },
    ...locationQuery,
  }).lean();

  // ---- 6. Serialise for AI service ----
  const serialise = (gs) =>
    gs.map((g) => ({
      ...g,
      _id: g._id ? g._id.toString() : undefined,
      createdAt: g.createdAt ? g.createdAt.toISOString() : undefined,
      aiMetadata: g.aiMetadata
        ? {
            ...g.aiMetadata,
            embedding: Array.isArray(g.aiMetadata.embedding)
              ? g.aiMetadata.embedding
              : [],
          }
        : {},
    }));

  const serialisedBefore = serialise(beforeGrievances);
  const serialisedAfter = serialise(afterGrievances);
  const serialisedAction = {
    ...action,
    _id: action._id ? action._id.toString() : undefined,
    patternId: action.patternId ? action.patternId.toString() : undefined,
    resolutionDate: action.resolutionDate
      ? new Date(action.resolutionDate).toISOString()
      : null,
  };

  // ---- 7. Call AI service ----
  let outcomeData = {};
  try {
    const res = await axios.post(
      `${AI_SERVICE_URL()}/api/ai/measure-outcome`,
      {
        beforeGrievances: serialisedBefore,
        afterGrievances: serialisedAfter,
        action: serialisedAction,
      },
      { timeout: 30000 },
    );
    outcomeData = (res.data && res.data.data && res.data.data.outcome) || {};
  } catch (err) {
    // Non-fatal: still save what we can with empty metrics
    console.error('[outcomeService] AI measure-outcome call failed:', err.message);
  }

  // ---- 8. Upsert Outcome document ----
  const existing = await Outcome.findOne({ patternId, actionId });
  const outcomeDoc = existing || new Outcome({ patternId, actionId });

  outcomeDoc.observationPeriodDays = OBSERVATION_DAYS;
  outcomeDoc.beforePeriodStart = beforeGrievances.length
    ? new Date(Math.min(...beforeGrievances.map((g) => new Date(g.createdAt).getTime())))
    : undefined;
  outcomeDoc.beforePeriodEnd = splitDate;
  outcomeDoc.afterPeriodStart = splitDate;
  outcomeDoc.afterPeriodEnd = afterWindowEnd;

  if (outcomeData.beforeMetrics) outcomeDoc.beforeMetrics = outcomeData.beforeMetrics;
  if (outcomeData.afterMetrics)  outcomeDoc.afterMetrics  = outcomeData.afterMetrics;
  if (outcomeData.changeMetrics) outcomeDoc.changeMetrics = outcomeData.changeMetrics;
  if (outcomeData.observationText) outcomeDoc.observationText = outcomeData.observationText;
  if (outcomeData.outcomeDirection) outcomeDoc.outcomeDirection = outcomeData.outcomeDirection;

  await outcomeDoc.save();
  return outcomeDoc;
}

// ---------------------------------------------------------------------------
// checkRecurrence
// ---------------------------------------------------------------------------
/**
 * Check whether a resolved pattern is recurring.
 *
 * 1. Fetch pattern + its Outcome (to find the associated action).
 * 2. Collect new grievances submitted after pattern.timeWindow.lastSeen.
 * 3. Collect historical embeddings from original member grievances.
 * 4. Call AI service /check-recurrence.
 * 5. Update outcome recurrenceStatus and recurrenceDetails.
 *
 * @param {string} patternId
 * @returns {Promise<Outcome>}
 */
async function checkRecurrence(patternId) {
  // ---- 1. Fetch pattern ----
  const pattern = await Pattern.findById(patternId).lean();
  if (!pattern) {
    const err = new Error('Pattern not found.');
    err.status = 404;
    throw err;
  }

  // ---- 2. Find associated outcome ----
  const outcome = await Outcome.findOne({ patternId }).lean();

  // ---- 3. Determine last_seen cutoff ----
  const lastSeenRaw = (pattern.timeWindow || {}).lastSeen;
  const lastSeen = lastSeenRaw ? new Date(lastSeenRaw) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // ---- 4. Fetch new grievances (same category, submitted after lastSeen) ----
  const newGrievances = await Grievance.find({
    category: pattern.category,
    createdAt: { $gt: lastSeen },
    isHistorical: false,
  }).lean();

  // ---- 5. Fetch historical embeddings from original member grievances ----
  const memberIds = (pattern.memberGrievanceIds || []).filter(
    (id) => id && mongoose.Types.ObjectId.isValid(id),
  );

  const historicalGrievances = await Grievance.find(
    { _id: { $in: memberIds } },
    { 'aiMetadata.embedding': 1 },
  ).lean();

  const historicalEmbeddings = historicalGrievances
    .map((g) => g.aiMetadata && g.aiMetadata.embedding)
    .filter((emb) => Array.isArray(emb) && emb.length === 384);

  // ---- 6. Serialise new grievances ----
  const serialisedNew = newGrievances.map((g) => ({
    ...g,
    _id: g._id ? g._id.toString() : undefined,
    createdAt: g.createdAt ? g.createdAt.toISOString() : undefined,
    aiMetadata: g.aiMetadata
      ? {
          ...g.aiMetadata,
          embedding: Array.isArray(g.aiMetadata.embedding) ? g.aiMetadata.embedding : [],
        }
      : {},
  }));

  const serialisedPattern = {
    ...pattern,
    _id: pattern._id ? pattern._id.toString() : undefined,
    timeWindow: pattern.timeWindow
      ? {
          ...pattern.timeWindow,
          firstSeen: pattern.timeWindow.firstSeen
            ? new Date(pattern.timeWindow.firstSeen).toISOString()
            : null,
          lastSeen: pattern.timeWindow.lastSeen
            ? new Date(pattern.timeWindow.lastSeen).toISOString()
            : null,
        }
      : {},
    memberGrievanceIds: (pattern.memberGrievanceIds || []).map((id) =>
      id ? id.toString() : id,
    ),
  };

  // ---- 7. Call AI service ----
  let recurrenceData = {};
  try {
    const res = await axios.post(
      `${AI_SERVICE_URL()}/api/ai/check-recurrence`,
      {
        pattern: serialisedPattern,
        newGrievances: serialisedNew,
        historicalEmbeddings,
        historicalClusterId: pattern.clusterId || '',
      },
      { timeout: 30000 },
    );
    recurrenceData = (res.data && res.data.data && res.data.data.recurrence) || {};
  } catch (err) {
    console.error('[outcomeService] AI check-recurrence call failed:', err.message);
  }

  // ---- 8. Update or create Outcome document ----
  const outcomeToUpdate = await Outcome.findOne({ patternId });
  const updater = outcomeToUpdate || new Outcome({ patternId, actionId: outcome && outcome.actionId });

  const isRecurrence = Boolean(recurrenceData.isRecurrence);
  updater.recurrenceStatus = isRecurrence ? 'Detected' : 'Monitoring';
  updater.recurrenceDetails = recurrenceData;

  await updater.save();
  return updater;
}

// ---------------------------------------------------------------------------
// getOutcomes
// ---------------------------------------------------------------------------
/**
 * Query outcomes with optional filters and pagination.
 *
 * @param {{ patternId?: string, recurrenceStatus?: string, outcomeDirection?: string,
 *           page?: number, limit?: number }} filters
 * @returns {Promise<{ outcomes: Outcome[], total: number, page: number, pages: number }>}
 */
async function getOutcomes(filters = {}) {
  const query = {};

  if (filters.patternId && mongoose.Types.ObjectId.isValid(filters.patternId)) {
    query.patternId = new mongoose.Types.ObjectId(filters.patternId);
  }
  if (filters.recurrenceStatus) {
    query.recurrenceStatus = filters.recurrenceStatus;
  }
  if (filters.outcomeDirection) {
    query.outcomeDirection = filters.outcomeDirection;
  }

  const page  = Math.max(1, parseInt(filters.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
  const skip  = (page - 1) * limit;

  const [outcomes, total] = await Promise.all([
    Outcome.find(query)
      .populate('patternId', 'title category primaryLocation reportCount status')
      .populate('actionId', 'actionNumber actionTitle actionStatus approvalStatus resolutionDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Outcome.countDocuments(query),
  ]);

  return {
    outcomes,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

module.exports = {
  measureOutcome,
  checkRecurrence,
  getOutcomes,
};
