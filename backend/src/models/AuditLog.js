'use strict';

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  userRole: {
    type: String,
  },
  actionType: {
    type: String,
    required: [true, 'Action type is required'],
    // e.g. 'LOGIN', 'SUBMIT_GRIEVANCE', 'VIEW_SENSITIVE', 'APPROVE_ACTION'
  },
  resourceType: {
    type: String,
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
  ipAddress: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for efficient querying by user, time range, and action type
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ actionType: 1 });
// Compound index for common admin queries
auditLogSchema.index({ userId: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
