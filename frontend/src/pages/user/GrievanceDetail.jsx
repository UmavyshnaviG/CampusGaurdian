import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGrievanceById } from '../../services/grievanceService';
import UserLayout from '../../components/layouts/UserLayout';

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

function Badge({ text, classes }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${classes}`}>
      {text}
    </span>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function GrievanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [grievance, setGrievance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const result = await getGrievanceById(id);
        setGrievance(result.data.grievance);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load grievance.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </UserLayout>
    );
  }

  if (error || !grievance) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error || 'Grievance not found.'}</p>
            <button
              onClick={() => navigate('/user/my-grievances')}
              className="text-blue-600 hover:underline text-sm"
            >
              ← Back to My Grievances
            </button>
          </div>
        </div>
      </UserLayout>
    );
  }

  const ai = grievance.aiMetadata || {};
  const hasAI = grievance.aiProcessingStatus === 'completed' && ai.topic;

  return (
    <UserLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => navigate('/user/my-grievances')}
            className="text-sm text-blue-600 hover:underline mb-2 inline-flex items-center gap-1"
          >
            ← My Grievances
          </button>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-800">Grievance Detail</h1>
            <Badge
              text={grievance.status}
              classes={STATUS_CLASSES[grievance.status] || 'bg-slate-100 text-slate-600'}
            />
          </div>
          <p className="font-mono text-sm text-blue-700 font-semibold">{grievance.trackingCode}</p>
        </div>

        {/* Submission info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
            Submission Details
          </h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Category" value={grievance.category} />
            <div>
              <dt className="text-xs font-medium text-slate-500 mb-0.5">Severity</dt>
              <dd>
                <Badge
                  text={grievance.rawSeverity}
                  classes={SEVERITY_CLASSES[grievance.rawSeverity] || ''}
                />
              </dd>
            </div>
            <Field
              label="Submitted"
              value={new Date(grievance.createdAt).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            />
            {grievance.location && grievance.location.type !== 'Not Applicable' && (
              <>
                <Field label="Location Type" value={grievance.location.type} />
                {grievance.location.building && (
                  <Field label="Building" value={grievance.location.building} />
                )}
                {grievance.location.floor && (
                  <Field label="Floor / Room" value={grievance.location.floor} />
                )}
              </>
            )}
            {grievance.anonymous && (
              <div className="col-span-2 sm:col-span-3">
                <span className="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  Submitted anonymously
                </span>
              </div>
            )}
          </dl>
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Description
          </h2>
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
            {grievance.description}
          </p>
        </div>

        {/* Attachment */}
        {grievance.attachmentUrl && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Attachment
            </h2>
            <a
              href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${grievance.attachmentUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {grievance.attachmentOriginalName || 'Download attachment'}
            </a>
          </div>
        )}

        {/* AI Metadata */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
            AI Analysis
          </h2>
          {grievance.aiProcessingStatus === 'pending' || grievance.aiProcessingStatus === 'processing' ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              AI analysis pending — check back shortly.
            </div>
          ) : grievance.aiProcessingStatus === 'failed' ? (
            <p className="text-sm text-slate-400">AI analysis could not be completed for this grievance.</p>
          ) : hasAI ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {ai.topic && <Field label="Topic" value={ai.topic} />}
              {ai.subTopic && <Field label="Sub-topic" value={ai.subTopic} />}
              {ai.issueType && <Field label="Issue Type" value={ai.issueType} />}
              {ai.sentiment && <Field label="Sentiment" value={ai.sentiment} />}
              {typeof ai.urgency === 'number' && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 mb-1">Urgency Score</dt>
                  <dd className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.round(ai.urgency * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-700 w-8">{Math.round(ai.urgency * 100)}%</span>
                  </dd>
                </div>
              )}
              {ai.keywords && ai.keywords.length > 0 && (
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-xs font-medium text-slate-500 mb-1">Keywords</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {ai.keywords.map((kw) => (
                      <span key={kw} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        {kw}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              {ai.priorityRecommendation && (
                <div className="col-span-2 sm:col-span-3">
                  <Field label="AI Priority Recommendation" value={ai.priorityRecommendation} />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">AI analysis not yet available.</p>
          )}
        </div>

        {/* Status Timeline */}
        {grievance.statusHistory && grievance.statusHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Status History
            </h2>
            <ol className="relative border-l border-slate-200 ml-2 space-y-4">
              {grievance.statusHistory.map((entry, i) => (
                <li key={i} className="ml-4">
                  <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-1.5 mt-1" />
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge
                      text={entry.status}
                      classes={STATUS_CLASSES[entry.status] || 'bg-slate-100 text-slate-600'}
                    />
                    <time className="text-xs text-slate-400">
                      {new Date(entry.changedAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </time>
                  </div>
                  {entry.note && (
                    <p className="text-sm text-slate-600">{entry.note}</p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
