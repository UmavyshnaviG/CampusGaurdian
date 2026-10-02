'use strict';

const axios = require('axios');
const { Grievance, generateTrackingCode, SENSITIVE_CATEGORIES } = require('../models/Grievance');

// ---------------------------------------------------------------------------
// Internal helper — call the AI micro-service for single-grievance analysis
// ---------------------------------------------------------------------------
async function callAIService(grievanceId, text, category, severity) {
  const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  try {
    const response = await axios.post(
      `${aiUrl}/api/ai/analyze-one`,
      { grievanceId, text, category, severity },
      { timeout: 30000 },
    );

    if (response.data && response.data.metadata) {
      await Grievance.findByIdAndUpdate(grievanceId, {
        aiMetadata: {
          ...response.data.metadata,
          processedAt: new Date(),
        },
        aiProcessingStatus: 'completed',
      });
    }
  } catch (err) {
    // Non-fatal: mark as failed but do NOT propagate
    console.error(`[GrievanceService] AI service call failed for ${grievanceId}:`, err.message);
    try {
      await Grievance.findByIdAndUpdate(grievanceId, { aiProcessingStatus: 'failed' });
    } catch (updateErr) {
      console.error('[GrievanceService] Failed to update aiProcessingStatus:', updateErr.message);
    }
  }
}

// ---------------------------------------------------------------------------
// createGrievance
// ---------------------------------------------------------------------------
async function createGrievance(data, userId, userRecord) {
  const {
    category,
    location,
    description,
    rawSeverity,
    anonymous = false,
    attachmentUrl = '',
    attachmentOriginalName = '',
  } = data;

  const isSensitiveCategory = SENSITIVE_CATEGORIES.includes(category);
  const isAnon = anonymous === true && isSensitiveCategory;

  const trackingCode = generateTrackingCode();

  const grievanceDoc = {
    trackingCode,
    category,
    location: location || {},
    description,
    rawSeverity,
    anonymous: isAnon,
    attachmentUrl,
    attachmentOriginalName,
    statusHistory: [
      {
        status: 'Submitted',
        changedBy: userId,
        changedAt: new Date(),
        note: 'Grievance submitted',
      },
    ],
  };

  if (userRecord) {
    grievanceDoc.submitterName = userRecord.name || '';
    grievanceDoc.submitterDept = userRecord.department || '';
    grievanceDoc.submitterYear = userRecord.year;
    grievanceDoc.submitterType = userRecord.role || '';
  }

  if (isAnon) {
    // Privacy-preserving: real identity stored in sensitiveIdentity, NOT in submittedBy
    grievanceDoc.sensitiveIdentity = userId;
    // submittedBy intentionally omitted so default queries never expose the user
  } else {
    grievanceDoc.submittedBy = userId;
  }

  const grievance = new Grievance(grievanceDoc);
  await grievance.save();

  // Fire-and-forget AI analysis — errors are caught inside callAIService
  callAIService(grievance._id.toString(), description, category, rawSeverity);

  return grievance;
}

// ---------------------------------------------------------------------------
// getGrievances
// ---------------------------------------------------------------------------
async function getGrievances(filters, userRole, userId) {
  const {
    page = 1,
    limit = 20,
    category,
    status,
    dateFrom,
    dateTo,
  } = filters;

  const query = {};

  // ----- Role-based access control -----
  const isAdmin = userRole === 'admin';
  const isSensitiveOfficer = userRole === 'sensitive_officer';
  const isRegularUser = ['student', 'faculty', 'staff'].includes(userRole);

  if (isRegularUser) {
    // Regular users see only their own non-anonymous grievances
    query.submittedBy = userId;
  } else if (isAdmin) {
    // Admins see all non-anonymous-sensitive grievances
    query.isAnonymousSensitive = { $ne: true };
    // Additionally, admins do not see submittedBy for sensitive cases — handled in projection
  }
  // sensitive_officer: no restriction, sees all

  // ----- Optional filters -----
  if (category) query.category = category;
  if (status) query.status = status;
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [grievances, total] = await Promise.all([
    Grievance.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('submittedBy', 'name email role department')
      .lean(),
    Grievance.countDocuments(query),
  ]);

  // Mask submitter info for admins viewing sensitive (non-anonymous) records
  const sanitised = grievances.map((g) => sanitiseForRole(g, userRole));

  return {
    grievances: sanitised,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  };
}

// ---------------------------------------------------------------------------
// getGrievanceById
// ---------------------------------------------------------------------------
async function getGrievanceById(id, userRole, userId) {
  const isAdmin = userRole === 'admin';
  const isSensitiveOfficer = userRole === 'sensitive_officer';
  const isRegularUser = ['student', 'faculty', 'staff'].includes(userRole);

  const grievance = await Grievance.findById(id)
    .populate('submittedBy', 'name email role department')
    .lean();

  if (!grievance) return null;

  // RBAC check
  if (isRegularUser) {
    // Regular users may only see their own grievances
    const ownerId = grievance.submittedBy
      ? (grievance.submittedBy._id || grievance.submittedBy).toString()
      : null;
    if (ownerId !== userId.toString()) {
      return null; // 404-equivalent — do not reveal existence
    }
  }

  if (isAdmin && grievance.isAnonymousSensitive) {
    // Admins cannot see anonymous sensitive grievances at all
    return null;
  }

  return sanitiseForRole(grievance, userRole);
}

// ---------------------------------------------------------------------------
// updateGrievanceStatus
// ---------------------------------------------------------------------------
async function updateGrievanceStatus(id, status, note, adminId) {
  const grievance = await Grievance.findById(id);
  if (!grievance) return null;

  grievance.status = status;
  grievance.statusHistory.push({
    status,
    changedBy: adminId,
    changedAt: new Date(),
    note: note || '',
  });

  await grievance.save();
  return grievance;
}

// ---------------------------------------------------------------------------
// Internal helper — sanitise a grievance document for a given role
// ---------------------------------------------------------------------------
function sanitiseForRole(grievance, userRole) {
  const isAdmin = userRole === 'admin';

  if (isAdmin && grievance.isSensitive && grievance.anonymous) {
    // Replace submitter identity with placeholder
    const sanitised = { ...grievance };
    sanitised.submittedBy = 'Anonymous';
    sanitised.submitterName = 'Anonymous';
    sanitised.submitterDept = '';
    sanitised.submitterYear = null;
    delete sanitised.sensitiveIdentity;
    return sanitised;
  }

  // Remove sensitiveIdentity from all non-sensitive-officer responses
  if (userRole !== 'sensitive_officer') {
    const sanitised = { ...grievance };
    delete sanitised.sensitiveIdentity;
    return sanitised;
  }

  return grievance;
}

module.exports = {
  createGrievance,
  getGrievances,
  getGrievanceById,
  updateGrievanceStatus,
  callAIService,
};
