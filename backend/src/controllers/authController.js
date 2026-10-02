'use strict';

const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const AuditLog = require('../models/AuditLog');

/**
 * POST /api/auth/register
 */
async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array(),
    });
  }

  try {
    const user = await authService.register(req.body);
    return res.status(201).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    // Mongoose/MongoDB duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in or use a different email.',
      });
    }
    // Mongoose validation errors
    if (err.name === 'ValidationError') {
      return res.status(422).json({
        success: false,
        message: err.message,
      });
    }
    throw err; // Let global error handler deal with unexpected errors
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array(),
    });
  }

  try {
    const { email, password } = req.body;
    const { token, user } = await authService.login(email, password);
    return res.status(200).json({
      success: true,
      data: { token, user },
    });
  } catch (err) {
    if (err.message === 'Invalid credentials.') {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }
    throw err;
  }
}

/**
 * GET /api/auth/me
 * Requires authenticate middleware.
 */
async function getMe(req, res) {
  try {
    const user = await authService.getMe(req.user.id);
    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    if (err.message === 'User not found.') {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }
    throw err;
  }
}

/**
 * GET /api/auth/audit
 * List audit logs with optional filters and pagination (admin only).
 */
async function listAuditLogs(req, res) {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 50);
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.userId)     filter.userId     = req.query.userId;
    if (req.query.actionType) filter.actionType = req.query.actionType;
    if (req.query.startDate || req.query.endDate) {
      filter.timestamp = {};
      if (req.query.startDate) filter.timestamp.$gte = new Date(req.query.startDate);
      if (req.query.endDate)   filter.timestamp.$lte = new Date(req.query.endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fullName email')
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: { logs, total, page, pages },
    });
  } catch (err) {
    throw err;
  }
}

module.exports = { register, login, getMe, listAuditLogs };
