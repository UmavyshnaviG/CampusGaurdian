'use strict';

const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate, authorize, auditLog } = require('../middleware/auth');

const router = express.Router();

const VALID_ROLES = ['student', 'faculty', 'staff'];

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters.'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address.')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required.')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters.'),
    body('role')
      .optional()
      .isIn(VALID_ROLES)
      .withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}.`),
    body('department')
      .optional()
      .trim(),
    body('year')
      .optional()
      .isInt({ min: 1, max: 6 })
      .withMessage('Year must be an integer between 1 and 6.')
      .toInt(),
    body('designation')
      .optional()
      .trim(),
    body('hostel')
      .optional()
      .trim(),
  ],
  auditLog('REGISTER', 'User'),
  authController.register,
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address.')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required.'),
  ],
  auditLog('LOGIN', 'User'),
  authController.login,
);

// GET /api/auth/me
router.get(
  '/me',
  authenticate,
  auditLog('GET_ME', 'User'),
  authController.getMe,
);

// GET /api/auth/audit
router.get(
  '/audit',
  authenticate,
  authorize('admin'),
  authController.listAuditLogs,
);

module.exports = router;
