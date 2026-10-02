import api from './api';

/**
 * Fetch evaluation metrics.
 * GET /api/evaluation/metrics
 */
export async function getMetrics() {
  const res = await api.get('/evaluation/metrics');
  return res.data;
}
