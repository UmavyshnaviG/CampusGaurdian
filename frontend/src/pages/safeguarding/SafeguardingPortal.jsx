import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Eye,
} from 'lucide-react';
import api from '../../services/api';

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
// SafeguardingPortal
// ---------------------------------------------------------------------------
export default function SafeguardingPortal() {
  const navigate = useNavigate();

  const [grievances, setGrievances] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const LIMIT = 20;

  const load = useCallback(async (pageNum) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/grievances', {
        params: { isSensitive: true, limit: LIMIT, page: pageNum },
      });
      const data = res.data?.data || {};
      setGrievances(data.grievances || []);
      setTotal(data.total || 0);
      setPage(data.page || pageNum);
      setPages(data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load sensitive grievances.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > pages) return;
    load(newPage);
  }

  // Computed stats from loaded data
  const anonymousCount = grievances.filter((g) => g.isAnonymousSensitive).length;
  const unresolvedCount = grievances.filter((g) =>
    !['Resolved', 'Closed'].includes(g.status)
  ).length;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top bar */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-red-400" aria-hidden="true" />
            <div>
              <h1 className="text-lg font-bold text-white">Safeguarding Portal</h1>
              <p className="text-xs text-slate-400">Sensitive & confidential case management</p>
            </div>
          </div>
          <button
            onClick={() => load(page)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Confidentiality notice */}
        <div className="bg-red-900/40 border border-red-700/50 rounded-xl p-4 text-red-300 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          Handle all sensitive cases with appropriate confidentiality. Access and actions are logged.
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Sensitive', value: total },
            { label: 'Anonymous Sensitive', value: anonymousCount },
            { label: 'Unresolved', value: unresolvedCount },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4"
            >
              <div className="flex-1">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-3 bg-red-900/40 border border-red-700/50 rounded-xl p-4 text-red-300 text-sm"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 text-red-400 animate-spin" aria-hidden="true" />
            </div>
          ) : grievances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm">
              <Shield className="w-10 h-10 mb-3 text-slate-600" aria-hidden="true" />
              No sensitive grievances found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700/50 border-b border-slate-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Tracking Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Anonymous</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Submitted</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {grievances.map((g) => (
                    <tr key={g._id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-red-400">
                        {g.trackingCode}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{g.category}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_BADGE[g.rawSeverity] || 'bg-slate-700 text-slate-300'}`}>
                          {g.rawSeverity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[g.status] || 'bg-slate-700 text-slate-300'}`}>
                          {g.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {g.isAnonymousSensitive ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-red-900/60 text-red-300 rounded text-xs font-medium">
                            Anonymous
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {formatDate(g.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/safeguarding/case/${g._id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-300 border border-red-700/50 rounded-lg hover:bg-red-900/30 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          Review Case
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
            aria-label="Safeguarding portal pagination"
            className="flex items-center justify-center gap-2"
          >
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm text-slate-300 border border-slate-600 rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors"
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="text-sm text-slate-400">Page {page} of {pages}</span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pages}
              className="px-3 py-1.5 text-sm text-slate-300 border border-slate-600 rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors"
              aria-label="Next page"
            >
              Next
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}
