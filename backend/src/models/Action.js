'use strict';

const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Action number counter helper
// ---------------------------------------------------------------------------
// Simple in-process sequence: YYYYMMDD + 4-digit sequence.
// For production, use a dedicated counters collection.
let _dailySeq = 0;
let _seqDate = '';

function _generateActionNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  if (dateStr !== _seqDate) {
    _dailySeq = 0;
    _seqDate = dateStr;
  }
  _dailySeq += 1;
  return `ACT-${dateStr}-${String(_dailySeq).padStart(4, '0')}`;
}

// ---------------------------------------------------------------------------
// Note sub-document schema
// ---------------------------------------------------------------------------
const noteSchema = new mongoose.Schema(
  {
    text:    { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// ---------------------------------------------------------------------------
// Email draft sub-document schema
// ---------------------------------------------------------------------------
const emailDraftSchema = new mongoose.Schema(
  {
    subject:        { type: String, default: '' },
    body:           { type: String, default: '' },
    toEmail:        { type: String, default: null },
    deliveryMethod: {
      type: String,
      enum: ['draft_only', 'manual', 'email'],
      default: 'draft_only',
    },
    disclaimer:     { type: String, default: '' },
  },
  { _id: false },
);

// ---------------------------------------------------------------------------
// Action schema
// ---------------------------------------------------------------------------
const actionSchema = new mongoose.Schema({
  // Human-readable action number: ACT-YYYYMMDD-NNNN
  actionNumber: {
    type:     String,
    unique:   true,
    required: true,
    index:    true,
  },

  // Link back to the originating pattern
  patternId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'Pattern',
    required: true,
    index: true,
  },

  // Member grievances affected by this action
  grievanceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Grievance' }],

  // Department information
  recommendedDepartment: { type: String, default: '' },
  approvedDepartment:    { type: String, default: '' },

  // Action content
  actionTitle:              { type: String, default: '' },
  originalRecommendation:   { type: mongoose.Schema.Types.Mixed, default: null },
  modifiedRecommendation:   { type: mongoose.Schema.Types.Mixed, default: null },
  emailDraft:               { type: emailDraftSchema, default: () => ({}) },

  // Approval workflow
  approvalStatus: {
    type: String,
    enum: [
      'Pending Approval',
      'Approved',
      'Rejected',
      'Modified Approved',
      'Saved Draft',
    ],
    default: 'Pending Approval',
  },
  approvedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvalDate:     { type: Date, default: null },
  approvalComments: { type: String, default: '' },

  // Operational lifecycle
  actionStatus: {
    type: String,
    enum: [
      'Recommended',
      'Pending Approval',
      'Approved',
      'Sent',
      'Acknowledged',
      'In Progress',
      'Resolved',
      'Rejected',
    ],
    default: 'Recommended',
  },

  // Assignment and scheduling
  assignedPerson: { type: String, default: '' },
  dueDate:        { type: Date, default: null },
  resolutionDate: { type: Date, default: null },

  // Audit trail notes
  notes: [noteSchema],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------
actionSchema.index({ approvalStatus: 1 });
actionSchema.index({ actionStatus: 1 });
actionSchema.index({ createdAt: -1 });
actionSchema.index({ recommendedDepartment: 1 });

// ---------------------------------------------------------------------------
// Pre-validate: auto-assign action number on new documents
// ---------------------------------------------------------------------------
actionSchema.pre('validate', function (next) {
  if (this.isNew && !this.actionNumber) {
    this.actionNumber = _generateActionNumber();
  }
  next();
});

// ---------------------------------------------------------------------------
// Pre-save: update updatedAt
// ---------------------------------------------------------------------------
actionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Action = mongoose.model('Action', actionSchema);

module.exports = Action;
