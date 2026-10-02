import api from './api';

/**
 * Generate an action draft from a pattern.
 * POST /api/actions/generate-draft/:patternId
 * @param {string} patternId
 */
export async function generateActionDraft(patternId) {
  const res = await api.post(`/actions/generate-draft/${patternId}`);
  return res.data;
}

/**
 * Fetch all actions with optional filters and pagination.
 * GET /api/actions
 * @param {{ approvalStatus?: string, actionStatus?: string, patternId?: string,
 *           page?: number, limit?: number }} filters
 */
export async function getActions(filters = {}) {
  const params = {};
  if (filters.approvalStatus) params.approvalStatus = filters.approvalStatus;
  if (filters.actionStatus)   params.actionStatus   = filters.actionStatus;
  if (filters.patternId)      params.patternId      = filters.patternId;
  if (filters.page)           params.page           = filters.page;
  if (filters.limit)          params.limit          = filters.limit;
  const res = await api.get('/actions', { params });
  return res.data;
}

/**
 * Fetch a single action by ID.
 * GET /api/actions/:id
 * @param {string} id
 */
export async function getActionById(id) {
  const res = await api.get(`/actions/${id}`);
  return res.data;
}

/**
 * Approve an action.
 * POST /api/actions/approve
 * @param {string} actionId
 * @param {string} [comments]
 * @param {object} [modifications]
 */
export async function approveAction(actionId, comments, modifications) {
  const res = await api.post('/actions/approve', { actionId, comments, modifications });
  return res.data;
}

/**
 * Reject an action.
 * POST /api/actions/reject
 * @param {string} actionId
 * @param {string} [reason]
 */
export async function rejectAction(actionId, reason) {
  const res = await api.post('/actions/reject', { actionId, reason });
  return res.data;
}

/**
 * Update action operational status.
 * PATCH /api/actions/:id/status
 * @param {string} id
 * @param {string} status
 * @param {string} [note]
 */
export async function updateActionStatus(id, status, note) {
  const res = await api.patch(`/actions/${id}/status`, { status, note });
  return res.data;
}
