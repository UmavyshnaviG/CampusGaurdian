import api from './api';

/**
 * Fetch all active departments.
 * GET /api/departments
 */
export async function getDepartments() {
  const res = await api.get('/departments');
  return res.data;
}

/**
 * Create a new department.
 * POST /api/departments
 * @param {object} data
 */
export async function createDepartment(data) {
  const res = await api.post('/departments', data);
  return res.data;
}

/**
 * Update an existing department.
 * PATCH /api/departments/:id
 * @param {string} id
 * @param {object} data
 */
export async function updateDepartment(id, data) {
  const res = await api.patch('/departments/' + id, data);
  return res.data;
}
