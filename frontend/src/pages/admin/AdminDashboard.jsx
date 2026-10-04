import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Clock, CheckCircle, Network, Zap, BarChart2,
  AlertTriangle, Loader2, RefreshCw, Play,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { io as socketIOClient } from 'socket.io-client';
import AdminLayout from '../../components/layouts/AdminLayout';
import { getGrievances } from '../../services/grievanceService';
import { getMetrics, getWeeklyTrend, getProcessingStatus, processPending } from '../../services/evaluationService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
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

function StatCard({ label, value, icon, colour }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colour}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value ?? '—'}</p>
      </div>
    </div>
  );
}

function QuickLink({ label, description, to, colour, navigate }) {
  return (
    <button
      onClick={() => navigate(to)}
      className={`w-full text-left rounded-xl p-5 transition-opacity hover:opacity-90 ${colour}`}
    >
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-xs mt-1 opacity-75">{description}</p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// AdminDashboard
// ---------------------------------------------------------------------------
export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats]                   = useState(null);
  const [recentGrievances, setRecent]       = useState([]);
  const [categoryData, setCategoryData]     = useState([]);
  const [weeklyTrend, setWeeklyTrend]       = useState([]);
  const [processingStatus, setProcessing]   = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [processing, setProcessingBusy]     = useState(false);
  const [processMsg, setProcessMsg]         = useState('');

  // ---------------------------------------------------------------------------
  // Load all dashboard data from real MongoDB endpoints
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [metricsRes, grievancesRes, trendRes, procRes] = await Promise.all([
        getMetrics().catch(() => null),
        getGrievances({ limit: 5, page: 1 }).catch(() => null),
        getWeeklyTrend().catch(() => null),
        getProcessingStatus().catch(() => null),
      ]);

      // --- Stats from real metrics ---
      const m = metricsRes?.data?.metrics;
      if (m) {
        setStats({
          totalGrievances:  m.grievances?.total      ?? 0,
          resolvedGrievances: m.grievances?.resolved ?? 0,
          pendingGrievances: (m.grievances?.total ?? 0) - (m.grievances?.resolved ?? 0),
          activePatterns:   m.patterns?.active        ?? 0,
          pendingActions:   (m.actions?.total ?? 0) - (m.actions?.resolved ?? 0),
          outcomesMeasured: m.outcomes?.total         ?? 0,
        });

        // Category chart — byCategory is an object { "Network/IT": 342, ... }
        const byCategory = m.grievances?.byCategory || {};
        const catArr = Object.entries(byCategory)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setCategoryData(catArr);
      } else {
        setStats({ totalGrievances: 0, resolvedGrievances: 0, pendingGrievances: 0, activePatterns: 0, pendingActions: 0, outcomesMeasured: 0 });
        setCategoryData([]);
      }

      // --- Recent grievances ---
      setRecent(grievancesRes?.data?.grievances || []);

      // --- Weekly trend ---
      const trend = trendRes?.data?.weeklyData || [];
      setWeeklyTrend(trend);

      // --- Processing status ---
      setProcessing(procRes?.data || null);

    } catch (err) {
      setError('Failed to load dashboard data. Check that the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Socket.IO
  useEffect(() => {
    const socketUrl = (import.meta.env.VITE_SOCKET_URL) || 'http://localhost:5000';
    const socket = socketIOClient(socketUrl, { transports: ['websocket', 'polling'] });
    socket.on('grievance:new',          () => loadData());
    socket.on('grievance:statusUpdate', () => loadData());
    return () => { socket.disconnect(); };
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Process pending grievances
  // ---------------------------------------------------------------------------
  async function handleProcessPending() {
    setProcessingBusy(true);
    setProcessMsg('');
    try {
      const res = await processPending(50);
      const d = res?.data;
      if (d) {
        setProcessMsg(`Processed ${d.processed}: ${d.succeeded} succeeded, ${d.failed} failed. ${d.remaining} remaining.`);
      }
      await loadData();
    } catch (err) {
      setProcessMsg('Processing failed — is the AI service running?');
    } finally {
      setProcessingBusy(false);
    }
  }

  const STAT_CARDS = stats ? [
    { label: 'Total Grievances',   value: stats.totalGrievances,   icon: <FileText    className="w-5 h-5 text-indigo-600" />, colour: 'bg-indigo-50' },
    { label: 'Pending',            value: stats.pendingGrievances, icon: <Clock       className="w-5 h-5 text-amber-500" />,  colour: 'bg-amber-50' },
    { label: 'Resolved',           value: stats.resolvedGrievances,icon: <CheckCircle className="w-5 h-5 text-green-600" />,  colour: 'bg-green-50' },
    { label: 'Active Patterns',    value: stats.activePatterns,    icon: <Network     className="w-5 h-5 text-purple-600" />, colour: 'bg-purple-50' },
    { label: 'Pending Actions',    value: stats.pendingActions,    icon: <Zap         className="w-5 h-5 text-orange-500" />, colour: 'bg-orange-50' },
    { label: 'Outcomes Measured',  value: stats.outcomesMeasured,  icon: <BarChart2   className="w-5 h-5 text-teal-600" />,   colour: 'bg-teal-50' },
  ] : [];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Live overview from MongoDB.</p>
          </div>
          <button onClick={loadData} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {/* AI Processing status bar */}
        {processingStatus && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">AI Processing Status</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {processingStatus.completed} of {processingStatus.total} grievances processed
                  {processingStatus.pending > 0 && ` — ${processingStatus.pending} pending`}
                  {processingStatus.failed > 0 && ` — ${processingStatus.failed} failed`}
                </p>
              </div>
              <button
                onClick={handleProcessPending}
                disabled={processing || processingStatus.pending === 0}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {processing ? 'Processing...' : 'Process 50 Pending'}
              </button>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all"
                style={{ width: processingStatus.total > 0 ? `${(processingStatus.completed / processingStatus.total) * 100}%` : '0%' }}
              />
            </div>
            {processMsg && <p className="text-xs text-slate-500 mt-2">{processMsg}</p>}
          </div>
        )}

        {/* Stat cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {STAT_CARDS.map((card) => <StatCard key={card.label} {...card} />)}
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category bar chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Grievances by Category</h2>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={categoryData} barSize={24}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [v, 'Count']} contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                {loading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-400" /> : 'No data yet'}
              </div>
            )}
          </div>

          {/* Weekly trend line chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Weekly Complaint Trend (last 12 weeks)</h2>
            {weeklyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={256}>
                <LineChart data={weeklyTrend}>
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400 text-sm">No trend data yet</div>
            )}
          </div>
        </div>

        {/* Recent grievances table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700">Recent Grievances</h2>
            <button onClick={() => navigate('/admin/grievances')} className="text-xs text-indigo-600 hover:underline">
              View all →
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : recentGrievances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm">
              <FileText className="w-8 h-8 mb-2 text-slate-300" />
              No grievances yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Tracking Code', 'Category', 'Severity', 'Status', 'Date'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentGrievances.map((g) => (
                    <tr key={g._id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => navigate(`/admin/grievances`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-indigo-700">{g.trackingCode}</td>
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
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(g.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickLink label="Patterns"        description="AI-discovered complaint clusters"       to="/admin/patterns"       colour="bg-indigo-600 text-white"  navigate={navigate} />
          <QuickLink label="Action Center"   description="Manage action drafts and approvals"    to="/admin/action-center"  colour="bg-emerald-600 text-white" navigate={navigate} />
          <QuickLink label="Upload Dataset"  description="Import historical grievance data"      to="/admin/upload"         colour="bg-amber-500 text-white"   navigate={navigate} />
          <QuickLink label="Semantic Search" description="Find similar grievances by meaning"    to="/admin/search"         colour="bg-purple-600 text-white"  navigate={navigate} />
        </div>

      </div>
    </AdminLayout>
  );
}
