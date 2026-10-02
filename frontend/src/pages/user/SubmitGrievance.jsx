import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { submitGrievance } from '../../services/grievanceService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CATEGORIES = [
  'Academic',
  'Infrastructure',
  'Network/IT',
  'Hostel',
  'Transport',
  'Electricity',
  'Water/Sanitation',
  'Library',
  'Canteen',
  'Maintenance',
  'Harassment',
  'Bullying',
  'Ragging',
  'Discrimination',
  'Safety',
  'Other',
];

const SENSITIVE_CATEGORIES = new Set([
  'Harassment',
  'Bullying',
  'Ragging',
  'Discrimination',
  'Safety',
]);

const SEVERITIES = [
  { value: 'Low', label: 'Low', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'Medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'High', label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'Critical', label: 'Critical', color: 'bg-red-100 text-red-800 border-red-300' },
];

const LOCATION_TYPES = [
  'Not Applicable',
  'Campus (General)',
  'Building',
  'Classroom',
  'Laboratory',
  'Hostel',
  'Canteen',
  'Library',
  'Transport Area',
  'Other',
];

const MAX_DESC = 2000;
const MIN_DESC = 10;
const MAX_FILE_MB = 10;
const ALLOWED_EXTS = 'jpg, jpeg, png, gif, pdf, doc, docx';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SubmitGrievance() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [category, setCategory] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [locationType, setLocationType] = useState('Not Applicable');
  const [building, setBuilding] = useState('');
  const [floorRoom, setFloorRoom] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(null); // holds { trackingCode }

  const fileRef = useRef(null);

  const showAnonymous = SENSITIVE_CATEGORIES.has(category);

  // Reset anonymous when category changes to non-sensitive
  function handleCategoryChange(cat) {
    setCategory(cat);
    if (!SENSITIVE_CATEGORIES.has(cat)) setAnonymous(false);
  }

  function handleFileChange(e) {
    const f = e.target.files[0];
    setFileError('');
    if (!f) { setFile(null); return; }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(`File must be smaller than ${MAX_FILE_MB} MB.`);
      setFile(null);
      e.target.value = '';
      return;
    }
    setFile(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!category) { setError('Please select a category.'); return; }
    if (!severity) { setError('Please select a severity level.'); return; }
    if (description.length < MIN_DESC) {
      setError(`Description must be at least ${MIN_DESC} characters.`);
      return;
    }

    const formData = new FormData();
    formData.append('category', category);
    formData.append('description', description);
    formData.append('rawSeverity', severity);
    formData.append('anonymous', anonymous ? 'true' : 'false');
    formData.append(
      'location',
      JSON.stringify({
        type: locationType,
        building,
        floor: floorRoom,
      }),
    );
    if (file) formData.append('attachment', file);

    setSubmitting(true);
    try {
      const result = await submitGrievance(formData);
      setSubmitted({ trackingCode: result.data.grievance.trackingCode });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.msg ||
        'Submission failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Success screen ----------
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Grievance Submitted</h2>
          <p className="text-slate-500 mb-4">Your grievance has been received and is being processed.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-600 font-medium mb-1">Your Tracking Code</p>
            <p className="text-2xl font-mono font-bold text-blue-800">{submitted.trackingCode}</p>
            <p className="text-xs text-blue-500 mt-1">Save this code to track your grievance status.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setSubmitted(null);
                setCategory('');
                setAnonymous(false);
                setLocationType('Not Applicable');
                setBuilding('');
                setFloorRoom('');
                setDescription('');
                setSeverity('');
                setFile(null);
                if (fileRef.current) fileRef.current.value = '';
              }}
              className="px-5 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition"
            >
              Submit Another
            </button>
            <button
              onClick={() => navigate('/user/my-grievances')}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition"
            >
              View My Grievances
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Form ----------
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/user/dashboard')}
            className="text-sm text-blue-600 hover:underline mb-2 inline-flex items-center gap-1"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Submit Grievance</h1>
          <p className="text-slate-500 text-sm mt-1">
            All submissions are treated with confidentiality and reviewed by the appropriate team.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Auto-populated info */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Your Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Name</label>
                <p className="text-slate-800 font-medium">{user?.name || '—'}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Role</label>
                <p className="text-slate-800 font-medium capitalize">{user?.role || '—'}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Department</label>
                <p className="text-slate-800 font-medium">{user?.department || '—'}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  {user?.role === 'student' ? 'Year' : 'Designation'}
                </label>
                <p className="text-slate-800 font-medium">
                  {user?.role === 'student'
                    ? user?.year ? `Year ${user.year}` : '—'
                    : user?.designation || '—'}
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Category */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Category <span className="text-red-500">*</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-3 py-2 text-sm rounded-lg border font-medium transition ${
                    category === cat
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Anonymous option */}
            {showAnonymous && (
              <div className="mt-4 border border-amber-200 bg-amber-50 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-amber-800 font-medium">
                    Submit anonymously (your identity will be protected)
                  </span>
                </label>
                <p className="text-xs text-amber-700 mt-2 ml-7">
                  Note: Privacy-preserving anonymity — aggregate patterns may still use this report.
                  Your identity will not be visible to regular administrators.
                </p>
              </div>
            )}
          </section>

          {/* Section 3: Location */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Location
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Location Type
                </label>
                <select
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LOCATION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {locationType !== 'Not Applicable' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Building / Block
                    </label>
                    <input
                      type="text"
                      value={building}
                      onChange={(e) => setBuilding(e.target.value)}
                      placeholder="e.g. Block A, Main Building"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Floor / Room
                    </label>
                    <input
                      type="text"
                      value={floorRoom}
                      onChange={(e) => setFloorRoom(e.target.value)}
                      placeholder="e.g. 2nd Floor, Room 204"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 4: Description */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Description <span className="text-red-500">*</span>
            </h2>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Describe the issue in detail. Include when it started, how often it occurs, and any steps already taken."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              maxLength={MAX_DESC}
            />
            <div className="flex justify-between mt-1">
              <span className={`text-xs ${description.length < MIN_DESC ? 'text-red-400' : 'text-slate-400'}`}>
                Minimum {MIN_DESC} characters
              </span>
              <span className={`text-xs ${description.length >= MAX_DESC ? 'text-red-500' : 'text-slate-400'}`}>
                {description.length} / {MAX_DESC}
              </span>
            </div>
          </section>

          {/* Section 5: Severity */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Severity <span className="text-red-500">*</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SEVERITIES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSeverity(s.value)}
                  className={`py-3 rounded-lg border font-semibold text-sm transition ${
                    severity === s.value
                      ? s.color + ' border-2'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          {/* Section 6: Attachment */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Evidence / Attachment
              <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span>
            </h2>
            <label className="block">
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-blue-400 cursor-pointer transition">
                <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-sm text-slate-600">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Allowed: {ALLOWED_EXTS} · Max {MAX_FILE_MB} MB
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            {fileError && <p className="text-xs text-red-500 mt-2">{fileError}</p>}
            {file && (
              <button
                type="button"
                onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                className="mt-2 text-xs text-red-500 hover:underline"
              >
                Remove file
              </button>
            )}
          </section>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/user/dashboard')}
              className="px-5 py-2.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {submitting ? 'Submitting…' : 'Submit Grievance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
