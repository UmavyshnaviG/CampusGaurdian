import api from './api';

/**
 * Step 1 — Upload a dataset file and request schema inspection.
 *
 * @param {File} file  The .csv or .xlsx file selected by the admin
 * @returns {Promise<{ filename, storedAs, filepath, schema }>}
 */
export async function inspectDataset(file) {
  const formData = new FormData();
  formData.append('dataset', file);

  const response = await api.post('/upload/inspect', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 90000,
  });

  return response.data; // { success, message, data: { filename, storedAs, filepath, schema } }
}

/**
 * Step 2 — Confirm column mappings and start the import pipeline.
 *
 * @param {string} filepath        Absolute server-side path returned by inspectDataset
 * @param {object} columnMappings  { detectedColumn: targetField, ... }
 * @returns {Promise<{ imported, failed }>}
 */
export async function confirmMapping(filepath, columnMappings) {
  const response = await api.post(
    '/upload/confirm',
    { filepath, columnMappings },
    { timeout: 300000 }, // large datasets may take a while
  );

  return response.data; // { success, message, data: { imported, failed } }
}
