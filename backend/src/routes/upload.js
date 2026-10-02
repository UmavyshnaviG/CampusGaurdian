'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../config/upload');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /inspect  — receive a historical dataset file (Stage 5 stub)
// ---------------------------------------------------------------------------
router.post(
  '/inspect',
  authenticate,
  authorize('admin'),
  upload.single('dataset'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No dataset file received.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Dataset received. AI inspection pending.',
      filename: req.file.originalname,
      storedAs: req.file.filename,
    });
  },
);

// ---------------------------------------------------------------------------
// POST /confirm  — confirm column mapping (Stage 5 stub)
// ---------------------------------------------------------------------------
router.post(
  '/confirm',
  authenticate,
  authorize('admin'),
  (_req, res) => {
    return res.status(200).json({
      success: true,
      message: 'Mapping confirmation stub — implement in Stage 5.',
    });
  },
);

module.exports = router;
