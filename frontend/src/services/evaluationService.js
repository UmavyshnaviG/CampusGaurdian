import api from './api';

export async function getMetrics() {
  const res = await api.get('/evaluation/metrics');
  return res.data;
}

export async function getWeeklyTrend() {
  const res = await api.get('/evaluation/weekly-trend');
  return res.data;
}

export async function getProcessingStatus() {
  const res = await api.get('/evaluation/processing-status');
  return res.data;
}

export async function processPending(batchSize = 50) {
  const res = await api.post('/evaluation/process-pending', { batchSize });
  return res.data;
}
