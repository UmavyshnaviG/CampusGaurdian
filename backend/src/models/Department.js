'use strict';

const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Department schema
// ---------------------------------------------------------------------------
const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Department name is required'],
    unique: true,
    index: true,
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
  },
  description: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  head: { type: String, default: '' },
  isActive: { type: Boolean, default: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

// ---------------------------------------------------------------------------
// Pre-validate: auto-generate code from name if not provided
// e.g. 'Academic Affairs' -> 'ACAD_AFF'
// ---------------------------------------------------------------------------
departmentSchema.pre('validate', function (next) {
  if (!this.code && this.name) {
    const words = this.name.trim().split(/\s+/);
    this.code = words
      .map((w) => w.substring(0, 4).toUpperCase())
      .join('_');
  }
  next();
});

// ---------------------------------------------------------------------------
// Pre-save: update updatedAt
// ---------------------------------------------------------------------------
departmentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
