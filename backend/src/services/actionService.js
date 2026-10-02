'use strict';

const axios = require('axios');
const mongoose = require('mongoose');
const Action = require('../models/Action');
const Pattern = require('../models/Pattern');

const AI_SERVICE_URL = () => process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Valid action status transitions (state machine)
// ---------------------------------------------------------------------------
const VALID_TRANSITIONS = {
  Recommended:      ['Pending Approval', 'Rejected'],
  'Pending Approval': ['Approved', 'Modified Approved', 'Rejected', 'Saved Draft'],
  'Saved Draft':    ['Pending Approval', 'Rejected'],
  Approved:         ['Sent', 'Rejected'],
  Sent:             ['Acknowledged', 'Rejected'],
  Acknowledged:     ['In Progress'],
  'In Progress':    ['Resolved', 'Rejected'],
  Resolved:         [],
  Rejected:         [],
  'Modified Approved': ['Sent', 'Rejected'],
};

// ---------------------------------------------------------------------------
// generateAction
// ---------------------------------------------------------------------------
/**
 * Build a full action document for a pattern by:
 * 1. Fetching the pattern from DB.
 * 2. Calling the AI service for prediction, recommendation, and draft.
 * 3. Saving the Action document and returning it.
 *
 * @param {string} patternId  MongoDB ObjectId string of the pattern
 * @param {string} adminId    Requesting admin's user ObjectId string
 * @returns {Promise<Action>}
 */
async function generateAction(patternId, adminId) {
  // ---- 1. Fetch pattern ----
  const pattern = await Pattern.findById(patternId).lean();
  if (!pattern) {
    const err = new Error('Pattern not found.');
    err.status = 404;
    throw err;
  }

  // Serialise pattern for AI service (ObjectIds → strings)
  const serialisedPattern = _serialisePattern(pattern);

  const baseUrl = AI_SERVICE_URL();

  // ---- 2. Get or re-use cached prediction ----
  let prediction = pattern.prediction;
  if (!prediction || prediction.trend === 'Insufficient Data' || !prediction.trend) {
    try {
      const predRes = await axios.post(
        `${baseUrl}/api/ai/predict`,
        { grievances: [], pattern: serialisedPattern },
        { timeout: 30000 },
      );
      prediction = (predRes.data && predRes.data.data && predRes.data.data.prediction) || {};
    } catch (err) {
      // Non-fatal — proceed without prediction
      prediction = { trend: 'Unknown', confidence: 0, interpretation: '' };
    }
  }

  // ---- 3. Get or re-use cached diagnosis ----
  let diagnosis = pattern.diagnosis;
  if (!diagnosis) {
    try {
      const diagRes = await axios.post(
        `${baseUrl}/api/ai/diagnose`,
        { pattern: serialisedPattern },
        { timeout: 30000 },
      );
      diagnosis = (diagRes.data && diagRes.data.data && diagRes.data.data.diagnosis) || {};
    } catch (err) {
      diagnosis = { summary: '', possibleFactors: [], recommendedDepartment: pattern.responsibleDepartment || '' };
    }
  }

  // ---- 4. Generate recommendation ----
  let recommendation = pattern.recommendation;
  if (!recommendation) {
    try {
      const recRes = await axios.post(
        `${baseUrl}/api/ai/recommend`,
        { pattern: serialisedPattern, diagnosis, prediction },
        { timeout: 30000 },
      );
      recommendation = (recRes.data && recRes.data.data && recRes.data.data.recommendation) || {};
    } catch (err) {
      const recErr = new Error(`Recommendation generation failed: ${err.message}`);
      recErr.status = 502;
      throw recErr;
    }
  }

  // ---- 5. Generate email draft ----
  let emailDraft = {};
  try {
    const draftRes = await axios.post(
      `${baseUrl}/api/ai/generate-action`,
      { recommendation, pattern: serialisedPattern, department: null },
      { timeout: 30000 },
    );
    emailDraft = (draftRes.data && draftRes.data.data && draftRes.data.data.draft) || {};
  } catch (err) {
    // Non-fatal: proceed with empty draft
    emailDraft = {
      subject: `Action Required: ${pattern.title || 'Pattern'}`,
      body: recommendation.suggestedAction || '',
      toEmail: null,
      deliveryMethod: 'draft_only',
      disclaimer: 'System-generated draft.',
    };
  }

  // ---- 6. Save Action document ----
  const actionTitle = recommendation.problem
    ? recommendation.problem.substring(0, 150)
    : (pattern.title || 'Untitled Action');

  const action = new Action({
    patternId:             pattern._id,
    grievanceIds:          pattern.memberGrievanceIds || [],
    recommendedDepartment: recommendation.responsibleDepartment || pattern.responsibleDepartment || '',
    actionTitle,
    originalRecommendation: recommendation,
    emailDraft: {
      subject:        emailDraft.subject || '',
      body:           emailDraft.body || '',
      toEmail:        emailDraft.toEmail || null,
      deliveryMethod: emailDraft.deliveryMethod || 'draft_only',
      disclaimer:     emailDraft.disclaimer || '',
    },
    approvalStatus: 'Pending Approval',
    actionStatus:   'Pending Approval',
    notes: adminId
      ? [{
          text:    'Action draft generated by AI analysis pipeline.',
          addedBy: new mongoose.Types.ObjectId(adminId),
          addedAt: new Date(),
        }]
      : [],
  });

  await action.save();

  // ---- 7. Cache recommendation and prediction on pattern ----
  await Pattern.findByIdAndUpdate(patternId, {
    $set: { prediction, recommendation },
  });

  return action;
}

