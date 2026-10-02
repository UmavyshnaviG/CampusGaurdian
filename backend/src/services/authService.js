'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = 12;

/**
 * register
 * Hash the password, create a new user document, and return the user
 * object without the passwordHash field.
 *
 * @param {Object} userData - { name, email, password, role, department, year, designation, hostel }
 * @returns {Object} Saved user document (passwordHash excluded via toJSON transform)
 */
async function register(userData) {
  const { name, email, password, role, department, year, designation, hostel } = userData;

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = new User({
    name,
    email,
    passwordHash,
    role: role || 'student',
    department,
    year,
    designation,
    hostel,
  });

  await user.save();

  // toJSON transform removes passwordHash automatically
  return user.toJSON();
}

/**
 * login
 * Find the user by email, verify the password, update lastLogin,
 * and return a signed JWT alongside the user object.
 *
 * @param {string} email
 * @param {string} password
 * @returns {{ token: string, user: Object }}
 */
async function login(email, password) {
  // Include passwordHash for comparison (it's excluded by default in toJSON)
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

  if (!user || !user.isActive) {
    throw new Error('Invalid credentials.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid credentials.');
  }

  // Update lastLogin without triggering full pre-save validation
  user.lastLogin = new Date();
  await user.save();

  const payload = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  return { token, user: user.toJSON() };
}

/**
 * getMe
 * Return the user document by ID, without passwordHash.
 *
 * @param {string} userId
 * @returns {Object} User document
 */
async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found.');
  }
  return user.toJSON();
}

module.exports = { register, login, getMe };
