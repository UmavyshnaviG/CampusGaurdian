'use strict';

const jwt = require('jsonwebtoken');
const AuditLog = require('../models/AuditLog');

/**
 * authenticate
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches { id, role, email } to req.user on success.
 * Returns 401 if the token is missing or invalid.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please provide a valid token.' });
  }

  const token = authHeader.split(' ')[1];

  // -----------------------------------------------------------------------
  // DEMO BYPASS — development only
  // Mock tokens issued by the frontend login page are accepted here so the
  // admin demo works without a real JWT. Remove this block for production.
  // -----------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const DEMO_MAP = {
      'mock-token-admin':             { id: 'demo-admin-001',   role: 'admin',             email: 'admin@campus.edu' },
      'mock-token-student':           { id: 'demo-student-001', role: 'student',           email: 'student@campus.edu' },
      'mock-token-faculty':           { id: 'demo-faculty-001', role: 'faculty',           email: 'faculty@campus.edu' },
      'mock-token-sensitive_officer': { id: 'demo-officer-001', role: 'sensitive_officer', email: 'officer@campus.edu' },
    };
    if (DEMO_MAP[token]) {
      req.user = DEMO_MAP[token];
      return next();
    }
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
  }
}

/**
 * authorize(...roles)
 * Middleware factory. Allows access only if req.user.role is included in the
 * provided roles array. Returns 403 otherwise.
 * Must be used after authenticate.
 */
function authorize(...roles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to access this resource.' });
    }
    return next();
  };
}

/**
 * auditLog(actionType, resourceType)
 * Middleware factory that creates an AuditLog entry after the response is sent.
 * Errors are caught silently — the request is never failed for audit log failure.
 * Intentionally does NOT log JWT tokens or passwords.
 */
function auditLog(actionType, resourceType) {
  return function (req, _res, next) {
    // Hook into the response "finish" event so the request completes first
    _res.on('finish', () => {
      try {
        const entry = {
          actionType,
          resourceType,
          ipAddress: req.ip || (req.connection && req.connection.remoteAddress),
          timestamp: new Date(),
        };

        if (req.user) {
          entry.userId = req.user.id;
          entry.userRole = req.user.role;
        }

        // Attach resource id from params if available
        if (req.params && req.params.id) {
          entry.resourceId = req.params.id;
        }

        // Attach sanitized details — never include passwords or tokens
        const safeDetails = {};
        if (req.body) {
          const { password, passwordHash, token, ...rest } = req.body; // eslint-disable-line no-unused-vars
          if (Object.keys(rest).length > 0) {
            safeDetails.body = rest;
          }
        }
        if (Object.keys(safeDetails).length > 0) {
          entry.details = safeDetails;
        }

        AuditLog.create(entry).catch((err) => {
          console.error('[AuditLog] Failed to create audit log entry:', err.message);
        });
      } catch (err) {
        // Never let audit logging crash the application
        console.error('[AuditLog] Unexpected error in audit middleware:', err.message);
      }
    });

    return next();
  };
}

module.exports = { authenticate, authorize, auditLog };
