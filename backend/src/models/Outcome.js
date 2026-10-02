'use strict';

const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Outcome schema
// ---------------------------------------------------------------------------
const outcomeSchema = new mongoose.Schema({
  // References
  patternId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pattern',
    required: true,
    index: true,
  },
  actionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Action',
    required: true,
    index: true,
  },

  // Observation window configuration
  observationPeriodDays: { type: Number, default: 30 },

  // Before period
  beforePeriodStart: { type: Date },
  beforePeriodEnd:   { type: Date },

  // After period
  afterPeriodStart:  { type: Date },
  afterPeriodEnd:    { type: Date },

  // Deterministic AI metrics
  beforeMetrics: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({
      complaintCount: 0,
      avgSeverity: 0,
      avgSentiment: 0,
      weeklyFrequency: 0,
    }),
  },
  afterMetrics: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({
      complaintCount: 0,
      avgSeverity: 0,
      avgSentiment: 0,
      weeklyFrequency: 0,
    }),
  },
  changeMetrics: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({
      countChange: 0,
      countChangePct: 0,
      severityChange: 0,
      frequencyChange: 0,
      frequencyChangePct: 0,
    }),
  },

  // Cautious observation text from AI agent
  observationText: { type: String, default: '' },

  // Outcome direction: Improved | Stable | Worsened
  outcomeDirection: {
    type: String,
    enum: ['Improved', 'Stable', 'Worsened'],
    default: 'Stable',
  },

  // Recurrence monitoring
  recurrenceStatus: {
    type: String,
    enum: ['Not Detected', 'Detected', 'Monitoring'],
    default: 'Not Detected',
  },
  recurrenceDetails: { type: mongoose.Schema.Types.Mixed, default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------
outcomeSchema.index({ createdAt: -1 });
outcomeSchema.index({ outcomeDirection: 1 });
outcomeSchema.index({ recurrenceStatus: 1 });

// ---------------------------------------------------------------------------
// Pre-save hook
// ---------------------------------------------------------------------------
outcomeSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Outcome = mongoose.model('Outcome', outcomeSchema);

module.exports = Outcome;
