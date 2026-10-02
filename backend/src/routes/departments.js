'use strict';

const express = require('express');
const { authenticate, authorize, auditLog } = require('../middleware/auth');
const Department = require('../models/Department');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/departments — list active departments (admin only)
// ---------------------------------------------------------------------------
router.get(
  '/',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const departments = await Department.find({ isActive: true })
        .sort({ name: 1 })
        .lean();
      return res.status(200).json({ success: true, data: { departments } });
    } catch (err) {
      return next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/departments — create or upsert department (admin only)
// ---------------------------------------------------------------------------
router.post(
  '/',
  authenticate,
  authorize('admin'),
  auditLog('create_department', 'Department'),
  async (req, res, next) => {
    try {
      if (!req.body.name) {
        return res.status(400).json({
          success: false,
          message: 'Department name is required.',
        });
      }
      const department = await Department.findOneAndUpdate(
        { name: req.body.name },
        { $set: { ...req.body } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      return res.status(201).json({ success: true, data: { department } });
    } catch (err) {
      return next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/departments/:id — update department fields (admin only)
// ---------------------------------------------------------------------------
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  auditLog('update_department', 'Department'),
  async (req, res, next) => {
    try {
      const department = await Department.findByIdAndUpdate(
        req.params.id,
        { $set: { ...req.body, updatedAt: new Date() } },
        { new: true },
      );
      if (!department) {
        return res.status(404).json({
          success: false,
          message: 'Department not found.',
        });
      }
      return res.status(200).json({ success: true, data: { department } });
    } catch (err) {
      return next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// seedDepartments — upserts 10 default departments
// ---------------------------------------------------------------------------
const SEED_DEPARTMENTS = [
  {
    name: 'Academic Affairs',
    code: 'ACAD',
    description: 'Handles academic issues and curriculum',
    contactEmail: 'academic@campus.edu',
    head: 'Dean of Academics',
  },
  {
    name: 'Infrastructure & Facilities',
    code: 'INFRA',
    description: 'Manages campus infrastructure and facilities',
    contactEmail: 'infra@campus.edu',
    head: 'Chief Facilities Officer',
  },
  {
    name: 'IT Services',
    code: 'IT',
    description: 'Network, systems, and software support',
    contactEmail: 'it@campus.edu',
    head: 'Head of IT',
  },
  {
    name: 'Hostel Administration',
    code: 'HOSTEL',
    description: 'Student accommodation and hostel services',
    contactEmail: 'hostel@campus.edu',
    head: 'Hostel Warden',
  },
  {
    name: 'Transport Services',
    code: 'TRANS',
    description: 'Campus transport and shuttle services',
    contactEmail: 'transport@campus.edu',
    head: 'Transport Manager',
  },
  {
    name: 'Security & Safety',
    code: 'SECURITY',
    description: 'Campus security and safety management',
    contactEmail: 'security@campus.edu',
    head: 'Chief Security Officer',
  },
  {
    name: 'Student Welfare',
    code: 'WELFARE',
    description: 'Student counselling and welfare programs',
    contactEmail: 'welfare@campus.edu',
    head: 'Student Affairs Director',
  },
  {
    name: 'Library Services',
    code: 'LIBRARY',
    description: 'Library resources and academic materials',
    contactEmail: 'library@campus.edu',
    head: 'Head Librarian',
  },
  {
    name: 'Canteen & Catering',
    code: 'CANTEEN',
    description: 'Food services and catering management',
    contactEmail: 'canteen@campus.edu',
    head: 'Catering Manager',
  },
  {
    name: 'Human Resources',
    code: 'HR',
    description: 'Staff and faculty HR management',
    contactEmail: 'hr@campus.edu',
    head: 'HR Director',
  },
];

async function seedDepartments() {
  try {
    for (const dept of SEED_DEPARTMENTS) {
      await Department.findOneAndUpdate(
        { name: dept.name },
        { $set: dept },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
    console.log('[departments] Seed complete');
  } catch (err) {
    console.error('[departments] Seed error:', err.message);
  }
}

module.exports = router;
module.exports.seedDepartments = seedDepartments;
