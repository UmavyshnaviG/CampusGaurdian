import api from './api';

/**
 * Fetch all patterns with optional filters.
 * @param {{ category?: string, status?: string }} filters
 */
export async function getPatterns(filters = {}) {
  const params = {};
  if (filters.category) params.category = filters.category;
  if (filters.status)   params.status   = filters.status;
  const res = await api.get('/patterns', { params });
  return res.data;
}

/**
 * Fetch a single pattern by ID (includes populated member grievances).
 * @param {string} id
 */
export async function getPatternById(id) {
  const res = await api.get(`/patterns/${id}`);
  return res.data;
}

/**
 * Trigger pattern discovery refresh (admin only).
 */
export async function refreshPatterns() {
  const res = await api.post('/patterns/refresh');
  return res.data;
}
