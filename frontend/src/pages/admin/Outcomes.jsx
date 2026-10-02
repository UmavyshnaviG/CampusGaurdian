import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Loader2,
  BarChart2,
  Eye,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getOutcomes, checkRecurrence } from '../../services/outcomeService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function directionIcon(direction) {
  if (direction === 'Improved') {
    return <TrendingDown className="w-5 h-5 text-emerald-600" aria-hidden="true" />;
  }
  if (direction === 'Worsened') {
    return <TrendingUp className="w-5 h-5 text-red-500" aria-hidden="true" />;
  }
  return <Minus className="w-5 h-5 text-slate-400" aria-hidden="true" />;
}

function directionColour(direction) {
  if (direction === 'Improved') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (direction === 'Worsened') return 'text-red-700 bg-red-50 border-red-200';
  return 'text-slate-600 bg-slate-50 border-slate-200';
}

function recurrenceBadge(status) {
  const styles = {
    'Detected':     'bg-red-100 text-red-700',
    'Monitoring':   'bg-amber-100 text-amber-700',
    'Not Detected': 'bg-emerald-100 text-emerald-700',
  };
  const cls = styles[status] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function fmt(n, decimals = 1) {
  if (n === undefined || n === null) return '—';
  return Number(n).toFixed(decimals);
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------
function StatCard({ label, value, icon, colour }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colour}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricPair
// ---------------------------------------------------------------------------
function MetricPair({ label, before, after, unit = '' }) {
  const bVal = typeof before === 'number' ? before : 0;
  const aVal = typeof after === 'number' ? after : 0;
  const improved = aVal < bVal;
  const worsened = aVal > bVal;

  return (
    <div className="flex flex-col items-center text-center p-2">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-600">
          {fmt(bVal)}{unit}
        </span>
        <span className="text-slate-300">→</span>
        <span
          className={`text-sm font-bold ${
            improved ? 'text-emerald-600' : worsened ? 'text-red-600' : 'text-slate-600'
          }`}
        >
          {fmt(aVal)}{unit}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OutcomeCard
// ---------------------------------------------------------------------------
function OutcomeCard({ outcome, onCheckRecurrence }) {
  const [checking, setChecking] = useState(false);

  const pattern = outcome.patternId || {};
  const action = outcome.actionId || {};
  const before = outcome.beforeMetrics || {};
  const after = outcome.afterMetrics || {};
  const change = outcome.changeMetrics || {};

  const chartData = [
    {
      name: 'Before',
      complaints: before.complaintCount || 0,
    },
    {
      name: 'After',
      complaints: after.complaintCount || 0,
    },
  ];

  async function handleCheckRecurrence() {
    const patternId = typeof outcome.patternId === 'object'
      ? outcome.patternId._id
      : outcome.patternId;
    if (!patternId) return;
    setChecking(true);
    try {
      await onCheckRecurrence(patternId);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`px-5 py-4 border-b flex items-start justify-between gap-3 ${directionColour(outcome.outcomeDirection)}`}>
        <div className="flex items-center gap-2">
          {directionIcon(outcome.outcomeDirection)}
          <div>
            <p className="font-semibold text-sm leading-tight">
              {pattern.title || 'Pattern'}
            </p>
            <p className="text-xs mt-0.5 opacity-75">
              Action: {action.actionNumber || action.actionTitle || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {recurrenceBadge(outcome.recurrenceStatus)}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${directionColour(outcome.outcomeDirection)}`}>
            {outcome.outcomeDirection || 'Stable'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Before / After metrics */}
        <div className="grid grid-cols-4 gap-2 bg-slate-50 rounded-lg p-3">
          <MetricPair
            label="Complaints"
            before={before.complaintCount}
            after={after.complaintCount}
          />
          <MetricPair
            label="Avg Severity"
            before={before.avgSeverity}
            after={after.avgSeverity}
          />
          <MetricPair
            label="Avg Sentiment"
            before={before.avgSentiment}
            after={after.avgSentiment}
          />
          <MetricPair
            label="Weekly Freq"
            before={before.weeklyFrequency}
            after={after.weeklyFrequency}
          />
        </div>

        {/* Change indicators */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            {change.countChangePct < -20 && (
              <TrendingDown className="w-4 h-4 text-emerald-500" aria-hidden="true" />
            )}
            {change.countChangePct > 20 && (
              <TrendingUp className="w-4 h-4 text-red-500" aria-hidden="true" />
            )}
            {change.countChangePct >= -20 && change.countChangePct <= 20 && (
              <Minus className="w-4 h-4 text-slate-400" aria-hidden="true" />
            )}
            <span className={
              change.countChangePct < -20
                ? 'text-emerald-700'
                : change.countChangePct > 20
                ? 'text-red-700'
                : 'text-slate-500'
            }>
              {change.countChangePct >= 0 ? '+' : ''}
              {fmt(change.countChangePct)}% frequency change
            </span>
          </div>
        </div>

        {/* Bar chart */}
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={40}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                formatter={(value) => [value, 'Complaints']}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar
                dataKey="complaints"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Observation text */}
        {outcome.observationText && (
          <p className="text-xs text-slate-600 bg-slate-50 rounded p-3 border border-slate-200 italic leading-relaxed">
            {outcome.observationText}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-slate-400">
            Measured: {formatDate(outcome.createdAt)}
          </p>
          <button
            onClick={handleCheckRecurrence}
            disabled={checking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50
                       transition-colors"
            aria-label="Check for pattern recurrence"
          >
            {checking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Activity className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {checking ? 'Checking…' : 'Check Recurrence'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Outcomes page
// ---------------------------------------------------------------------------
export default function Outcomes() {
  const navigate = useNavigate();
  const [outcomes, setOutcomes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [directionFilter, setDirectionFilter] = useState('');

  const LIMIT = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getOutcomes({
        outcomeDirection: directionFilter || undefined,
        page,
        limit: LIMIT,
      });
      const data = res.data || {};
      setOutcomes(data.outcomes || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError('Failed to load outcomes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [directionFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCheckRecurrence(patternId) {
    try {
      await checkRecurrence(patternId);
      await load(); // refresh to reflect new recurrence status
    } catch {
      // errors handled in card component
    }
  }

  // Compute stats from loaded outcomes
  const improved = outcomes.filter((o) => o.outcomeDirection === 'Improved').length;
  const stable   = outcomes.filter((o) => o.outcomeDirection === 'Stable').length;
  const worsened = outcomes.filter((o) => o.outcomeDirection === 'Worsened').length;
  const pages    = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="text-slate-500 hover:text-slate-700 text-sm"
              aria-label="Back to dashboard"
            >
              ← Dashboard
            </button>
            <span className="text-slate-300" aria-hidden="true">|</span>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-600" aria-hidden="true" />
              <h1 className="text-xl font-bold text-slate-800">Outcome Measurement</h1>
            </div>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            aria-label="Refresh outcomes"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Measured"
            value={total}
            icon={<BarChart2 className="w-5 h-5 text-indigo-600" aria-hidden="true" />}
            colour="bg-indigo-50"
          />
          <StatCard
            label="Improved"
            value={improved}
            icon={<TrendingDown className="w-5 h-5 text-emerald-600" aria-hidden="true" />}
            colour="bg-emerald-50"
          />
          <StatCard
            label="Stable"
            value={stable}
            icon={<Minus className="w-5 h-5 text-slate-500" aria-hidden="true" />}
            colour="bg-slate-100"
          />
          <StatCard
            label="Worsened"
            value={worsened}
            icon={<TrendingUp className="w-5 h-5 text-red-500" aria-hidden="true" />}
            colour="bg-red-50"
          />
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3">
          <label htmlFor="direction-filter" className="text-sm font-medium text-slate-700">
            Filter by direction:
          </label>
          <select
            id="direction-filter"
            value={directionFilter}
            onChange={(e) => { setDirectionFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All</option>
            <option value="Improved">Improved</option>
            <option value="Stable">Stable</option>
            <option value="Worsened">Worsened</option>
          </select>
          <span className="text-sm text-slate-500">
            Showing {outcomes.length} of {total} outcome(s)
          </span>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20" aria-live="polite" aria-busy="true">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" aria-hidden="true" />
            <span className="sr-only">Loading outcomes…</span>
          </div>
        ) : outcomes.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BarChart2 className="w-12 h-12 text-slate-300 mb-4" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">No outcomes measured yet</h2>
            <p className="text-slate-500 max-w-md">
              Use the Action Center to resolve patterns, then measure outcomes from each
              action's detail page.
            </p>
          </div>
        ) : (
          /* Outcome cards grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {outcomes.map((o) => (
              <OutcomeCard
                key={o._id}
                outcome={o}
                onCheckRecurrence={handleCheckRecurrence}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pages > 1 && (
          <nav
            aria-label="Outcomes pagination"
            className="flex items-center justify-center gap-2 pt-4"
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100 transition-colors"
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100 transition-colors"
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
