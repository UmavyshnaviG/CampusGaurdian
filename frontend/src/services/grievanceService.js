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
