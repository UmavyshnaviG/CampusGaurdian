'use strict';

/**
 * seedData.js
 * -----------
 * Reads the synthetic CSV from data/campus_grievances_historical.csv
 * and inserts all records directly into MongoDB as historical grievances.
 *
 * Runs automatically on backend startup if the grievances collection is empty.
 * Can also be run manually:
 *   node backend/src/scripts/seedData.js
 *
 * After seeding, call POST /api/patterns/refresh to run pattern discovery.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { parse } = require('csv-parse/sync');
const { Grievance, generateTrackingCode, SENSITIVE_CATEGORIES } = require('../models/Grievance');
const { connect: connectDB } = require('../config/database');

const CSV_PATH = path.join(__dirname, '../../../data/campus_grievances_historical.csv');

// ---------------------------------------------------------------------------
// Map CSV severity to enum values
// ---------------------------------------------------------------------------
function normaliseSeverity(raw) {
  const map = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
  return map[(raw || '').toLowerCase()] || 'Medium';
}

// ---------------------------------------------------------------------------
// Map CSV status to Grievance enum
// ---------------------------------------------------------------------------
function normaliseStatus(raw) {
  const map = {
    submitted: 'Submitted',
    'under review': 'Under Review',
    'in progress': 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
    rejected: 'Rejected',
  };
  return map[(raw || '').toLowerCase()] || 'Submitted';
}

// ---------------------------------------------------------------------------
// Parse location string → location sub-document
// ---------------------------------------------------------------------------
function parseLocation(raw) {
  if (!raw || raw === 'Not Applicable') {
    return { type: 'Not Applicable', campus: '', building: '', block: '', floor: '', room: '' };
  }
  // Simple heuristic: treat the raw string as building name
  return { type: 'Building', campus: 'Main Campus', building: raw, block: '', floor: '', room: '' };
}

// ---------------------------------------------------------------------------
// normaliseCategory — maps CSV category strings to Grievance enum
// ---------------------------------------------------------------------------
function normaliseCategory(raw) {
  const allowed = [
    'Academic', 'Infrastructure', 'Network/IT', 'Hostel', 'Transport',
    'Electricity', 'Water/Sanitation', 'Library', 'Canteen', 'Maintenance',
    'Harassment', 'Bullying', 'Ragging', 'Discrimination', 'Safety', 'Other',
  ];
  // Try direct match first
  const direct = allowed.find(c => c.toLowerCase() === (raw || '').toLowerCase());
  if (direct) return direct;
  // Partial matches
  const lower = (raw || '').toLowerCase();
  if (lower.includes('network') || lower.includes('it') || lower.includes('wifi')) return 'Network/IT';
  if (lower.includes('water') || lower.includes('sanit')) return 'Water/Sanitation';
  return 'Other';
}

// ---------------------------------------------------------------------------
// Build a Grievance document from a CSV row
// ---------------------------------------------------------------------------
function buildGrievanceDoc(row) {
  const category = normaliseCategory(row.category);
  const anonymous = String(row.anonymous).toLowerCase() === 'true';
  const isSensitive = SENSITIVE_CATEGORIES.includes(category);
  const isAnonymousSensitive = anonymous && isSensitive;

  return {
    trackingCode: generateTrackingCode(),
    // For historical data, submittedBy is omitted (historical user IDs don't map to real users)
    submitterName: row.submittedBy || 'Historical User',
    submitterDept: row.department || '',
    submitterYear: parseInt(row.year, 10) || null,
    submitterType: row.userType || 'student',
    anonymous: isAnonymousSensitive,
    category,
    location: parseLocation(row.location),
    description: row.description || '',
    rawSeverity: normaliseSeverity(row.severity),
    status: normaliseStatus(row.status),
    statusHistory: [
      {
        status: normaliseStatus(row.status),
        changedAt: row.createdAt ? new Date(row.createdAt) : new Date(),
        note: 'Historical record — imported from synthetic dataset',
      },
    ],
    isSensitive,
    isAnonymousSensitive,
    isHistorical: true,
    aiProcessingStatus: 'pending', // AI service will process these
    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
  };
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function seedHistoricalData() {
  // Check if CSV exists
  if (!fs.existsSync(CSV_PATH)) {
    console.log('[Seed] CSV not found at', CSV_PATH);
    console.log('[Seed] Run: python data/generate_synthetic.py  to generate it first.');
    return { seeded: 0, skipped: 0 };
  }

  // Read and parse CSV
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  let rows;
  try {
    rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    console.error('[Seed] Failed to parse CSV:', err.message);
    return { seeded: 0, skipped: 0 };
  }

  console.log(`[Seed] Parsed ${rows.length} rows from CSV`);

  // Build documents
  const docs = rows.map(buildGrievanceDoc);

  // Insert in batches of 100
  let seeded = 0;
  const BATCH = 100;
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    try {
      await Grievance.insertMany(batch, { ordered: false });
      seeded += batch.length;
    } catch (err) {
      // ordered:false means partial inserts succeed even if some fail
      if (err.insertedCount !== undefined) {
        seeded += err.insertedCount;
      }
      console.warn(`[Seed] Batch ${Math.floor(i / BATCH) + 1} partial insert:`, err.message?.slice(0, 120));
    }
  }

  console.log(`[Seed] ✅ Seeded ${seeded} historical grievances into MongoDB`);
  return { seeded, skipped: rows.length - seeded };
}

// ---------------------------------------------------------------------------
// Auto-seed check — called from server.js bootstrap
// ---------------------------------------------------------------------------
async function autoSeedIfEmpty() {
  try {
    const count = await Grievance.countDocuments({ isHistorical: true });
    if (count > 0) {
      console.log(`[Seed] Historical data already present (${count} records). Skipping seed.`);
      return;
    }
    console.log('[Seed] No historical data found. Starting auto-seed...');
    const result = await seedHistoricalData();
    if (result.seeded > 0) {
      console.log(`[Seed] Auto-seed complete. ${result.seeded} records inserted.`);
      console.log('[Seed] Tip: Go to /admin/patterns and click "Refresh Patterns" to run AI analysis.');
    }
  } catch (err) {
    // Never crash the server for seed failure
    console.error('[Seed] Auto-seed failed (non-fatal):', err.message);
  }
}

// ---------------------------------------------------------------------------
// Allow running directly: node backend/src/scripts/seedData.js
// ---------------------------------------------------------------------------
if (require.main === module) {
  (async () => {
    await connectDB();
    const result = await seedHistoricalData();
    console.log('Seed result:', result);
    await mongoose.disconnect();
    process.exit(0);
  })();
}

module.exports = { autoSeedIfEmpty, seedHistoricalData };
