'use strict';

const mongoose = require('mongoose');

// Sensitive categories that trigger privacy-preserving handling
const SENSITIVE_CATEGORIES = ['Harassment', 'Bullying', 'Ragging', 'Discrimination', 'Safety'];

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const locationSchema = new mongoose.Schema(
  {
    type: { type: String, default: 'Not Applicable' },
    campus: { type: String, default: '' },
    building: { type: String, default: '' },
    block: { type: String, default: '' },
    floor: { type: String, default: '' },
    room: { type: String, default: '' },
  },
  { _id: false },
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, default: '' },
  },
  { _id: false },
);

const aiMetadataSchema = new mongoose.Schema(
  {
    topic: { type: String, default: '' },
    subTopic: { type: String, default: '' },
    issueType: { type: String, default: '' },
    keywords: [{ type: String }],
    sentiment: { type: String, default: '' },
    urgency: { type: Number, default: 0 },
    embedding: [{ type: Number }],
    clusterId: { type: String, default: '' },
    similarityGroup: { type: String, default: '' },
    duplicateProbability: { type: Number, default: 0 },
    recurrenceIndicator: { type: Boolean, default: false },
    priorityRecommendation: { type: String, default: '' },
    confidence: { type: Number, default: 0 },
    sensitiveFlag: { type: Boolean, default: false },
    processedAt: { type: Date },
  },
  { _id: false },
);

// ---------------------------------------------------------------------------
// Main schema
// ---------------------------------------------------------------------------

const grievanceSchema = new mongoose.Schema({
  trackingCode: {
    type: String,
    unique: true,
    required: true,
  },

  // Identity — may be absent for anonymous sensitive submissions
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Required unless anonymous — enforced in pre-validate hook
  },

  // Denormalised display fields captured at submission time
  submitterName: { type: String, default: '' },
  submitterDept: { type: String, default: '' },
  submitterYear: { type: Number },
  submitterType: { type: String, default: '' },

  anonymous: { type: Boolean, default: false },

  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: [
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
      ],
      message: 'Invalid category',
    },
  },

  location: { type: locationSchema, default: () => ({}) },

  description: {
    type: String,
    required: [true, 'Description is required'],
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [2000, 'Description must be at most 2000 characters'],
  },

  rawSeverity: {
    type: String,
    required: [true, 'Severity is required'],
    enum: {
      values: ['Low', 'Medium', 'High', 'Critical'],
      message: 'Severity must be Low, Medium, High, or Critical',
    },
  },

  attachmentUrl: { type: String, default: '' },
  attachmentOriginalName: { type: String, default: '' },

  aiMetadata: { type: aiMetadataSchema, default: () => ({}) },

  status: {
    type: String,
    enum: {
      values: ['Submitted', 'Under Review', 'In Progress', 'Resolved', 'Closed', 'Rejected'],
      message: 'Invalid status',
    },
    default: 'Submitted',
  },

  statusHistory: [statusHistorySchema],

  isSensitive: { type: Boolean, default: false },
  isHistorical: { type: Boolean, default: false },
  isAnonymousSensitive: { type: Boolean, default: false },

  // Stores the real identity for anonymous sensitive cases — excluded from all
  // default projections; only sensitive_officer queries may access this field.
  sensitiveIdentity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    select: false, // never returned unless explicitly projected
  },

  aiProcessingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------
grievanceSchema.index({ category: 1 });
grievanceSchema.index({ status: 1 });
grievanceSchema.index({ createdAt: -1 });
grievanceSchema.index({ 'aiMetadata.clusterId': 1 });
grievanceSchema.index({ isSensitive: 1 });
grievanceSchema.index({ submittedBy: 1 });
grievanceSchema.index({ trackingCode: 1 });

// ---------------------------------------------------------------------------
// Pre-save hook
// ---------------------------------------------------------------------------
grievanceSchema.pre('save', function (next) {
  this.updatedAt = new Date();

  // Derive isSensitive from category
  this.isSensitive = SENSITIVE_CATEGORIES.includes(this.category);

  // isAnonymousSensitive — true only when both flags are set
  this.isAnonymousSensitive = this.anonymous === true && this.isSensitive === true;

  next();
});

// ---------------------------------------------------------------------------
// Helper: generate a tracking code
// ---------------------------------------------------------------------------
function generateTrackingCode() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GR-${ts}-${rand}`;
}

const Grievance = mongoose.model('Grievance', grievanceSchema);

module.exports = { Grievance, generateTrackingCode, SENSITIVE_CATEGORIES };
