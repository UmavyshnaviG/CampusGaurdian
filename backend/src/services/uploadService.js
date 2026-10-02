'use strict';

const path = require('path');
const axios = require('axios');
const { Grievance, generateTrackingCode } = require('../models/Grievance');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// inspectDataset
// ---------------------------------------------------------------------------
/**
 * Send the absolute path of an uploaded dataset file to the AI service
 * for schema inspection (Agent 1 — Data Understanding).
 *
 * @param {string} filepath  Absolute path to the uploaded CSV/XLSX file
 * @returns {Promise<object>} AgentResponse.data from the AI service
 */
async function inspectDataset(filepath) {
  const absPath = path.isAbsolute(filepath) ? filepath : path.resolve(filepath);

  const response = await axios.post(
    `${AI_SERVICE_URL}/api/ai/inspect-schema`,
    { filepath: absPath },
    { timeout: 60000 },
  );

  const agentResponse = response.data;

  if (!agentResponse || agentResponse.status === 'failed') {
    const warnings = (agentResponse?.warnings || []).join('; ');
    throw new Error(`AI schema inspection failed: ${warnings}`);
  }

  return agentResponse.data; // { totalRows, totalColumns, columns, qualityIssues, dataQualityScore, ... }
}

// ---------------------------------------------------------------------------
// confirmAndProcess
// ---------------------------------------------------------------------------
/**
 * Apply confirmed column mappings, run AI analysis on each row, and persist
 * results as historical grievances (isHistorical=true).
 *
 * Progress is emitted via Socket.IO: 'upload:progress' events with
 * { processed, total, percentage }.
 *
 * @param {string}   filepath        Absolute path to the uploaded file
 * @param {object}   columnMappings  { detectedCol: targetField, ... }
 * @param {object}   io              Socket.IO server instance (may be null)
 * @returns {Promise<{ imported: number, failed: number }>}
 */
async function confirmAndProcess(filepath, columnMappings, io) {
  const absPath = path.isAbsolute(filepath) ? filepath : path.resolve(filepath);

  // Step 1 — get rows from Agent 1 (deterministic CSV/XLSX parsing)
  const processResponse = await axios.post(
    `${AI_SERVICE_URL}/api/ai/process-batch`,
    { filepath: absPath, columnMappings },
    { timeout: 120000 },
  );

  const processAgent = processResponse.data;
  if (!processAgent || processAgent.status === 'failed') {
    const warnings = (processAgent?.warnings || []).join('; ');
    throw new Error(`AI process-batch failed: ${warnings}`);
  }

  const rows = processAgent.data?.rows || [];
  const total = rows.length;

  if (total === 0) {
    return { imported: 0, failed: 0 };
  }

  // Step 2 — run Feedback Intelligence Agent in chunks of 50
  const CHUNK_SIZE = 50;
  let imported = 0;
  let failed = 0;

  function emitProgress(processed) {
    if (io) {
      io.emit('upload:progress', {
        processed,
        total,
        percentage: Math.round((processed / total) * 100),
      });
    }
  }

  for (let start = 0; start < total; start += CHUNK_SIZE) {
    const chunk = rows.slice(start, start + CHUNK_SIZE);

    // Call batch-analyze for AI metadata
    let aiResults = [];
    try {
      const aiResponse = await axios.post(
        `${AI_SERVICE_URL}/api/ai/batch-analyze`,
        chunk,
        { timeout: 120000 },
      );
      aiResults = Array.isArray(aiResponse.data) ? aiResponse.data : [];
    } catch (aiErr) {
      // Non-fatal: proceed without AI metadata for this chunk
      console.warn('[UploadService] batch-analyze failed for chunk:', aiErr.message);
      aiResults = [];
    }

    // Persist each row as a historical grievance
    for (let i = 0; i < chunk.length; i++) {
      const row = chunk[i];
      const aiResult = aiResults[i] || null;

      try {
        const trackingCode = generateTrackingCode();

        const aiMeta =
          aiResult && aiResult.status === 'success' && aiResult.data?.metadata
            ? aiResult.data.metadata
            : {};

        await Grievance.create({
          trackingCode,
          category: _sanitiseCategory(row.category),
          description: row.text || row.description || 'No description',
          rawSeverity: _sanitiseSeverity(row.severity),
          anonymous: Boolean(row.anonymous),
          isHistorical: true,
          submitterType: row.userType || 'student',
          submitterDept: row.department || '',
          submitterYear: row.year ? Number(row.year) : undefined,
          location: { type: row.location || 'Not Applicable' },
          status: _sanitiseStatus(row.status) || 'Submitted',
          aiProcessingStatus: aiMeta.topic ? 'completed' : 'pending',
          aiMetadata: aiMeta.topic
            ? {
                topic: aiMeta.topic || '',
                subTopic: aiMeta.subTopic || '',
                issueType: aiMeta.issueType || '',
                keywords: aiMeta.keywords || [],
                sentiment: aiMeta.sentiment || '',
                urgency: aiMeta.urgency || 0,
                duplicateProbability: aiMeta.duplicateProbability || 0,
                similarityGroup: aiMeta.similarityGroup || '',
                clusterId: aiMeta.clusterId || '',
                recurrenceIndicator: Boolean(aiMeta.recurrenceIndicator),
                priorityRecommendation: aiMeta.priorityRecommendation || '',
                confidence: aiMeta.confidence || 0,
                sensitiveFlag: Boolean(aiMeta.sensitiveFlag),
                processedAt: new Date(),
              }
            : undefined,
          createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
          statusHistory: [
            {
              status: _sanitiseStatus(row.status) || 'Submitted',
              changedAt: row.createdAt ? new Date(row.createdAt) : new Date(),
              note: 'Imported from historical dataset',
            },
          ],
        });

        imported++;
      } catch (saveErr) {
        console.warn('[UploadService] Failed to save row:', saveErr.message);
        failed++;
      }
    }

    emitProgress(Math.min(start + CHUNK_SIZE, total));
  }

  // Final 100% event
  emitProgress(total);

  return { imported, failed };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = [
  'Academic', 'Infrastructure', 'Network/IT', 'Hostel', 'Transport',
  'Electricity', 'Water/Sanitation', 'Library', 'Canteen',
  'Maintenance', 'Harassment', 'Bullying', 'Ragging',
  'Discrimination', 'Safety', 'Other',
];

const VALID_STATUSES = ['Submitted', 'Under Review', 'In Progress', 'Resolved', 'Closed', 'Rejected'];
const VALID_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

function _sanitiseCategory(cat) {
  if (!cat) return 'Other';
  const found = VALID_CATEGORIES.find((c) => c.toLowerCase() === String(cat).toLowerCase());
  return found || 'Other';
}

function _sanitiseStatus(status) {
  if (!status) return 'Submitted';
  const found = VALID_STATUSES.find((s) => s.toLowerCase() === String(status).toLowerCase());
  return found || 'Submitted';
}

function _sanitiseSeverity(sev) {
  if (!sev) return 'Low';
  const found = VALID_SEVERITIES.find((s) => s.toLowerCase() === String(sev).toLowerCase());
  return found || 'Low';
}

module.exports = { inspectDataset, confirmAndProcess };
