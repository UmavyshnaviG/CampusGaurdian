import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  FileText,
  Zap,
} from 'lucide-react';
import { getActions } from '../../services/actionService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE_STYLES = {
  'Recommended':        'bg-blue-100 text-blue-700',
  'Pending Approval':   'bg-amber-100 text-amber-700',
  'Saved Draft':        'bg-slate-100 text-slate-600',
  'Approved':           'bg-emerald-100 text-emerald-700',
  'Modified Approved':  'bg-teal-100 text-teal-700',
  'Sent':               'bg-cyan-100 text-cyan-700',
  'Acknowledged':       'bg-purple-100 text-purple-700',
  'In Progress':        'bg-indigo-100 text-indigo-700',
  'Resolved':           'bg-green-100 text-green-700',
  'Rejected':           'bg-red-100 text-red-700',
};

const URGENCY_BADGE_STYLES = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-orange-100 text-orange-700',
  Medium:   'bg-amber-100 text-amber-700',
  Low:      'bg-slate-100 text-slate-600',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status) {
  const cls = STATUS_BADGE_STYLES[status] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function urgencyBadge(urgency) {
  const cls = URGENCY_BADGE_STYLES[urgency] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {urgency || '—'}
    </span>
  );
}

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

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({ label, value, icon, colour }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colour}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionCenter
// ---------------------------------------------------------------------------
export default function ActionCenter() {
  const navigate = useNavigate();

  const [actions, setActions]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Derived stats from current page — for top-level summary we fetch all
  const [stats, setStats] = useState({
    total: 0,
    pendingApproval: 0,
    approved: 0,
    resolved: 0,
  });

  const loadActions = useCallback(async (pageNum, apStatus) => {
    setLoading(true);
    setError('');
    try {
      const filters = { page: pageNum, limit: 20 };
      if (apStatus) filters.approvalStatus = apStatus;
      const res = await getActions(filters);
      const data = res.data || {};
      setActions(data.actions || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load actions.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load summary stats (unfiltered total counts)
  const loadStats = useCallback(async () => {
    try {
      const [allRes, pendRes, appRes, resRes] = await Promise.all([
        getActions({ limit: 1 }),
        getActions({ limit: 1, approvalStatus: 'Pending Approval' }),
        getActions({ limit: 1, approvalStatus: 'Approved' }),
        getActions({ limit: 1, actionStatus: 'Resolved' }),
      ]);
      setStats({
        total:          allRes.data?.total  || 0,
        pendingApproval: pendRes.data?.total || 0,
        approved:       appRes.data?.total  || 0,
        resolved:       resRes.data?.total  || 0,
      });
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    loadActions(1, statusFilter);
    loadStats();
  }, [loadActions, loadStats, statusFilter]);

  function handleFilterChange(e) {
    setStatusFilter(e.target.value);
    setPage(1);
  }

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > pages) return;
    setPage(newPage);
    loadActions(newPage, statusFilter);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Action Center</h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage AI-generated action drafts, approvals, and operational tracking.
            </p>
          </div>
          <button
            onClick={() => { loadActions(page, statusFilter); loadStats(); }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Actions"
            value={stats.total}
            icon={<FileText className="w-5 h-5 text-white" />}
            colour="bg-indigo-500"
          />
          <StatCard
            label="Pending Approval"
            value={stats.pendingApproval}
            icon={<Clock className="w-5 h-5 text-white" />}
            colour="bg-amber-500"
          />
          <StatCard
            label="Approved"
            value={stats.approved}
            icon={<CheckCircle className="w-5 h-5 text-white" />}
            colour="bg-emerald-500"
          />
          <StatCard
            label="Resolved"
            value={stats.resolved}
            icon={<Zap className="w-5 h-5 text-white" />}
            colour="bg-green-500"
          />
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
          <label className="text-sm text-slate-600 font-medium">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={handleFilterChange}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">All</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Modified Approved">Modified Approved</option>
            <option value="Saved Draft">Saved Draft</option>
            <option value="Rejected">Rejected</option>
          </select>
          <span className="ml-auto text-xs text-slate-400">
            {total} action{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">
                No actions found.{' '}
                {!statusFilter && (
                  <span>
                    Generate your first action from the{' '}
                    <button
                      className="text-indigo-600 underline"
                      onClick={() => navigate('/admin/patterns')}
                    >
                      Patterns
                    </button>{' '}
                    page.
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Action #</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Pattern</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Department</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((action) => {
                    const pattern = action.patternId || {};
                    return (
                      <tr
                        key={action._id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-indigo-700">
                          {action.actionNumber}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 truncate max-w-[200px]">
                            {typeof pattern === 'object' ? (pattern.title || '—') : '—'}
                          </p>
                          {typeof pattern === 'object' && pattern.category && (
                            <p className="text-xs text-slate-400">{pattern.category}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs max-w-[140px] truncate">
                          {action.recommendedDepartment || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {statusBadge(action.approvalStatus)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {formatDate(action.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/admin/action-center/${action._id}`)}
                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                          >
                            View <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pages}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              Next
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
