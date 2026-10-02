import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Search,
  AlertTriangle,
  BarChart2,
  MapPin,
  Tag,
  Users,
  ChevronRight,
  Loader2,
  Zap,
} from 'lucide-react';
import { getPatterns, refreshPatterns } from '../../services/patternService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ALL_CATEGORIES = [
  'Academic', 'Infrastructure', 'Network/IT', 'Hostel', 'Transport',
  'Electricity', 'Water/Sanitation', 'Library', 'Canteen', 'Maintenance',
  'Harassment', 'Bullying', 'Ragging', 'Discrimination', 'Safety', 'Other',
];

const STATUS_OPTIONS = ['active', 'resolved', 'monitoring', 'archived'];

// ---------------------------------------------------------------------------
// Category colour map
// ---------------------------------------------------------------------------
const CATEGORY_COLOURS = {
  'Academic':        'bg-blue-100 text-blue-800',
  'Infrastructure':  'bg-amber-100 text-amber-800',
  'Network/IT':      'bg-purple-100 text-purple-800',
  'Hostel':          'bg-teal-100 text-teal-800',
  'Transport':       'bg-orange-100 text-orange-800',
  'Electricity':     'bg-yellow-100 text-yellow-800',
  'Water/Sanitation':'bg-cyan-100 text-cyan-800',
  'Library':         'bg-indigo-100 text-indigo-800',
  'Canteen':         'bg-lime-100 text-lime-800',
  'Maintenance':     'bg-stone-100 text-stone-800',
  'Harassment':      'bg-red-100 text-red-800',
  'Bullying':        'bg-red-100 text-red-800',
  'Ragging':         'bg-red-100 text-red-800',
  'Discrimination':  'bg-rose-100 text-rose-800',
  'Safety':          'bg-red-100 text-red-800',
  'Other':           'bg-slate-100 text-slate-800',
};

const STATUS_COLOURS = {
  active:     'bg-green-100 text-green-800',
  resolved:   'bg-blue-100 text-blue-800',
  monitoring: 'bg-yellow-100 text-yellow-800',
  archived:   'bg-slate-100 text-slate-600',
};

// ---------------------------------------------------------------------------
// UrgencyBar — deterministic bar rendering with Tailwind
// ---------------------------------------------------------------------------
function UrgencyBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  let colourClass = 'bg-green-500';
  if (pct >= 70) colourClass = 'bg-red-500';
  else if (pct >= 50) colourClass = 'bg-orange-500';
  else if (pct >= 30) colourClass = 'bg-yellow-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${colourClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PatternCard
// ---------------------------------------------------------------------------
function PatternCard({ pattern, onViewEvidence, onTakeAction }) {
  const categoryColour = CATEGORY_COLOURS[pattern.category] || CATEGORY_COLOURS['Other'];
  const statusColour   = STATUS_COLOURS[pattern.status]     || STATUS_COLOURS.active;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 text-sm leading-snug truncate">
            {pattern.title || 'Untitled Pattern'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
            {pattern.description}
          </p>
        </div>
        <span className="flex-shrink-0 text-2xl font-bold text-indigo-600">
          {pattern.reportCount}
          <span className="block text-xs font-normal text-slate-400 text-center">reports</span>
        </span>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColour}`}>
          {pattern.category}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColour}`}>
          {pattern.status}
        </span>
      </div>

      {/* Location */}
      {pattern.primaryLocation && (
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate">{pattern.primaryLocation}</span>
        </div>
      )}

      {/* Responsible dept */}
      {pattern.responsibleDepartment && (
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate">{pattern.responsibleDepartment}</span>
        </div>
      )}

      {/* Urgency bar */}
      <div>
        <p className="text-xs text-slate-500 mb-1">Avg Urgency</p>
        <UrgencyBar value={pattern.avgUrgency} />
      </div>

      {/* Top keywords */}
      {pattern.topKeywords && pattern.topKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pattern.topKeywords.slice(0, 6).map((kw) => (
            <span
              key={kw}
              className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Time range */}
      {pattern.timeRange && (
        <p className="text-xs text-slate-400">{pattern.timeRange}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-slate-100">
        <button
          onClick={() => onViewEvidence(pattern._id)}
          className="flex-1 py-1.5 px-3 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1"
        >
          <Search className="w-3.5 h-3.5" />
          View Evidence
        </button>
        <button
          onClick={() => onTakeAction(pattern._id)}
          className="flex-1 py-1.5 px-3 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
        >
          <Zap className="w-3.5 h-3.5" />
          Take Action
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function Patterns() {
  const navigate = useNavigate();

  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState('');
  const [refreshMsg, setRefreshMsg] = useState('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');

  // ---------------------------------------------------------------------------
  // Load patterns
  // ---------------------------------------------------------------------------
  const loadPatterns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getPatterns({
        category: categoryFilter || undefined,
        status:   statusFilter   || undefined,
      });
      setPatterns((res.data && res.data.patterns) || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load patterns.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter]);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  // ---------------------------------------------------------------------------
  // Refresh patterns
  // ---------------------------------------------------------------------------
  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMsg('');
    setError('');
    try {
      const res = await refreshPatterns();
      setRefreshMsg(res.message || 'Patterns refreshed.');
      await loadPatterns();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Refresh failed.');
    } finally {
      setRefreshing(false);
    }
  }

  function handleViewEvidence(id) {
    navigate(`/admin/patterns/${id}`);
  }

  function handleTakeAction(id) {
    navigate(`/admin/patterns/${id}?action=true`);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Page header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-indigo-600" />
              Discovered Patterns
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              AI-discovered complaint clusters. Each pattern represents a group of semantically similar grievances.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {refreshing ? 'Refreshing…' : 'Refresh Patterns'}
          </button>
        </div>

        {/* Refresh message */}
        {refreshMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {refreshMsg}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Filter bar */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[180px]"
            >
              <option value="">All Categories</option>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <BarChart2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[160px]"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {(categoryFilter || statusFilter) && (
            <button
              onClick={() => { setCategoryFilter(''); setStatusFilter(''); }}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && patterns.length === 0 && (
          <div className="text-center py-24 bg-white rounded-xl border border-slate-200 shadow-sm">
            <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-600 mb-2">No patterns discovered yet</h2>
            <p className="text-slate-400 text-sm mb-6">
              Upload a historical dataset and click "Refresh Patterns" to discover clusters.
            </p>
            <button
              onClick={() => navigate('/admin/upload')}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
            >
              Upload Dataset
            </button>
          </div>
        )}

        {/* Pattern grid */}
        {!loading && patterns.length > 0 && (
          <>
            <p className="text-sm text-slate-500 mb-4">
              {patterns.length} pattern{patterns.length !== 1 ? 's' : ''} found
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {patterns.map((p) => (
                <PatternCard
                  key={p._id}
                  pattern={p}
                  onViewEvidence={handleViewEvidence}
                  onTakeAction={handleTakeAction}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
