'use strict';

const { getPatterns, getPatternById, refreshPatterns } = require('../services/patternService');

// ---------------------------------------------------------------------------
// getPatterns — GET /api/patterns
// ---------------------------------------------------------------------------
async function listPatterns(req, res) {
  try {
    const { category, status } = req.query;
    const patterns = await getPatterns({ category, status });

    return res.status(200).json({
      success: true,
      data: { patterns, total: patterns.length },
    });
  } catch (err) {
    console.error('[patternController] listPatterns error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve patterns.' });
  }
}

// ---------------------------------------------------------------------------
// getPatternById — GET /api/patterns/:id
// ---------------------------------------------------------------------------
async function getPattern(req, res) {
  try {
    const pattern = await getPatternById(req.params.id);
    if (!pattern) {
      return res.status(404).json({ success: false, message: 'Pattern not found.' });
    }
    return res.status(200).json({ success: true, data: { pattern } });
  } catch (err) {
    console.error('[patternController] getPattern error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve pattern.' });
  }
}

// ---------------------------------------------------------------------------
// refreshPatterns — POST /api/patterns/refresh
// ---------------------------------------------------------------------------
async function runRefreshPatterns(req, res) {
  try {
    const summary = await refreshPatterns();
    return res.status(200).json({
      success: true,
      message: `Pattern refresh complete. ${summary.patternsUpserted} pattern(s) upserted, ${summary.grievancesUpdated} grievance(s) updated.`,
      data: summary,
    });
  } catch (err) {
    console.error('[patternController] runRefreshPatterns error:', err.message);
    return res.status(500).json({
      success: false,
      message: `Pattern refresh failed: ${err.message}`,
    });
  }
}

module.exports = { listPatterns, getPattern, runRefreshPatterns };
