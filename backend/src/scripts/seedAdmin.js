'use strict';

const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * seedAdminUser
 * Creates a default admin account if none exists in MongoDB.
 * Called during backend bootstrap.
 */
async function seedAdminUser() {
  try {
    const existing = await User.findOne({ role: 'admin' });
    if (existing) {
      console.log('[AdminSeed] Admin user already exists. Skipping.');
      return;
    }

    const passwordHash = await bcrypt.hash('Admin@CG360', 12);
    await User.create({
      name: 'Campus Admin',
      email: 'admin@campusguardian.edu',
      passwordHash,
      role: 'admin',
      department: 'Administration',
      designation: 'Campus Administrator',
    });

    console.log('[AdminSeed] Default admin created:');
    console.log('[AdminSeed]   Email:    admin@campusguardian.edu');
    console.log('[AdminSeed]   Password: Admin@CG360');
  } catch (err) {
    console.error('[AdminSeed] Failed to seed admin user:', err.message);
  }
}

module.exports = { seedAdminUser };