// ---------------------------------------------------------------------------
// approveAction
// ---------------------------------------------------------------------------
/**
 * Approve an action, optionally with modifications to the recommendation.
 *
 * @param {string} actionId
 * @param {string} adminId
 * @param {string} comments
 * @param {object|null} modifications  Optional modified recommendation fields
 * @returns {Promise<Action>}
 */
async function approveAction(actionId, adminId, comments, modifications) {
  const action = await Action.findById(actionId);
  if (!action) {
    const err = new Error('Action not found.');
    err.status = 404;
    throw err;
  }

  if (!['Pending Approval', 'Saved Draft'].includes(action.approvalStatus)) {
    const err = new Error(
      `Cannot approve an action with status '${action.approvalStatus}'.`,
    );
    err.status = 400;
    throw err;
  }

  const hasModifications = modifications && Object.keys(modifications).length > 0;
  action.approvalStatus  = hasModifications ? 'Modified Approved' : 'Approved';
  action.actionStatus    = hasModifications ? 'Modified Approved' : 'Approved';
  action.approvedBy      = adminId ? new mongoose.Types.ObjectId(adminId) : null;
  action.approvalDate    = new Date();
  action.approvalComments = comments || '';

  if (hasModifications) {
    action.modifiedRecommendation = modifications;
  }

  action.notes.push({
    text:    `Action ${action.approvalStatus.toLowerCase()} by admin. ${comments || ''}`.trim(),
    addedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
    addedAt: new Date(),
  });

  await action.save();
  return action;
}

// ---------------------------------------------------------------------------
// rejectAction
// ---------------------------------------------------------------------------
/**
 * Reject an action with a reason.
 *
 * @param {string} actionId
 * @param {string} adminId
 * @param {string} reason
 * @returns {Promise<Action>}
 */
async function rejectAction(actionId, adminId, reason) {
  const action = await Action.findById(actionId);
  if (!action) {
    const err = new Error('Action not found.');
    err.status = 404;
    throw err;
  }

  if (['Resolved', 'Rejected'].includes(action.approvalStatus)) {
    const err = new Error(
      `Cannot reject an action with status '${action.approvalStatus}'.`,
    );
    err.status = 400;
    throw err;
  }

  action.approvalStatus  = 'Rejected';
  action.actionStatus    = 'Rejected';
  action.approvalComments = reason || '';
  action.approvedBy      = adminId ? new mongoose.Types.ObjectId(adminId) : null;
  action.approvalDate    = new Date();

  action.notes.push({
    text:    `Action rejected. Reason: ${reason || 'No reason provided.'}`,
    addedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
    addedAt: new Date(),
  });

  await action.save();
  return action;
}

// ---------------------------------------------------------------------------
// updateActionStatus
// ---------------------------------------------------------------------------
/**
 * Move an action through its operational status state machine.
 *
 * @param {string} actionId
 * @param {string} newStatus
 * @param {string} note      Optional note text
 * @param {string} userId    User making the change
 * @returns {Promise<Action>}
 */
async function updateActionStatus(actionId, newStatus, note, userId) {
  const action = await Action.findById(actionId);
  if (!action) {
    const err = new Error('Action not found.');
    err.status = 404;
    throw err;
  }

  const currentStatus = action.actionStatus;
  const allowedNext = VALID_TRANSITIONS[currentStatus] || [];

  if (!allowedNext.includes(newStatus)) {
    const err = new Error(
      `Invalid status transition: '${currentStatus}' → '${newStatus}'. ` +
      `Allowed transitions: ${allowedNext.join(', ') || 'none'}.`,
    );
    err.status = 400;
    throw err;
  }

  action.actionStatus = newStatus;

  // Auto-set resolution date when resolved
  if (newStatus === 'Resolved') {
    action.resolutionDate = new Date();
  }

  if (note) {
    action.notes.push({
      text:    note,
      addedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      addedAt: new Date(),
    });
  }

  await action.save();
  return action;
}

// ---------------------------------------------------------------------------
// getActions
// ---------------------------------------------------------------------------
/**
 * Query actions with optional filters and pagination.
 *
 * @param {{ approvalStatus?: string, actionStatus?: string, patternId?: string,
 *           page?: number, limit?: number }} filters
 * @returns {Promise<{ actions: Action[], total: number, page: number, pages: number }>}
 */
async function getActions(filters = {}) {
  const query = {};
  if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;
  if (filters.actionStatus)   query.actionStatus   = filters.actionStatus;
  if (filters.patternId && mongoose.Types.ObjectId.isValid(filters.patternId)) {
    query.patternId = new mongoose.Types.ObjectId(filters.patternId);
  }

  const page  = Math.max(1, parseInt(filters.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
  const skip  = (page - 1) * limit;

  const [actions, total] = await Promise.all([
    Action.find(query)
      .populate('patternId', 'title category primaryLocation reportCount')
      .populate('approvedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Action.countDocuments(query),
  ]);

  return {
    actions,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

// ---------------------------------------------------------------------------
// getActionById
// ---------------------------------------------------------------------------
/**
 * Get a single action by MongoDB _id with full population.
 *
 * @param {string} id
 * @returns {Promise<Action|null>}
 */
async function getActionById(id) {
  return Action.findById(id)
    .populate('patternId', 'title category primaryLocation reportCount description diagnosis prediction recommendation')
    .populate('approvedBy', 'fullName email')
    .populate('grievanceIds', 'trackingCode category description rawSeverity status createdAt')
    .lean();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _serialisePattern(pattern) {
  return {
    ...pattern,
    _id: pattern._id ? pattern._id.toString() : undefined,
    memberGrievanceIds: (pattern.memberGrievanceIds || []).map((id) =>
      id ? id.toString() : id,
    ),
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
  };
}

module.exports = {
  generateAction,
  approveAction,
  rejectAction,
  updateActionStatus,
  getActions,
  getActionById,
};
