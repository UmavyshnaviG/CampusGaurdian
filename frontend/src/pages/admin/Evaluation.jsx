import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  TrendingDown,
  Minus,
  TrendingUp,
  CheckCircle,
  Activity,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import AdminLayout from '../../components/layouts/AdminLayout';
import { getMetrics } from '../../services/evaluationService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(n, decimals = 1) {
  if (n === undefined || n === null) return '—';
  return Number(n).toFixed(decimals);
}

function StatCard({ label, value, icon, colour }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colour}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-200 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-slate-200 rounded w-3/4" />
          <div className="h-5 bg-slate-200 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

const PIE_COLOURS = {
  Improved: '#10b981',
  Stable:   '#6366f1',
  Worsened: '#ef4444',
};

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------
export default function Evaluation() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMetrics();
      setMetrics(res.data?.metrics || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grievances = metrics?.grievances || {};
  const patterns   = metrics?.patterns   || {};
  const actions    = metrics?.actions    || {};
  const outcomes   = metrics?.outcomes   || {};
  const ai         = metrics?.ai         || null;

  // Chart data
  const categoryData = (grievances.byCategory || []).map((item) => ({
    name: item._id || item.category || '—',
    count: item.count || 0,
  }));

  const pieData = [
    { name: 'Improved', value: outcomes.improved || 0 },
    { name: 'Stable',   value: outcomes.stable   || 0 },
    { name: 'Worsened', value: outcomes.worsened  || 0 },
  ].filter((d) => d.value > 0);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Evaluation</h1>
            <p className="text-slate-500 text-sm mt-1">
              System-wide metrics and performance indicators.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            aria-label="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
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

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            {/* System stats */}
            <section aria-label="System Statistics">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">System Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Total Grievances"
                  value={grievances.total ?? '—'}
                  icon={<BarChart2 className="w-5 h-5 text-indigo-600" aria-hidden="true" />}
                  colour="bg-indigo-50"
                />
                <StatCard
                  label="Resolved %"
                  value={grievances.resolvedPct != null ? `${fmt(grievances.resolvedPct, 0)}%` : '—'}
                  icon={<CheckCircle className="w-5 h-5 text-green-600" aria-hidden="true" />}
                  colour="bg-green-50"
                />
                <StatCard
                  label="Avg Resolution Time"
                  value={grievances.avgResolutionTimeDays != null ? `${fmt(grievances.avgResolutionTimeDays, 1)}d` : '—'}
                  icon={<Activity className="w-5 h-5 text-amber-500" aria-hidden="true" />}
                  colour="bg-amber-50"
                />
                <StatCard
                  label="Total Patterns"
                  value={patterns.total ?? '—'}
                  icon={<BarChart2 className="w-5 h-5 text-purple-600" aria-hidden="true" />}
                  colour="bg-purple-50"
                />
              </div>
            </section>

            {/* Action stats */}
            <section aria-label="Action Statistics">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Action Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  label="Total Actions"
                  value={actions.total ?? '—'}
                  icon={<BarChart2 className="w-5 h-5 text-indigo-600" aria-hidden="true" />}
                  colour="bg-indigo-50"
                />
                <StatCard
                  label="Approved"
                  value={actions.approved ?? '—'}
                  icon={<CheckCircle className="w-5 h-5 text-emerald-600" aria-hidden="true" />}
                  colour="bg-emerald-50"
                />
                <StatCard
                  label="Resolved"
                  value={actions.resolved ?? '—'}
                  icon={<Activity className="w-5 h-5 text-teal-600" aria-hidden="true" />}
                  colour="bg-teal-50"
                />
              </div>
            </section>

            {/* Outcome stats */}
            <section aria-label="Outcome Statistics">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Outcome Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Improved"
                  value={outcomes.improved ?? '—'}
                  icon={<TrendingDown className="w-5 h-5 text-emerald-600" aria-hidden="true" />}
                  colour="bg-emerald-50"
                />
                <StatCard
                  label="Stable"
                  value={outcomes.stable ?? '—'}
                  icon={<Minus className="w-5 h-5 text-slate-500" aria-hidden="true" />}
                  colour="bg-slate-100"
                />
                <StatCard
                  label="Worsened"
                  value={outcomes.worsened ?? '—'}
                  icon={<TrendingUp className="w-5 h-5 text-red-500" aria-hidden="true" />}
                  colour="bg-red-50"
                />
                <StatCard
                  label="Recurrence Detected"
                  value={outcomes.recurrenceDetected ?? '—'}
                  icon={<AlertTriangle className="w-5 h-5 text-orange-500" aria-hidden="true" />}
                  colour="bg-orange-50"
                />
              </div>
            </section>

            {/* AI Metrics */}
            <section aria-label="AI Metrics">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">AI Metrics</h2>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                {ai ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(ai).map(([key, val]) => (
                      <div key={key} className="space-y-1">
                        <p className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Not evaluated — AI service metrics unavailable.</p>
                )}
              </div>
            </section>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Outcome direction pie */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-4">Outcome Direction</h2>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={192}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${Math.round(percent * 100)}%`
                        }
                        labelLine={false}
                      >
                        {pieData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={PIE_COLOURS[entry.name] || '#94a3b8'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [value, 'Count']}
                        contentStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                    No outcome data yet
                  </div>
                )}
              </div>

              {/* Grievances by category bar chart */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-4">
                  Grievances by Category
                </h2>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={256}>
                    <BarChart data={categoryData} barSize={24}>
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value) => [value, 'Count']}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                    No category data yet
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
