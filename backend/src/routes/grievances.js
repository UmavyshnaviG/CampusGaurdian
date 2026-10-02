'use strict';

const express = require('express');
const { body } = require('express-validator');

const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../config/upload');
const {
  submitGrievance,
  listGrievances,
  getGrievanceById,
  updateStatus,
} = require('../controllers/grievanceController');

const router = express.Router();

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
const VALID_CATEGORIES = [
  'Academic',
  'Infrastructure',
  'Network/IT',
  'Hostel',
  'Transport',
  'Electricity',
  'Water/Sanitation',
  'Library',
  'Canteen',
  'Maintenance',
  'Harassment',
  'Bullying',
  'Ragging',
  'Discrimination',
  'Safety',
  'Other',
];

const VALID_STATUSES = [
  'Submitted',
  'Under Review',
  'In Progress',
  'Resolved',
  'Closed',
  'Rejected',
];

// ---------------------------------------------------------------------------
// POST /  — submit a grievance
// ---------------------------------------------------------------------------
router.post(
  '/',
  authenticate,
  upload.single('attachment'),
  [
    body('description')
      .isString()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Description must be between 10 and 2000 characters.'),
    body('category')
      .isIn(VALID_CATEGORIES)
      .withMessage('Invalid category.'),
    body('rawSeverity')
      .optional()
      .isIn(['Low', 'Medium', 'High', 'Critical'])
      .withMessage('Severity must be Low, Medium, High, or Critical.'),
    // Allow severity as an alias for rawSeverity (form-submitted field name)
    body('severity')
      .optional()
      .isIn(['Low', 'Medium', 'High', 'Critical'])
      .withMessage('Severity must be Low, Medium, High, or Critical.'),
  ],
  submitGrievance,
);

// ---------------------------------------------------------------------------
// GET /  — list grievances (RBAC applied in service)
// ---------------------------------------------------------------------------
router.get('/', authenticate, listGrievances);

// ---------------------------------------------------------------------------
// GET /:id  — single grievance
// ---------------------------------------------------------------------------
router.get('/:id', authenticate, getGrievanceById);

// ---------------------------------------------------------------------------
// PATCH /:id/status  — update status (admin / sensitive_officer only)
// ---------------------------------------------------------------------------
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin', 'sensitive_officer'),
  [
    body('status')
      .isIn(VALID_STATUSES)
      .withMessage('Invalid status value.'),
    body('note')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Note must be at most 500 characters.'),
  ],
  updateStatus,
);

module.exports = router;
