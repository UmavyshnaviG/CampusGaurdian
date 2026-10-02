import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyGrievances } from '../../services/grievanceService';
import UserLayout from '../../components/layouts/UserLayout';

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------
const SEVERITY_CLASSES = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

const STATUS_CLASSES = {
  Submitted: 'bg-blue-100 text-blue-700',
  'Under Review': 'bg-purple-100 text-purple-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-slate-100 text-slate-600',
  Rejected: 'bg-red-100 text-red-700',
};

function Badge({ text, classes }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${classes}`}>
      {text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MyGrievances() {
  const navigate = useNavigate();
  const [grievances, setGrievances] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const LIMIT = 10;

  const fetchGrievances = useCallback(async (p) => {
    setLoading(true);
    setError('');
    try {
      const result = await getMyGrievances(p, LIMIT);
      setGrievances(result.data.grievances);
      setTotal(result.data.total);
      setPages(result.data.pages);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load grievances.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrievances(page);
  }, [page, fetchGrievances]);

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/user/dashboard')}
              className="text-sm text-blue-600 hover:underline mb-1 inline-flex items-center gap-1"
            >
              ← Dashboard
            </button>
            <h1 className="text-2xl font-bold text-slate-800">My Grievances</h1>
            {!loading && (
              <p className="text-sm text-slate-500 mt-0.5">{total} total submission{total !== 1 ? 's' : ''}</p>
            )}
          </div>
          <Link
            to="/user/submit-grievance"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
          >
            + New Grievance
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : grievances.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-3-3v6M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No grievances yet</h3>
            <p className="text-slate-500 text-sm mb-4">You haven't submitted any grievances yet.</p>
            <Link
              to="/user/submit-grievance"
              className="inline-block px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
            >
              Submit Your First Grievance
            </Link>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                      Tracking Code
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                      Category
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                      Severity
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                      Date
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {grievances.map((g) => (
                    <tr key={g._id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono text-xs text-blue-700 font-semibold">
                        {g.trackingCode}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{g.category}</td>
                      <td className="px-4 py-3">
                        <Badge
                          text={g.rawSeverity}
                          classes={SEVERITY_CLASSES[g.rawSeverity] || 'bg-slate-100 text-slate-600'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          text={g.status}
                          classes={STATUS_CLASSES[g.status] || 'bg-slate-100 text-slate-600'}
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(g.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/user/grievance/${g._id}`}
                          className="text-blue-600 hover:underline text-xs font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-slate-500">
                  Page {page} of {pages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    disabled={page === pages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </UserLayout>
  );
}
