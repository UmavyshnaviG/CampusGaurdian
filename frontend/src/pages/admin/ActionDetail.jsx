import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Mail,
  Info,
  ClipboardCopy,
  Download,
  Users,
  Calendar,
  FileText,
  Zap,
  Clock,
} from 'lucide-react';
import {
  getActionById,
  approveAction,
  rejectAction,
  updateActionStatus,
} from '../../services/actionService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_STEPS = [
  'Recommended',
  'Pending Approval',
  'Approved',
  'Sent',
  'Acknowledged',
  'In Progress',
  'Resolved',
];

const STATUS_BADGE_STYLES = {
  'Recommended':        'bg-blue-100 text-blue-700',
  'Pending Approval':   'bg-amber-100 text-amber-700',
  'Saved Draft':        'bg-slate-100 text-slate-600',
  'Approved':           'bg-emerald-100 text-emerald-700',
  'Modified Approved':  'bg-teal-100 text-teal-700',
  'Sent':               'bg-cyan-100 text-cyan-700',
  'Acknowledged':       'bg-purple-100 text-purple-700',
  'In Progress':        'bg-indigo-100 text-indigo-700',
  'Resolved':           'bg-green-100 text-green-700',
  'Rejected':           'bg-red-100 text-red-700',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status) {
  const cls = STATUS_BADGE_STYLES[status] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

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

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
function Section({ title, icon, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 ${className}`}>
      <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirmation dialog
// ---------------------------------------------------------------------------
function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel, confirmClass, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-base font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-4">{message}</p>
        {children}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-sm text-white font-medium transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status timeline stepper
// ---------------------------------------------------------------------------
function StatusTimeline({ currentStatus }) {
  const isRejected = currentStatus === 'Rejected';
  const currentIndex = STATUS_STEPS.indexOf(currentStatus);

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-0 min-w-max">
        {STATUS_STEPS.map((step, idx) => {
          const isCompleted = !isRejected && idx < currentIndex;
          const isActive    = !isRejected && idx === currentIndex;
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white border-slate-300 text-slate-400'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <p className={`text-xs mt-1 whitespace-nowrap max-w-[80px] text-center leading-tight ${
                  isActive ? 'text-indigo-700 font-semibold' :
                  isCompleted ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {step}
                </p>
              </div>
              {idx < STATUS_STEPS.length - 1 && (
                <div className={`h-0.5 w-10 mx-1 mt-[-14px] ${
                  isCompleted ? 'bg-emerald-400' : 'bg-slate-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
        {isRejected && (
          <div className="ml-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-semibold text-red-600">Rejected</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionDetail
// ---------------------------------------------------------------------------
export default function ActionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [action, setAction]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Draft editing
  const [editDraft, setEditDraft]   = useState(false);
  const [draftBody, setDraftBody]   = useState('');
  const [draftSubject, setDraftSubject] = useState('');

  // Dialogs
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject]   = useState(false);
  const [approveComments, setApproveComments] = useState('');
  const [rejectReason, setRejectReason]       = useState('');

  const loadAction = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getActionById(id);
      const act = res.data?.action || null;
      setAction(act);
      if (act?.emailDraft) {
        setDraftBody(act.emailDraft.body || '');
        setDraftSubject(act.emailDraft.subject || '');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load action.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAction(); }, [loadAction]);

  // ---- Approve ----
  async function handleApprove() {
    setActionLoading(true);
    setActionError('');
    try {
      await approveAction(action._id, approveComments);
      setShowApprove(false);
      await loadAction();
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Approval failed.');
    } finally {
      setActionLoading(false);
    }
  }

  // ---- Reject ----
  async function handleReject() {
    setActionLoading(true);
    setActionError('');
    try {
      await rejectAction(action._id, rejectReason);
      setShowReject(false);
      await loadAction();
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Rejection failed.');
    } finally {
      setActionLoading(false);
    }
  }

  // ---- Copy to clipboard ----
  function copyDraft() {
    const text = `Subject: ${draftSubject}\n\n${draftBody}`;
    navigator.clipboard.writeText(text).catch(() => {});
  }

  // ---- Download as .txt ----
  function downloadDraft() {
    const text = `Subject: ${draftSubject}\n\n${draftBody}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${action?.actionNumber || 'action'}-draft.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- Loading / error states ----
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !action) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/admin/action-center')}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Action Center
          </button>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error || 'Action not found.'}
          </div>
        </div>
      </div>
    );
  }

  const pattern        = action.patternId || {};
  const recommendation = action.originalRecommendation || {};
  const modified       = action.modifiedRecommendation || null;
  const displayRec     = modified || recommendation;
  const emailDraft     = action.emailDraft || {};
  const isSmtpMissing  = emailDraft.deliveryMethod === 'draft_only';
  const canApprove     = ['Pending Approval', 'Saved Draft'].includes(action.approvalStatus);
  const canReject      = !['Resolved', 'Rejected'].includes(action.approvalStatus);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => navigate('/admin/patterns')} className="hover:text-slate-800">
            Patterns
          </button>
          <ChevronRightInline />
          <button
            onClick={() => navigate(`/admin/patterns/${typeof pattern === 'object' ? pattern._id : pattern}`)}
            className="hover:text-slate-800 truncate max-w-[160px]"
          >
            {typeof pattern === 'object' ? (pattern.title || 'Pattern') : 'Pattern'}
          </button>
          <ChevronRightInline />
          <span className="text-slate-700 font-medium">{action.actionNumber}</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {action.actionNumber}
                </span>
                {statusBadge(action.approvalStatus)}
              </div>
              <h1 className="text-xl font-bold text-slate-800 mt-2">{action.actionTitle}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                {action.recommendedDepartment && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {action.recommendedDepartment}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Created {formatDate(action.createdAt)}
                </span>
                {action.approvalDate && (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {action.approvalStatus} {formatDate(action.approvalDate)}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {canApprove && (
                <button
                  onClick={() => setShowApprove(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
              )}
              {canReject && (
                <button
                  onClick={() => setShowReject(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action error */}
        {actionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {actionError}
          </div>
        )}

        {/* Status timeline */}
        <Section title="Status Timeline" icon={<Clock className="w-4 h-4 text-indigo-500" />}>
          <StatusTimeline currentStatus={action.actionStatus} />
        </Section>

        {/* Pattern summary */}
        {typeof pattern === 'object' && pattern.title && (
          <Section title="Pattern Summary" icon={<FileText className="w-4 h-4 text-amber-500" />}>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-slate-800">{pattern.title}</p>
              {pattern.category && (
                <p className="text-xs text-slate-500">Category: {pattern.category}</p>
              )}
              {pattern.reportCount !== undefined && (
                <p className="text-xs text-slate-500">
                  {pattern.reportCount} report(s)
                  {pattern.primaryLocation ? ` · ${pattern.primaryLocation}` : ''}
                </p>
              )}
              {pattern._id && (
                <button
                  onClick={() => navigate(`/admin/patterns/${pattern._id}`)}
                  className="self-start text-xs text-indigo-600 hover:underline mt-1"
                >
                  View full pattern →
                </button>
              )}
            </div>
          </Section>
        )}

        {/* Recommendation card */}
        <Section title="Recommendation" icon={<Zap className="w-4 h-4 text-green-500" />}>
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs mb-4">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            All findings are based on available data and require human review before action.
          </div>

          {modified && (
            <div className="mb-3 p-2 bg-teal-50 border border-teal-200 rounded text-teal-700 text-xs">
              This recommendation was modified during approval.
            </div>
          )}

          {displayRec.problem && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Problem</p>
              <p className="text-sm text-slate-700">{displayRec.problem}</p>
            </div>
          )}

          {displayRec.observedPattern && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Observed Pattern</p>
              <p className="text-sm text-slate-700">{displayRec.observedPattern}</p>
            </div>
          )}

          {Array.isArray(displayRec.evidence) && displayRec.evidence.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Evidence</p>
              <ul className="space-y-1">
                {displayRec.evidence.map((ev, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-1 w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0" />
                    {ev}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(displayRec.possibleContributingFactors) && displayRec.possibleContributingFactors.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Possible Contributing Factors</p>
              <ul className="space-y-1">
                {displayRec.possibleContributingFactors.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-1 w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {displayRec.suggestedAction && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Suggested Action</p>
              <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                {displayRec.suggestedAction}
              </p>
            </div>
          )}

          {displayRec.confidence !== undefined && (
            <p className="text-xs text-slate-400">
              Recommendation confidence: {Math.round(displayRec.confidence * 100)}%
            </p>
          )}
        </Section>

        {/* Email draft card */}
        <Section title="Email Draft" icon={<Mail className="w-4 h-4 text-blue-500" />}>
          {isSmtpMissing && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm mb-4">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold">Email delivery not configured.</span>{' '}
                You can copy or download this draft for manual sending.
                SMTP must be configured in the server environment to enable direct email delivery.
              </div>
            </div>
          )}

          <div className="mb-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Subject
            </label>
            {editDraft ? (
              <input
                type="text"
                value={draftSubject}
                onChange={(e) => setDraftSubject(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            ) : (
              <p className="text-sm text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
                {emailDraft.subject || '—'}
              </p>
            )}
          </div>

          <div className="mb-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Body
            </label>
            {editDraft ? (
              <textarea
                rows={16}
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono resize-y"
              />
            ) : (
              <pre className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap font-sans overflow-x-auto">
                {emailDraft.body || '—'}
              </pre>
            )}
          </div>

          {emailDraft.disclaimer && (
            <p className="text-xs text-slate-400 italic mb-3">{emailDraft.disclaimer}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setEditDraft(!editDraft)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
            >
              <FileText className="w-4 h-4" />
              {editDraft ? 'Done Editing' : 'Edit Draft'}
            </button>
            <button
              onClick={copyDraft}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
            >
              <ClipboardCopy className="w-4 h-4" />
              Copy to Clipboard
            </button>
            <button
              onClick={downloadDraft}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
            >
              <Download className="w-4 h-4" />
              Download as .txt
            </button>
          </div>
        </Section>

        {/* Audit trail / notes */}
        {action.notes && action.notes.length > 0 && (
          <Section title="Audit Trail" icon={<Clock className="w-4 h-4 text-slate-500" />}>
            <div className="space-y-3">
              {action.notes.map((note, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-indigo-600 font-bold">{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-700">{note.text}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(note.addedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

      </div>

      {/* Approve dialog */}
      {showApprove && (
        <ConfirmDialog
          title="Approve Action"
          message="Approving this action will move it to the 'Approved' state and notify the department."
          onConfirm={handleApprove}
          onCancel={() => setShowApprove(false)}
          confirmLabel={actionLoading ? 'Approving…' : 'Confirm Approval'}
          confirmClass="bg-emerald-600 hover:bg-emerald-700"
        >
          <label className="block text-sm text-slate-600 mb-1">Comments (optional)</label>
          <textarea
            rows={3}
            value={approveComments}
            onChange={(e) => setApproveComments(e.target.value)}
            placeholder="Add any notes or comments…"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
          />
        </ConfirmDialog>
      )}

      {/* Reject dialog */}
      {showReject && (
        <ConfirmDialog
          title="Reject Action"
          message="Please provide a reason for rejecting this action."
          onConfirm={handleReject}
          onCancel={() => setShowReject(false)}
          confirmLabel={actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
          confirmClass="bg-red-600 hover:bg-red-700"
        >
          <label className="block text-sm text-slate-600 mb-1">Reason</label>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejection…"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </ConfirmDialog>
      )}
    </div>
  );
}

// Inline chevron to avoid import noise
function ChevronRightInline() {
  return <span className="text-slate-400">›</span>;
}
