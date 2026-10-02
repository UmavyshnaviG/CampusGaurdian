'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../config/upload');
const { inspectDataset, confirmMapping } = require('../controllers/uploadController');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /inspect
// Receive dataset file → AI schema inspection → return column profile
// ---------------------------------------------------------------------------
router.post(
  '/inspect',
  authenticate,
  authorize('admin'),
  upload.single('dataset'),
  inspectDataset,
);

// ---------------------------------------------------------------------------
// POST /confirm
// Receive filepath + confirmed column mappings → run import pipeline
// ---------------------------------------------------------------------------
router.post(
  '/confirm',
  authenticate,
  authorize('admin'),
  express.json(),
  confirmMapping,
);

module.exports = router;
