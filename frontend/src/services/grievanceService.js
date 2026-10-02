import api from './api';

/**
 * submitGrievance
 * @param {FormData} formData — must include category, description, rawSeverity;
 *   optionally location (JSON string), anonymous, and an attachment file.
 */
export async function submitGrievance(formData) {
  const response = await api.post('/grievances', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/**
 * getMyGrievances
 * @param {number} page
 * @param {number} limit
 */
export async function getMyGrievances(page = 1, limit = 10) {
  const response = await api.get('/grievances', { params: { page, limit } });
  return response.data;
}

/**
 * getGrievances — admin/officer view with optional filters and pagination.
 * @param {{ category?: string, status?: string, severity?: string, isSensitive?: boolean,
 *           page?: number, limit?: number }} filters
 */
export async function getGrievances(filters = {}) {
  const params = {};
  if (filters.category)    params.category    = filters.category;
  if (filters.status)      params.status      = filters.status;
  if (filters.severity)    params.severity    = filters.severity;
  if (filters.isSensitive !== undefined) params.isSensitive = filters.isSensitive;
  if (filters.page)        params.page        = filters.page;
  if (filters.limit)       params.limit       = filters.limit;
  const response = await api.get('/grievances', { params });
  return response.data;
}

/**
 * getGrievanceById
 * @param {string} id — MongoDB ObjectId
 */
export async function getGrievanceById(id) {
  const response = await api.get(`/grievances/${id}`);
  return response.data;
}

/**
 * updateStatus  (admin / sensitive_officer only)
 * @param {string} id
 * @param {string} status
 * @param {string} [note]
 */
export async function updateStatus(id, status, note = '') {
  const response = await api.patch(`/grievances/${id}/status`, { status, note });
  return response.data;
}
