'use strict';

const { validationResult } = require('express-validator');
const authService = require('../services/authService');

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

module.exports = { register, login, getMe };
