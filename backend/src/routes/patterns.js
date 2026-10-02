'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { listPatterns, getPattern, runRefreshPatterns } = require('../controllers/patternController');

const router = express.Router();

// GET /api/patterns — list all patterns (admin + sensitive_officer)
router.get(
  '/',
  authenticate,
  authorize('admin', 'sensitive_officer'),
  listPatterns,
);

// GET /api/patterns/:id — get pattern detail (admin + sensitive_officer)
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'sensitive_officer'),
  getPattern,
);

// POST /api/patterns/refresh — trigger pattern discovery (admin only)
router.post(
  '/refresh',
  authenticate,
  authorize('admin'),
  runRefreshPatterns,
);

module.exports = router;
