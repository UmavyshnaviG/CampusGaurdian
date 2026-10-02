'use strict';

const mongoose = require('mongoose');

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    await mongoose.connect(uri, {
      // Mongoose 7+ handles these defaults internally
    });
    console.log(`[MongoDB] Connected to ${mongoose.connection.host}`);
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err.message);
    throw err;
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected from database');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err.message);
  });
}

module.exports = { connect };
