import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  MapPin,
  Users,
  Calendar,
  BarChart2,
  FileText,
  Loader2,
  Zap,
  Info,
  Tag,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { getPatternById } from '../../services/patternService';

// ---------------------------------------------------------------------------
// Colour palettes
// ---------------------------------------------------------------------------
const PIE_COLOURS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6'];
const SEVERITY_COLOURS = { Low: '#10b981', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444' };
const SENTIMENT_COLOURS = { positive: '#10b981', neutral: '#94a3b8', negative: '#ef4444' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function objToChartData(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).map(([name, value]) => ({ name, value: Number(value) || 0 }));
}

function sortedWeeklyData(weeklyTrend) {
  if (!weeklyTrend || typeof weeklyTrend !== 'object') return [];
  return Object.entries(weeklyTrend)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count: Number(count) || 0 }));
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CautionBox — always shown before diagnosis text
// ---------------------------------------------------------------------------
function CautionBox() {
  return (
    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs mb-4">
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>
        All findings are based on available data and require human verification before action.
        This analysis does not constitute a final determination or disciplinary decision.
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PatternDetail
// ---------------------------------------------------------------------------
export default function PatternDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showActionPrompt = searchParams.get('action') === 'true';

  const [pattern, setPattern] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await getPatternById(id);
        setPattern((res.data && res.data.pattern) || null);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load pattern.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !pattern) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/admin/patterns')}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Patterns
          </button>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error || 'Pattern not found.'}
          </div>
        </div>
      </div>
    );
  }

  const diagnosis = pattern.diagnosis || {};
  const stakeholderData = objToChartData(pattern.stakeholderGroups);
  const severityData = objToChartData(pattern.severityDistribution);
  const categoryData = objToChartData(pattern.categoryDistribution);
  const locationData = objToChartData(pattern.locations
    ? Object.fromEntries((pattern.locations || []).map((l) => [l, 1]))
    : {});
  const weeklyData = sortedWeeklyData(pattern.weeklyTrend);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Back navigation */}
        <button
          onClick={() => navigate('/admin/patterns')}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Patterns
        </button>

        {/* ---- Header ---- */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">{pattern.title}</h1>
              <p className="text-slate-500 text-sm mt-1">{pattern.description}</p>
              <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <BarChart2 className="w-4 h-4 text-indigo-500" />
                  <strong>{pattern.reportCount}</strong>&nbsp;reports
                </span>
                {pattern.timeRange && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {pattern.timeRange}
                  </span>
                )}
                {pattern.primaryLocation && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {pattern.primaryLocation}
                  </span>
                )}
                {pattern.responsibleDepartment && (
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-slate-400" />
                    {pattern.responsibleDepartment}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => navigate(`/admin/patterns/${id}?action=true`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Zap className="w-4 h-4" />
                Take Action
              </button>
            </div>
          </div>
        </div>

        {/* Action prompt banner */}
        {showActionPrompt && (
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700 text-sm flex items-start gap-2">
            <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Action Center</p>
              <p className="mt-0.5">
                Action coordination for this pattern will be available in Stage 7 (Action Coordination Agent).
              </p>
            </div>
          </div>
        )}

        {/* ---- Evidence ---- */}
        {pattern.evidence && pattern.evidence.length > 0 && (
          <Section title="Evidence — Representative Complaints" icon={<FileText className="w-4 h-4 text-indigo-500" />}>
            <div className="space-y-3">
              {pattern.evidence.slice(0, 8).map((ev, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg text-sm ${
                    ev.startsWith('"')
                      ? 'bg-slate-50 border border-slate-200 italic text-slate-700'
                      : 'text-slate-500 text-xs'
                  }`}
                >
                  {ev}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ---- Multi-dimensional breakdown ---- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* WHO */}
          <Section title="WHO — Stakeholder Groups" icon={<Users className="w-4 h-4 text-teal-500" />}>
            {stakeholderData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stakeholderData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm text-center py-6">No stakeholder data</p>
            )}
          </Section>

          {/* WHAT — Category */}
          <Section title="WHAT — Category Distribution" icon={<Tag className="w-4 h-4 text-amber-500" />}>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLOURS[idx % PIE_COLOURS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm text-center py-6">No category data</p>
            )}
          </Section>

          {/* WHAT — Severity */}
          <Section title="WHAT — Severity Distribution" icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}>
            {severityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={severityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {severityData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={SEVERITY_COLOURS[entry.name] || PIE_COLOURS[0]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm text-center py-6">No severity data</p>
            )}
          </Section>

          {/* WHERE */}
          <Section title="WHERE — Location Distribution" icon={<MapPin className="w-4 h-4 text-rose-500" />}>
            {locationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={locationData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#22d3ee" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm text-center py-6">No location data</p>
            )}
          </Section>
        </div>

        {/* WHEN — Weekly trend (full width) */}
        <Section title="WHEN — Weekly Complaint Trend" icon={<Calendar className="w-4 h-4 text-indigo-500" />}>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyData} margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Reports per week"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-sm text-center py-6">No weekly trend data available</p>
          )}
        </Section>

        {/* ---- Diagnosis ---- */}
        <Section title="Diagnosis" icon={<Info className="w-4 h-4 text-amber-500" />}>
          <CautionBox />

          {diagnosis.summary ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Summary</p>
                <p className="text-sm text-slate-700">{diagnosis.summary}</p>
              </div>

              {diagnosis.concentrationAnalysis && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Concentration Analysis
                  </p>
                  <p className="text-sm text-slate-700">{diagnosis.concentrationAnalysis}</p>
                </div>
              )}

              {diagnosis.possibleFactors && diagnosis.possibleFactors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Possible Contributing Factors
                  </p>
                  <ul className="space-y-1">
                    {diagnosis.possibleFactors.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-1 w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0" />
                        A possible contributing factor is {f}.
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {diagnosis.recommendedDepartment && (
                <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <Users className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <p className="text-sm text-indigo-700">
                    Recommended department: <strong>{diagnosis.recommendedDepartment}</strong>
                  </p>
                </div>
              )}

              {diagnosis.confidence !== undefined && (
                <p className="text-xs text-slate-400">
                  Diagnostic confidence: {Math.round(diagnosis.confidence * 100)}%
                </p>
              )}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No diagnosis available for this pattern.</p>
          )}
        </Section>

        {/* ---- Recommendation (placeholder for Stage 7) ---- */}
        <Section title="Recommendation" icon={<Zap className="w-4 h-4 text-green-500" />}>
          {pattern.recommendation ? (
            <pre className="text-xs text-slate-600 whitespace-pre-wrap">
              {JSON.stringify(pattern.recommendation, null, 2)}
            </pre>
          ) : (
            <div className="text-center py-8">
              <Zap className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">
                Recommendations will be generated by the Recommendation Agent in Stage 7.
              </p>
              <button
                onClick={() => navigate(`/admin/patterns/${id}?action=true`)}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Take Action
              </button>
            </div>
          )}
        </Section>

      </div>
    </div>
  );
}
