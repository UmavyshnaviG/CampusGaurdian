import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Activity,
  Eye,
  RefreshCw,
  Loader2,
  BarChart2,
  CheckCircle,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getOutcomes, checkRecurrence } from '../../services/outcomeService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function recurrenceBadge(status) {
  const styles = {
    Detected: 'bg-red-100 text-red-700',
    Monitoring: 'bg-amber-100 text-amber-700',
    'Not Detected': 'bg-emerald-100 text-emerald-700',
  };
  const cls = styles[status] || 'bg-slate-100 text-slate-600';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}
    >
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
// RecurrenceMonitor page
// ---------------------------------------------------------------------------
export default function RecurrenceMonitor() {
  const navigate = useNavigate();
  const [outcomes, setOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingId, setCheckingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [detectedRes, monitoringRes] = await Promise.all([
        getOutcomes({ recurrenceStatus: 'Detected' }),
        getOutcomes({ recurrenceStatus: 'Monitoring' }),
      ]);
      const detected = detectedRes.data?.outcomes || [];
      const monitoring = monitoringRes.data?.outcomes || [];

      // Merge, de-duplicate by _id
      const seen = new Set();
      const merged = [];
      for (const o of [...detected, ...monitoring]) {
        if (!seen.has(o._id)) {
          seen.add(o._id);
          merged.push(o);
        }
      }
      setOutcomes(merged);
    } catch {
      setError('Failed to load recurrence data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCheckRecurrence(patternId) {
    if (!patternId) return;
    setCheckingId(patternId);
    try {
      await checkRecurrence(patternId);
      await load();
    } finally {
      setCheckingId(null);
    }
  }

  async function handleCheckAll() {
    setCheckingAll(true);
    for (const o of outcomes) {
      const patternId =
        typeof o.patternId === 'object' ? o.patternId?._id : o.patternId;
      if (patternId) {
        // eslint-disable-next-line no-await-in-loop
        await checkRecurrence(patternId).catch(() => {});
      }
    }
    await load();
    setCheckingAll(false);
  }

  const detected = outcomes.filter((o) => o.recurrenceStatus === 'Detected').length;
  const monitoring = outcomes.filter((o) => o.recurrenceStatus === 'Monitoring').length;
  const total = outcomes.length;

  // Chart data: recurrenceScore per pattern title
  const chartData = outcomes.map((o) => ({
    name:
      (typeof o.patternId === 'object' ? o.patternId?.title : '') ||
      'Pattern',
    score: o.recurrenceDetails?.recurrenceScore
      ? Number((o.recurrenceDetails.recurrenceScore * 100).toFixed(1))
      : 0,
  }));

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
              <Activity className="w-5 h-5 text-indigo-600" aria-hidden="true" />
              <h1 className="text-xl font-bold text-slate-800">Recurrence Monitor</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              aria-label="Refresh data"
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Refresh
            </button>
            <button
              onClick={handleCheckAll}
              disabled={checkingAll || loading || outcomes.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                         bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50
                         transition-colors"
              aria-label="Check recurrence for all patterns"
            >
              {checkingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
              {checkingAll ? 'Checking All…' : 'Check All'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stat bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            label="Recurrence Detected"
            value={detected}
            icon={<AlertTriangle className="w-5 h-5 text-red-600" aria-hidden="true" />}
            colour="bg-red-50"
          />
          <StatCard
            label="Monitoring"
            value={monitoring}
            icon={<Clock className="w-5 h-5 text-amber-500" aria-hidden="true" />}
            colour="bg-amber-50"
          />
          <StatCard
            label="Total Checked"
            value={total}
            icon={<CheckCircle className="w-5 h-5 text-indigo-600" aria-hidden="true" />}
            colour="bg-indigo-50"
          />
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

        {/* Recurrence score chart */}
        {!loading && chartData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Recurrence Score by Pattern (%)
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={32}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Recurrence Score']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div
            className="flex items-center justify-center py-20"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" aria-hidden="true" />
            <span className="sr-only">Loading recurrence data…</span>
          </div>
        ) : outcomes.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BarChart2 className="w-12 h-12 text-slate-300 mb-4" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">
              No recurrence alerts
            </h2>
            <p className="text-slate-500 max-w-md">
              No patterns are currently flagged as Detected or Monitoring. Check back after
              running recurrence checks on outcomes.
            </p>
          </div>
        ) : (
          /* Table */
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Pattern Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Action #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Score
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Days Since Res.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Evidence
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outcomes.map((o) => {
                  const patternId =
                    typeof o.patternId === 'object' ? o.patternId?._id : o.patternId;
                  const patternTitle =
                    (typeof o.patternId === 'object' ? o.patternId?.title : '') || '—';
                  const category =
                    (typeof o.patternId === 'object' ? o.patternId?.category : '') || '—';
                  const actionNum =
                    (typeof o.actionId === 'object'
                      ? o.actionId?.actionNumber || o.actionId?.actionTitle
                      : '') || '—';
                  const score = o.recurrenceDetails?.recurrenceScore;
                  const daysSince = o.recurrenceDetails?.daysSinceResolution;
                  const evidence =
                    Array.isArray(o.recurrenceDetails?.evidenceOfRecurrence) &&
                    o.recurrenceDetails.evidenceOfRecurrence.length > 0
                      ? o.recurrenceDetails.evidenceOfRecurrence[0]
                      : '—';
                  const isChecking = checkingId === patternId;

                  return (
                    <tr key={o._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-[180px] truncate">
                        {patternTitle}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{category}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                        {actionNum}
                      </td>
                      <td className="px-4 py-3">{recurrenceBadge(o.recurrenceStatus)}</td>
                      <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                        {score != null ? `${fmt(score * 100, 1)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {daysSince != null ? daysSince : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate text-xs">
                        {evidence}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleCheckRecurrence(patternId)}
                          disabled={isChecking || checkingAll}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                     text-xs font-medium bg-indigo-600 text-white
                                     hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          aria-label={`Trigger recurrence check for ${patternTitle}`}
                        >
                          {isChecking ? (
                            <Loader2
                              className="w-3.5 h-3.5 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          {isChecking ? 'Checking…' : 'Trigger Check'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
