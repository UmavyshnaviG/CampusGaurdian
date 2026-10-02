'use strict';

const { validationResult } = require('express-validator');
const grievanceService = require('../services/grievanceService');
const User = require('../models/User');

// ---------------------------------------------------------------------------
// submitGrievance  POST /api/grievances
// ---------------------------------------------------------------------------
async function submitGrievance(req, res, next) {
  try {
    // Validate inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    // Fetch full user record so we can denormalise display fields
    const userRecord = await User.findById(req.user.id).lean();
    if (!userRecord) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    // Build data payload from request body + uploaded file
    let locationData = {};
    if (req.body.location) {
      locationData =
        typeof req.body.location === 'string'
          ? JSON.parse(req.body.location)
          : req.body.location;
    }

    const data = {
      category: req.body.category,
      location: locationData,
      description: req.body.description,
      rawSeverity: req.body.rawSeverity || req.body.severity,
      anonymous: req.body.anonymous === 'true' || req.body.anonymous === true,
    };

    if (req.file) {
      data.attachmentUrl = `/uploads/${req.file.filename}`;
      data.attachmentOriginalName = req.file.originalname;
    }

    const grievance = await grievanceService.createGrievance(data, req.user.id, userRecord);

    return res.status(201).json({
      success: true,
      message: 'Grievance submitted successfully.',
      data: {
        grievance: {
          _id: grievance._id,
          trackingCode: grievance.trackingCode,
          category: grievance.category,
          status: grievance.status,
          rawSeverity: grievance.rawSeverity,
          aiProcessingStatus: grievance.aiProcessingStatus,
          createdAt: grievance.createdAt,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// listGrievances  GET /api/grievances
// ---------------------------------------------------------------------------
async function listGrievances(req, res, next) {
  try {
    const filters = {
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      category: req.query.category,
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    };

    const result = await grievanceService.getGrievances(filters, req.user.role, req.user.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// getGrievanceById  GET /api/grievances/:id
// ---------------------------------------------------------------------------
async function getGrievanceById(req, res, next) {
  try {
    const grievance = await grievanceService.getGrievanceById(
      req.params.id,
      req.user.role,
      req.user.id,
    );

    if (!grievance) {
      return res.status(404).json({ success: false, message: 'Grievance not found.' });
    }

    return res.status(200).json({ success: true, data: { grievance } });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// updateStatus  PATCH /api/grievances/:id/status
// ---------------------------------------------------------------------------
async function updateStatus(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { status, note } = req.body;
    const grievance = await grievanceService.updateGrievanceStatus(
      req.params.id,
      status,
      note,
      req.user.id,
    );

    if (!grievance) {
      return res.status(404).json({ success: false, message: 'Grievance not found.' });
    }

    // Emit Socket.IO event for real-time status update
    const io = req.app.get('io');
    if (io) {
      io.emit('grievance:statusUpdate', {
        grievanceId: grievance._id,
        trackingCode: grievance.trackingCode,
        status: grievance.status,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Status updated successfully.',
      data: { grievance },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { submitGrievance, listGrievances, getGrievanceById, updateStatus };
