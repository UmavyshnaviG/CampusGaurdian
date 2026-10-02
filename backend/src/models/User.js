'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name must be at most 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
  },
  role: {
    type: String,
    enum: {
      values: ['student', 'faculty', 'staff', 'admin', 'sensitive_officer'],
      message: 'Role must be one of: student, faculty, staff, admin, sensitive_officer',
    },
    default: 'student',
  },
  department: {
    type: String,
    trim: true,
  },
  year: {
    type: Number,
    min: [1, 'Year must be at least 1'],
    max: [6, 'Year must be at most 6'],
  },
  designation: {
    type: String,
    trim: true,
  },
  hostel: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
  },
});

// Pre-save hook: set updatedAt on every save
userSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Instance method: compare a plaintext password against the stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Remove passwordHash from JSON output
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
