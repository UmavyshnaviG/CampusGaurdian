'use strict';

const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Pattern schema
// ---------------------------------------------------------------------------
const patternSchema = new mongoose.Schema({
  // Unique deterministic key: e.g. "NETWORK_IT-HOSTEL_BLOCK_A-3"
  patternKey: {
    type: String,
    unique: true,
    required: true,
    index: true,
  },

  title: { type: String, default: '' },
  description: { type: String, default: '' },

  // Cluster identifier (string representation of integer cluster ID)
  clusterId: { type: String, default: '' },

  // Primary category for this cluster
  category: { type: String, default: '' },

  // Most frequent location string in the cluster
  primaryLocation: { type: String, default: '' },

  // All distinct location strings in the cluster
  locations: [{ type: String }],

  // { student: 12, faculty: 3 } — Mixed avoids rigid schema
  stakeholderGroups: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Time window for the pattern
  timeWindow: {
    type: new mongoose.Schema(
      {
        firstSeen: { type: Date },
        lastSeen: { type: Date },
        peakWeek: { type: String, default: '' },
      },
      { _id: false },
    ),
    default: () => ({}),
  },

  // Human-readable time range string
  timeRange: { type: String, default: '' },

  // Number of member grievances in this cluster
  reportCount: { type: Number, default: 0 },

  // ObjectId references to member grievances (up to a practical limit)
  memberGrievanceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Grievance' }],

  // Distribution objects: { Low: 5, Medium: 10, High: 3 }
  severityDistribution: { type: mongoose.Schema.Types.Mixed, default: {} },
  sentimentDistribution: { type: mongoose.Schema.Types.Mixed, default: {} },
  categoryDistribution:  { type: mongoose.Schema.Types.Mixed, default: {} },

  // Weekly trend: { "2024-W03": 4, "2024-W04": 7 }
  weeklyTrend: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Top stemmed keywords from member grievances
  topKeywords: [{ type: String }],

  // Representative complaint texts + distribution summaries
  evidence: [{ type: String }],

  // Populated from DiagnosticAgent output
  possibleFactors:   [{ type: String }],
  diagnosis:         { type: mongoose.Schema.Types.Mixed, default: null },

  // Placeholder for Stage 7 Prediction Agent output
  prediction:        { type: mongoose.Schema.Types.Mixed, default: null },

  // Placeholder for Stage 7 Recommendation Agent output
  recommendation:    { type: mongoose.Schema.Types.Mixed, default: null },

  // Department responsible for handling this pattern
  responsibleDepartment: { type: String, default: '' },

  // Pattern lifecycle status
  status: {
    type: String,
    enum: ['active', 'resolved', 'monitoring', 'archived'],
    default: 'active',
  },

  // ML quality metrics
  silhouetteScore: { type: Number, default: 0 },
  clusterMethod:   { type: String, default: '' },

  // Averages from member AI metadata
  avgUrgency:    { type: Number, default: 0 },
  avgConfidence: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------
patternSchema.index({ category: 1 });
patternSchema.index({ status: 1 });
patternSchema.index({ createdAt: -1 });
patternSchema.index({ reportCount: -1 });

// ---------------------------------------------------------------------------
// Pre-save hook
// ---------------------------------------------------------------------------
patternSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Pattern = mongoose.model('Pattern', patternSchema);

module.exports = Pattern;
