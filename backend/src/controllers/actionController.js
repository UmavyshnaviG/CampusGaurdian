'use strict';

const {
  generateAction,
  approveAction,
  rejectAction,
  updateActionStatus,
  getActions,
  getActionById,
} = require('../services/actionService');

// ---------------------------------------------------------------------------
// generateDraft — POST /api/actions/generate-draft/:patternId
// ---------------------------------------------------------------------------
async function generateDraft(req, res) {
  try {
    const { patternId } = req.params;
    const adminId = req.user && req.user.id;

    const action = await generateAction(patternId, adminId);

    return res.status(201).json({
      success: true,
      message: `Action ${action.actionNumber} generated successfully.`,
      data: { action },
    });
  } catch (err) {
    console.error('[actionController] generateDraft error:', err.message);
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to generate action draft.',
    });
  }
}

// ---------------------------------------------------------------------------
// approveActionHandler — POST /api/actions/approve
// ---------------------------------------------------------------------------
async function approveActionHandler(req, res) {
  try {
    const { actionId, comments, modifications } = req.body;
    const adminId = req.user && req.user.id;

    if (!actionId) {
      return res.status(400).json({ success: false, message: 'actionId is required.' });
    }

    const action = await approveAction(actionId, adminId, comments, modifications);

    return res.status(200).json({
      success: true,
      message: `Action ${action.actionNumber} has been ${action.approvalStatus.toLowerCase()}.`,
      data: { action },
    });
  } catch (err) {
    console.error('[actionController] approveActionHandler error:', err.message);
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to approve action.',
    });
  }
}

// ---------------------------------------------------------------------------
// rejectActionHandler — POST /api/actions/reject
// ---------------------------------------------------------------------------
async function rejectActionHandler(req, res) {
  try {
    const { actionId, reason } = req.body;
    const adminId = req.user && req.user.id;

    if (!actionId) {
      return res.status(400).json({ success: false, message: 'actionId is required.' });
    }

    const action = await rejectAction(actionId, adminId, reason);

    return res.status(200).json({
      success: true,
      message: `Action ${action.actionNumber} has been rejected.`,
      data: { action },
    });
  } catch (err) {
    console.error('[actionController] rejectActionHandler error:', err.message);
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to reject action.',
    });
  }
}

// ---------------------------------------------------------------------------
// updateStatus — PATCH /api/actions/:id/status
// ---------------------------------------------------------------------------
async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status: newStatus, note } = req.body;
    const userId = req.user && req.user.id;

    if (!newStatus) {
      return res.status(400).json({ success: false, message: 'status is required.' });
    }

    const action = await updateActionStatus(id, newStatus, note, userId);

    return res.status(200).json({
      success: true,
      message: `Action status updated to '${action.actionStatus}'.`,
      data: { action },
    });
  } catch (err) {
    console.error('[actionController] updateStatus error:', err.message);
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to update action status.',
    });
  }
}

// ---------------------------------------------------------------------------
// listActions — GET /api/actions
// ---------------------------------------------------------------------------
async function listActions(req, res) {
  try {
    const { approvalStatus, actionStatus, patternId, page, limit } = req.query;
    const result = await getActions({ approvalStatus, actionStatus, patternId, page, limit });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('[actionController] listActions error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve actions.' });
  }
}

// ---------------------------------------------------------------------------
// getAction — GET /api/actions/:id
// ---------------------------------------------------------------------------
async function getAction(req, res) {
  try {
    const action = await getActionById(req.params.id);
    if (!action) {
      return res.status(404).json({ success: false, message: 'Action not found.' });
    }
    return res.status(200).json({ success: true, data: { action } });
  } catch (err) {
    console.error('[actionController] getAction error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve action.' });
  }
}

module.exports = {
  generateDraft,
  approveAction: approveActionHandler,
  rejectAction:  rejectActionHandler,
  updateStatus,
  listActions,
  getAction,
};
