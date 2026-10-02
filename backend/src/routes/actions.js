'use strict';

const express = require('express');
const { authenticate, authorize, auditLog } = require('../middleware/auth');
const {
  generateDraft,
  approveAction,
  rejectAction,
  updateStatus,
  listActions,
  getAction,
} = require('../controllers/actionController');

const router = express.Router();

// All action routes require authentication and admin role.

// GET /api/actions
router.get(
  '/',
  authenticate,
  authorize('admin'),
  listActions,
);

// GET /api/actions/:id
router.get(
  '/:id',
  authenticate,
  authorize('admin'),
  getAction,
);

// POST /api/actions/generate-draft/:patternId
router.post(
  '/generate-draft/:patternId',
  authenticate,
  authorize('admin'),
  auditLog('generate_action_draft', 'Action'),
  generateDraft,
);

// POST /api/actions/approve
router.post(
  '/approve',
  authenticate,
  authorize('admin'),
  auditLog('approve_action', 'Action'),
  approveAction,
);

// POST /api/actions/reject
router.post(
  '/reject',
  authenticate,
  authorize('admin'),
  auditLog('reject_action', 'Action'),
  rejectAction,
);

// PATCH /api/actions/:id/status
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin'),
  auditLog('update_action_status', 'Action'),
  updateStatus,
);

module.exports = router;
