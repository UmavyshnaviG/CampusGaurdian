import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyGrievances } from '../../services/grievanceService';
import { io as socketIOClient } from 'socket.io-client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STATUS_CLASSES = {
  Submitted: 'bg-blue-100 text-blue-700',
  'Under Review': 'bg-purple-100 text-purple-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-slate-100 text-slate-600',
  Rejected: 'bg-red-100 text-red-700',
};

const SEVERITY_CLASSES = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-xl p-5 shadow-sm ${color}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-80">{label}</p>
    </div>
  );
}

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
export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [grievances, setGrievances] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const PENDING_STATUSES = new Set(['Submitted', 'Under Review', 'In Progress']);

  const loadGrievances = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMyGrievances(1, 50);
      const all = result.data.grievances || [];
      setGrievances(all.slice(0, 5)); // show only 5 most recent
      setStats({
        total: result.data.total,
        pending: all.filter((g) => PENDING_STATUSES.has(g.status)).length,
        resolved: all.filter((g) => g.status === 'Resolved').length,
      });
    } catch {
      // silent fail on dashboard
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadGrievances();
  }, [loadGrievances]);

  // Socket.IO: listen for real-time status updates
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = socketIOClient(socketUrl, { transports: ['websocket', 'polling'] });

    socket.on('grievance:statusUpdate', () => {
      // Re-fetch to reflect updated status
      loadGrievances();
      setToast('A grievance status has been updated.');
      setTimeout(() => setToast(''), 4000);
    });

    return () => {
      socket.disconnect();
    };
  }, [loadGrievances]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-100 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">CG</span>
          </div>
          <span className="font-semibold text-slate-800 text-sm">Campus Guardian 360</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/user/my-grievances" className="text-sm text-slate-600 hover:text-blue-600 transition">
            My Grievances
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-red-500 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        {/* Welcome */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Welcome, {user?.name?.split(' ')[0] || 'User'}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5 capitalize">
              {user?.role} {user?.department ? `· ${user.department}` : ''}
            </p>
          </div>
          <Link
            to="/user/submit-grievance"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Submit New Grievance
          </Link>
        </div>

        {/* Toast */}
        {toast && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            {toast}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Submitted" value={stats.total} color="bg-white text-slate-800" />
          <StatCard label="Pending" value={stats.pending} color="bg-amber-50 text-amber-800" />
          <StatCard label="Resolved" value={stats.resolved} color="bg-green-50 text-green-800" />
        </div>

        {/* Recent grievances */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Recent Grievances</h2>
            <Link to="/user/my-grievances" className="text-sm text-blue-600 hover:underline">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : grievances.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm mb-3">No grievances submitted yet.</p>
              <Link
                to="/user/submit-grievance"
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Submit your first grievance →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {grievances.map((g) => (
                <Link
                  key={g._id}
                  to={`/user/grievance/${g._id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition border border-slate-50 hover:border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-xs font-mono text-blue-700 font-semibold">{g.trackingCode}</p>
                      <p className="text-sm text-slate-700 mt-0.5">{g.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      text={g.rawSeverity}
                      classes={SEVERITY_CLASSES[g.rawSeverity] || 'bg-slate-100 text-slate-600'}
                    />
                    <Badge
                      text={g.status}
                      classes={STATUS_CLASSES[g.status] || 'bg-slate-100 text-slate-600'}
                    />
                    <span className="text-slate-300 text-sm">›</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/user/submit-grievance"
            className="bg-blue-600 text-white rounded-xl p-5 hover:bg-blue-700 transition group"
          >
            <div className="text-lg font-semibold mb-1">Submit a Grievance</div>
            <p className="text-blue-200 text-sm">Report a new issue or complaint</p>
          </Link>
          <Link
            to="/user/my-grievances"
            className="bg-white border border-slate-200 rounded-xl p-5 hover:bg-slate-50 transition"
          >
            <div className="text-lg font-semibold text-slate-800 mb-1">View All Grievances</div>
            <p className="text-slate-500 text-sm">Track status of your submissions</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
