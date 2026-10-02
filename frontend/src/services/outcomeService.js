import api from './api';

/**
 * Fetch all outcomes with optional filters and pagination.
 * GET /api/outcomes
 * @param {{ patternId?: string, recurrenceStatus?: string, outcomeDirection?: string,
 *           page?: number, limit?: number }} filters
 */
export async function getOutcomes(filters = {}) {
  const params = {};
  if (filters.patternId)         params.patternId         = filters.patternId;
  if (filters.recurrenceStatus)  params.recurrenceStatus  = filters.recurrenceStatus;
  if (filters.outcomeDirection)  params.outcomeDirection  = filters.outcomeDirection;
  if (filters.page)              params.page              = filters.page;
  if (filters.limit)             params.limit             = filters.limit;
  const res = await api.get('/outcomes', { params });
  return res.data;
}

/**
 * Measure outcome for a pattern/action pair.
 * POST /api/outcomes/measure/:patternId
 * @param {string} patternId
 * @param {string} actionId
 */
export async function measureOutcome(patternId, actionId) {
  const res = await api.post(`/outcomes/measure/${patternId}`, { actionId });
  return res.data;
}

/**
 * Check recurrence for a pattern.
 * POST /api/outcomes/check-recurrence/:patternId
 * @param {string} patternId
 */
export async function checkRecurrence(patternId) {
  const res = await api.post(`/outcomes/check-recurrence/${patternId}`);
  return res.data;
}
