'use strict';

const path = require('path');
const uploadService = require('../services/uploadService');

// ---------------------------------------------------------------------------
// inspectDataset  POST /api/upload/inspect
// ---------------------------------------------------------------------------
/**
 * Receive a dataset file upload, forward its absolute path to the AI service
 * for schema inspection, and return the AgentResponse data to the client.
 */
async function inspectDataset(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No dataset file received. Please upload a .csv or .xlsx file.',
      });
    }

    const absPath = path.resolve(req.file.path);
    const schemaResult = await uploadService.inspectDataset(absPath);

    return res.status(200).json({
      success: true,
      message: 'Dataset inspected successfully.',
      data: {
        filename: req.file.originalname,
        storedAs: req.file.filename,
        filepath: absPath,
        schema: schemaResult,
      },
    });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// confirmMapping  POST /api/upload/confirm
// ---------------------------------------------------------------------------
/**
 * Receive confirmed column mappings and the stored filepath, then run the
 * full import pipeline:
 *   1. Agent 1 converts rows to GrievanceInput format
 *   2. Feedback Intelligence Agent runs AI analysis in chunks
 *   3. Results are stored as historical grievances (isHistorical=true)
 *
 * Socket.IO progress events are emitted during processing.
 */
async function confirmMapping(req, res, next) {
  try {
    const { filepath, columnMappings } = req.body;

    if (!filepath) {
      return res.status(400).json({
        success: false,
        message: 'filepath is required.',
      });
    }

    if (!columnMappings || typeof columnMappings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'columnMappings must be a JSON object.',
      });
    }

    // Respond immediately — import runs asynchronously and emits Socket.IO events
    // We await here so the caller gets the final count, which is usually fast enough
    const io = req.app.get('io');

    const result = await uploadService.confirmAndProcess(filepath, columnMappings, io);

    return res.status(200).json({
      success: true,
      message: `Dataset processed. ${result.imported} grievance(s) imported, ${result.failed} failed.`,
      data: {
        imported: result.imported,
        failed: result.failed,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { inspectDataset, confirmMapping };
