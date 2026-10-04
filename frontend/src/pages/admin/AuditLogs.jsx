import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  AlertTriangle,
  Loader2,
  Download,
  RefreshCw,
} from 'lucide-react';
import AdminLayout from '../../components/layouts/AdminLayout';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ACTION_TYPES = [
  'generate_action_draft',
  'approve_action',
  'reject_action',
  'update_action_status',
  'measure_outcome',
  'check_recurrence',
  'create_department',
  'update_department',
  'submit_grievance',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function exportCSV(logs) {
  const headers = ['Timestamp', 'User', 'Action Type', 'Resource', 'IP Address'];
  const rows = logs.map((log) => [
    formatDateTime(log.timestamp),
    log.userId?.fullName || String(log.userId || ''),
    log.actionType || '',
    log.resource || '',
    log.ipAddress || '',
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'audit-logs.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// AuditLogs
// ---------------------------------------------------------------------------
export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const LIMIT = 50;

  const load = useCallback(async (pageNum) => {
    setLoading(true);
    setError('');
    try {
      const params = { page: pageNum, limit: LIMIT };
      if (actionTypeFilter) params.actionType = actionTypeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate)   params.endDate   = endDate;
      const res = await api.get('/auth/audit', { params });
      const data = res.data?.data || {};
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPage(data.page || pageNum);
      setPages(data.pages || 1);
    } catch (err) {
      setError('Failed to load audit logs. Check that the backend is running.');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [actionTypeFilter, startDate, endDate]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [load]);

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > pages) return;
    load(newPage);
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
            <p className="text-slate-500 text-sm mt-1">
              System activity and admin action history.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCSV(logs)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Export audit logs as CSV"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export CSV
            </button>
            <button
              onClick={() => load(page)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              aria-label="Refresh audit logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
          <select
            value={actionTypeFilter}
            onChange={(e) => { setActionTypeFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label="Filter by action type"
          >
            <option value="">All Action Types</option>
            {ACTION_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label htmlFor="start-date" className="text-xs text-slate-600">From:</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="end-date" className="text-xs text-slate-600">To:</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <span className="ml-auto text-xs text-slate-400">
            {total} log{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" aria-hidden="true" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm">
              <Shield className="w-10 h-10 mb-3 text-slate-300" aria-hidden="true" />
              No audit logs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Resource</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log, i) => (
                    <tr key={log._id || i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-xs">
                        {log.userId?.fullName || String(log.userId || '—')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-mono">
                          {log.actionType || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {log.resource || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                        {log.ipAddress || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && pages > 1 && (
          <nav
            aria-label="Audit logs pagination"
            className="flex items-center justify-center gap-2"
          >
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">Page {page} of {pages}</span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pages}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
              aria-label="Next page"
            >
              Next
            </button>
          </nav>
        )}
      </div>
    </AdminLayout>
  );
}
