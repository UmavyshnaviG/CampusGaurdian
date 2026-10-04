import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  Loader2,
  Download,
  RefreshCw,
} from 'lucide-react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { getGrievances } from '../../services/grievanceService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CATEGORIES = [
  'Academic', 'Infrastructure', 'Network/IT', 'Hostel', 'Transport',
  'Electricity', 'Water/Sanitation', 'Library', 'Canteen', 'Maintenance',
  'Harassment', 'Bullying', 'Ragging', 'Discrimination', 'Safety', 'Other',
];

const STATUSES = ['Submitted', 'Under Review', 'In Progress', 'Resolved', 'Closed', 'Rejected'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

const SEVERITY_BADGE = {
  Low:      'bg-green-100 text-green-700',
  Medium:   'bg-yellow-100 text-yellow-700',
  High:     'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

const STATUS_BADGE = {
  Submitted:      'bg-blue-100 text-blue-700',
  'Under Review': 'bg-purple-100 text-purple-700',
  'In Progress':  'bg-amber-100 text-amber-700',
  Resolved:       'bg-green-100 text-green-700',
  Closed:         'bg-slate-100 text-slate-600',
  Rejected:       'bg-red-100 text-red-700',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function exportCSV(grievances) {
  const headers = [
    'Tracking Code', 'Submitted By', 'Category', 'Severity',
    'Status', 'AI Priority', 'Created',
  ];
  const rows = grievances.map((g) => [
    g.trackingCode || '',
    g.submitterName || (g.anonymous ? 'Anonymous' : ''),
    g.category || '',
    g.rawSeverity || '',
    g.status || '',
    g.aiMetadata?.priorityRecommendation || '',
    formatDate(g.createdAt),
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'grievances.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// AdminGrievances
// ---------------------------------------------------------------------------
export default function AdminGrievances() {
  const navigate = useNavigate();

  const [grievances, setGrievances] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const LIMIT = 20;

  const load = useCallback(async (pageNum) => {
    setLoading(true);
    setError('');
    try {
      const filters = { page: pageNum, limit: LIMIT };
      if (categoryFilter) filters.category = categoryFilter;
      if (statusFilter)   filters.status   = statusFilter;
      if (severityFilter) filters.severity  = severityFilter;
      if (search.trim())  filters.search   = search.trim();
      const res = await getGrievances(filters);
      const data = res.data || {};
      setGrievances(data.grievances || []);
      setTotal(data.total || 0);
      setPage(data.page || pageNum);
      setPages(data.pages || 1);
    } catch (err) {
      setError('Failed to load grievances. Check that the backend is running.');
      setGrievances([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, severityFilter, search]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [load]);

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > pages) return;
    load(newPage);
  }

  // Search is now server-side — use grievances directly
  const filtered = grievances;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Grievances</h1>
            <p className="text-slate-500 text-sm mt-1">
              All grievances submitted to the system.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCSV(filtered)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Export as CSV"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export CSV
            </button>
            <button
              onClick={() => load(page)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              aria-label="Refresh grievances"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search tracking code or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label="Search grievances"
          />
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label="Filter by severity"
          >
            <option value="">All Severities</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="ml-auto text-xs text-slate-400">
            {total} grievance{total !== 1 ? 's' : ''}
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
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm">
              <FileText className="w-10 h-10 mb-3 text-slate-300" aria-hidden="true" />
              No grievances found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tracking Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Submitted By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">AI Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((g) => (
                    <tr key={g._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-indigo-700">
                        {g.trackingCode}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {g.submitterName || (g.anonymous ? 'Anonymous' : '—')}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{g.category}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_BADGE[g.rawSeverity] || 'bg-slate-100 text-slate-600'}`}>
                          {g.rawSeverity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[g.status] || 'bg-slate-100 text-slate-600'}`}>
                          {g.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {g.aiMetadata?.priorityRecommendation || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {formatDate(g.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/user/grievance/${g._id}`)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                        >
                          View
                        </button>
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
            aria-label="Grievances pagination"
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
