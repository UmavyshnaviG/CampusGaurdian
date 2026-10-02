'use strict';

const express = require('express');
const { authenticate, authorize, auditLog } = require('../middleware/auth');
const {
  measureOutcome,
  checkRecurrence,
  listOutcomes,
} = require('../controllers/outcomeController');

const router = express.Router();

// All outcome routes require authentication and admin role.

// GET /api/outcomes
router.get(
  '/',
  authenticate,
  authorize('admin'),
  listOutcomes,
);

// POST /api/outcomes/measure/:patternId
router.post(
  '/measure/:patternId',
  authenticate,
  authorize('admin'),
  auditLog('measure_outcome', 'Outcome'),
  measureOutcome,
);

// POST /api/outcomes/check-recurrence/:patternId
router.post(
  '/check-recurrence/:patternId',
  authenticate,
  authorize('admin'),
  auditLog('check_recurrence', 'Outcome'),
  checkRecurrence,
);

module.exports = router;
