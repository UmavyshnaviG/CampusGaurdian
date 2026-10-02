'use strict';

const {
  measureOutcome: measureOutcomeService,
  checkRecurrence: checkRecurrenceService,
  getOutcomes,
} = require('../services/outcomeService');

// ---------------------------------------------------------------------------
// measureOutcome — POST /api/outcomes/measure/:patternId
// ---------------------------------------------------------------------------
async function measureOutcome(req, res) {
  try {
    const { patternId } = req.params;
    const { actionId } = req.body;

    if (!actionId) {
      return res.status(400).json({ success: false, message: 'actionId is required in request body.' });
    }

    const outcome = await measureOutcomeService(patternId, actionId);

    return res.status(201).json({
      success: true,
      message: 'Outcome measurement computed successfully.',
      data: { outcome },
    });
  } catch (err) {
    console.error('[outcomeController] measureOutcome error:', err.message);
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to measure outcome.',
    });
  }
}

// ---------------------------------------------------------------------------
// checkRecurrence — POST /api/outcomes/check-recurrence/:patternId
// ---------------------------------------------------------------------------
async function checkRecurrence(req, res) {
  try {
    const { patternId } = req.params;

    const outcome = await checkRecurrenceService(patternId);

    return res.status(200).json({
      success: true,
      message: 'Recurrence check completed.',
      data: { outcome },
    });
  } catch (err) {
    console.error('[outcomeController] checkRecurrence error:', err.message);
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to check recurrence.',
    });
  }
}

// ---------------------------------------------------------------------------
// listOutcomes — GET /api/outcomes
// ---------------------------------------------------------------------------
async function listOutcomes(req, res) {
  try {
    const { patternId, recurrenceStatus, outcomeDirection, page, limit } = req.query;

    const result = await getOutcomes({
      patternId,
      recurrenceStatus,
      outcomeDirection,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('[outcomeController] listOutcomes error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve outcomes.' });
  }
}

module.exports = {
  measureOutcome,
  checkRecurrence,
  listOutcomes,
};
