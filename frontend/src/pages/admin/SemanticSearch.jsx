import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  AlertTriangle,
  Loader2,
  FileText,
} from 'lucide-react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { semanticSearch } from '../../services/searchService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

const CATEGORY_BADGE = 'bg-indigo-100 text-indigo-700';

// ---------------------------------------------------------------------------
// SimilarityBar
// ---------------------------------------------------------------------------
function SimilarityBar({ score }) {
  const pct = Math.round((score || 0) * 100);
  let colourClass = 'bg-green-500';
  if (pct >= 80) colourClass = 'bg-emerald-500';
  else if (pct >= 60) colourClass = 'bg-indigo-500';
  else if (pct >= 40) colourClass = 'bg-amber-500';
  else colourClass = 'bg-slate-400';

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${colourClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-10 text-right">{pct}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SemanticSearch
// ---------------------------------------------------------------------------
export default function SemanticSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (query.trim().length < 3) return;
    setLoading(true);
    setError('');
    setSearched(false);
    try {
      const res = await semanticSearch(query.trim(), 10);
      setResults(res.data?.results || []);
      setSearched(true);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Semantic search failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Semantic Search</h1>
          <p className="text-slate-500 text-sm mt-1">
            Describe an issue in natural language to find similar grievances.
          </p>
        </div>

        {/* Search form */}
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3"
        >
          <label htmlFor="search-query" className="block text-sm font-medium text-slate-700">
            Search Query
          </label>
          <textarea
            id="search-query"
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Students are experiencing frequent network outages in the hostel building…"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
            minLength={3}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Tip: Describe an issue in natural language to find similar grievances.
            </p>
            <button
              type="submit"
              disabled={loading || query.trim().length < 3}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="w-4 h-4" aria-hidden="true" />
              )}
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </form>

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

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" aria-hidden="true" />
            <span className="sr-only">Searching…</span>
          </div>
        )}

        {/* Results */}
        {!loading && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm bg-white rounded-xl border border-slate-200 shadow-sm">
            <FileText className="w-10 h-10 mb-3 text-slate-300" aria-hidden="true" />
            No results found. Try a different query.
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="text-sm text-slate-500">
              {results.length} result{results.length !== 1 ? 's' : ''} found for "{query}"
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {results.map((r) => (
                <div
                  key={r.grievanceId}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3"
                >
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {r.trackingCode && (
                      <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {r.trackingCode}
                      </span>
                    )}
                    {r.category && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_BADGE}`}>
                        {r.category}
                      </span>
                    )}
                    {r.rawSeverity && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_BADGE[r.rawSeverity] || 'bg-slate-100 text-slate-600'}`}>
                        {r.rawSeverity}
                      </span>
                    )}
                    {r.status && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[r.status] || 'bg-slate-100 text-slate-600'}`}>
                        {r.status}
                      </span>
                    )}
                  </div>

                  {/* Description excerpt */}
                  {r.description && (
                    <p className="text-sm text-slate-700 line-clamp-3">
                      {r.description.slice(0, 200)}
                      {r.description.length > 200 ? '…' : ''}
                    </p>
                  )}

                  {/* Similarity bar */}
                  <div>
                    <p className="text-xs text-slate-500">Similarity</p>
                    <SimilarityBar score={r.score} />
                  </div>

                  {/* View button */}
                  <button
                    onClick={() => navigate(`/user/grievance/${r.grievanceId}`)}
                    className="w-full py-2 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    View Grievance
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
