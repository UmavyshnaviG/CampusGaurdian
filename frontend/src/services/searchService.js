import api from './api';

/**
 * Perform semantic search over grievances.
 * POST /api/search
 * @param {string} query
 * @param {number} [limit=10]
 */
export async function semanticSearch(query, limit = 10) {
  const res = await api.post('/search', { query, limit });
  return res.data;
}
