'use strict';

const express = require('express');
const axios = require('axios');
const { authenticate, authorize } = require('../middleware/auth');
const { Grievance } = require('../models/Grievance');

const router = express.Router();

function AI_SERVICE_URL() {
  return process.env.AI_SERVICE_URL || 'http://localhost:8000';
}

// ---------------------------------------------------------------------------
// POST /api/search — semantic search over grievance corpus
// ---------------------------------------------------------------------------
router.post(
  '/',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const query = req.body.query;
      if (!query || typeof query !== 'string' || query.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Query is required and must be a non-empty string.',
        });
      }

      // Fetch up to 500 grievances with completed AI processing and embeddings
      const grievances = await Grievance.find({
        aiProcessingStatus: 'completed',
        'aiMetadata.embedding': { $exists: true, $not: { $size: 0 } },
      })
        .select('_id trackingCode category description rawSeverity status aiMetadata')
        .lean();

      // Build corpus for the AI service
      const corpus = grievances.map((g) => ({
        id: g._id.toString(),
        embedding: g.aiMetadata.embedding || [],
      }));

      let aiResults = [];
      try {
        const aiResponse = await axios.post(
          `${AI_SERVICE_URL()}/api/ai/search`,
          {
            query: query.trim(),
            limit: req.body.limit || 10,
            corpus,
          },
          { timeout: 15000 },
        );
        aiResults = aiResponse.data?.data?.results || [];
      } catch {
        return res.status(502).json({
          success: false,
          message: 'Semantic search service unavailable.',
        });
      }

      // Enrich results with grievance data
      const grievanceMap = new Map(grievances.map((g) => [g._id.toString(), g]));
      const enrichedResults = aiResults.map((result) => {
        const grievance = grievanceMap.get(result.grievanceId);
        if (!grievance) return result;
        return {
          ...result,
          trackingCode: grievance.trackingCode,
          category: grievance.category,
          description: grievance.description
            ? grievance.description.substring(0, 200)
            : '',
          rawSeverity: grievance.rawSeverity,
          status: grievance.status,
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          results: enrichedResults,
          query: query.trim(),
        },
      });
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
