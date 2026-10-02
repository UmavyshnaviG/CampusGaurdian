import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
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

const NEXT_STATUSES = ['Submitted', 'Under Review', 'In Progress', 'Resolved', 'Closed', 'Rejected'];

// ---------------------------------------------------------------------------
// SensitiveCase
// ---------------------------------------------------------------------------
export default function SensitiveCase() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [grievance, setGrievance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Identity reveal
  const [identity, setIdentity] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [revealLoading, setRevealLoading] = useState(false);
  const [revealError, setRevealError] = useState('');

  // Status update
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/grievances/${id}`);
      const g = res.data?.data?.grievance || res.data?.data || null;
      setGrievance(g);
      setNewStatus(g?.status || '');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load grievance.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRevealIdentity() {
    setRevealLoading(true);
    setRevealError('');
    try {
      const res = await api.get(`/grievances/${id}/identity`);
      setIdentity(res.data?.data?.identity || null);
      setShowConfirm(false);
    } catch (err) {
      setRevealError(err.response?.data?.message || err.message || 'Failed to reveal identity.');
    } finally {
      setRevealLoading(false);
    }
  }

  async function handleStatusUpdate(e) {
    e.preventDefault();
    if (!newStatus) return;
    setUpdatingStatus(true);
    setStatusError('');
    setStatusSuccess('');
    try {
      await api.patch(`/grievances/${id}/status`, { status: newStatus, note: statusNote });
      setStatusSuccess('Status updated successfully.');
      setStatusNote('');
      await load();
    } catch (err) {
      setStatusError(err.response?.data?.message || err.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  }

  // ---- Loading / Error ----
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-400 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (error || !grievance) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/safeguarding/portal')}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to Portal
          </button>
          <div className="p-4 bg-red-900/40 border border-red-700/50 rounded-xl text-red-300 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            {error || 'Grievance not found.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top bar */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/safeguarding/portal')}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
              aria-label="Back to portal"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to Portal
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" aria-hidden="true" />
            <span className="font-mono text-xs text-red-400">{grievance.trackingCode}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Grievance details */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-white">
                {grievance.category} Grievance
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Submitted: {formatDate(grievance.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {grievance.rawSeverity && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_BADGE[grievance.rawSeverity] || 'bg-slate-700 text-slate-300'}`}>
                  {grievance.rawSeverity}
                </span>
              )}
              {grievance.status && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[grievance.status] || 'bg-slate-700 text-slate-300'}`}>
                  {grievance.status}
                </span>
              )}
            </div>
          </div>

          {grievance.description && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Description</p>
              <p className="text-sm text-slate-200 leading-relaxed">{grievance.description}</p>
            </div>
          )}

          {Array.isArray(grievance.statusHistory) && grievance.statusHistory.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Status History</p>
              <div className="space-y-2">
                {grievance.statusHistory.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="font-mono">{formatDate(h.changedAt)}</span>
                    <span className="text-slate-300">{h.status}</span>
                    {h.note && <span className="text-slate-500 italic">— {h.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Identity reveal */}
        {grievance.isAnonymousSensitive && (
          <div className="bg-slate-800 border border-red-700/50 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-red-400" aria-hidden="true" />
              Reveal Submitter Identity
            </h2>

            {!identity ? (
              <>
                {revealError && (
                  <div className="p-3 bg-red-900/40 border border-red-700/50 rounded text-red-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                    {revealError}
                  </div>
                )}
                {!showConfirm ? (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    <Eye className="w-4 h-4" aria-hidden="true" />
                    Reveal Identity
                  </button>
                ) : (
                  <div className="border border-red-700/50 rounded-lg p-4 space-y-3">
                    <p className="text-sm text-red-300 font-semibold">
                      Confirm identity reveal?
                    </p>
                    <p className="text-xs text-slate-400">
                      This action is logged. The identity should be accessed only for legitimate investigative purposes.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowConfirm(false)}
                        className="flex-1 px-3 py-2 text-sm text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRevealIdentity}
                        disabled={revealLoading}
                        className="flex-1 px-3 py-2 text-sm bg-red-700 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors font-medium"
                      >
                        {revealLoading ? 'Revealing…' : 'Confirm Reveal'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="border border-red-700/50 bg-red-900/20 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <EyeOff className="w-4 h-4 text-red-400" aria-hidden="true" />
                  <p className="text-xs font-semibold text-red-300 uppercase">Identity Revealed</p>
                </div>
                <p className="text-sm text-white">
                  <span className="text-slate-400">Name: </span>
                  {identity.fullName || '—'}
                </p>
                <p className="text-sm text-white">
                  <span className="text-slate-400">Email: </span>
                  {identity.email || '—'}
                </p>
                <p className="text-xs text-red-400 mt-2">
                  Identity revealed for investigative purposes only. This action is logged.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Status update */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">Update Status</h2>

          {statusSuccess && (
            <div className="p-3 bg-green-900/30 border border-green-700/50 rounded text-green-300 text-xs">
              {statusSuccess}
            </div>
          )}
          {statusError && (
            <div className="p-3 bg-red-900/40 border border-red-700/50 rounded text-red-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              {statusError}
            </div>
          )}

          <form onSubmit={handleStatusUpdate} className="flex flex-col sm:flex-row gap-3">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="text-sm border border-slate-600 bg-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Select new status"
            >
              {NEXT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              type="text"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Optional note…"
              className="flex-1 text-sm border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              type="submit"
              disabled={updatingStatus}
              className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {updatingStatus ? 'Updating…' : 'Update'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
