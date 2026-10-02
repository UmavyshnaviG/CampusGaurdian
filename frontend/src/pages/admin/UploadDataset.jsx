import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Loader2,
  Database,
  Table,
  BarChart2,
  AlertCircle,
} from 'lucide-react';
import { inspectDataset, confirmMapping } from '../../services/uploadService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TARGET_FIELDS = [
  'description', 'category', 'severity', 'location', 'submittedBy',
  'department', 'year', 'userType', 'anonymous', 'status',
  'createdAt', 'sentiment', 'outcome', '(ignore)',
];

const STEP = { DROP: 1, SCHEMA: 2, PROGRESS: 3, DONE: 4 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ConfidenceBadge({ level, score }) {
  const pct = Math.round((score || 0) * 100);
  const colour =
    level === 'high_confidence'
      ? 'bg-green-100 text-green-800'
      : level === 'needs_review'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-red-100 text-red-800';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colour}`}>
      {pct}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function UploadDataset() {
  const [step, setStep] = useState(STEP.DROP);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Schema step
  const [schemaData, setSchemaData] = useState(null);  // AgentResponse.data from AI
  const [filepath, setFilepath] = useState('');
  const [mappings, setMappings] = useState({});         // { colName: targetField }

  // Progress step
  const [progress, setProgress] = useState({ processed: 0, total: 0, percentage: 0 });
  const [importResult, setImportResult] = useState(null);

  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  // ------------------------------------------------------------------
  // Socket.IO: listen for upload:progress events
  // ------------------------------------------------------------------
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    socketRef.current = io(SOCKET_URL, { transports: ['websocket'], autoConnect: false });
    socketRef.current.connect();

    socketRef.current.on('upload:progress', (data) => {
      setProgress(data);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // ------------------------------------------------------------------
  // File drop / select logic
  // ------------------------------------------------------------------
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  function acceptFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx'].includes(ext)) {
      setError('Only .csv and .xlsx files are supported.');
      return;
    }
    setError('');
    setSelectedFile(file);
  }

  // ------------------------------------------------------------------
  // Step 1 → Step 2: inspect dataset
  // ------------------------------------------------------------------
  async function handleInspect() {
    if (!selectedFile) return;
    setLoading(true);
    setError('');
    try {
      const res = await inspectDataset(selectedFile);
      if (!res.success) throw new Error(res.message || 'Inspection failed.');

      const schema = res.data.schema;
      setSchemaData(schema);
      setFilepath(res.data.filepath);

      // Pre-populate mappings from AI suggestions
      const autoMappings = {};
      (schema.columns || []).forEach((col) => {
        autoMappings[col.name] = col.suggestedMapping || '(ignore)';
      });
      setMappings(autoMappings);
      setStep(STEP.SCHEMA);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to inspect dataset.');
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Step 2 → Step 3: confirm mappings and process
  // ------------------------------------------------------------------
  async function handleConfirm() {
    setLoading(true);
    setError('');
    setProgress({ processed: 0, total: schemaData?.totalRows || 0, percentage: 0 });
    setStep(STEP.PROGRESS);

    try {
      // Filter out "(ignore)" mappings
      const cleaned = {};
      Object.entries(mappings).forEach(([col, target]) => {
        if (target && target !== '(ignore)') cleaned[col] = target;
      });

      const res = await confirmMapping(filepath, cleaned);
      if (!res.success) throw new Error(res.message || 'Processing failed.');

      setImportResult(res.data);
      setStep(STEP.DONE);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to process dataset.');
      setStep(STEP.SCHEMA); // revert to schema step on failure
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStep(STEP.DROP);
    setSelectedFile(null);
    setSchemaData(null);
    setFilepath('');
    setMappings({});
    setProgress({ processed: 0, total: 0, percentage: 0 });
    setImportResult(null);
    setError('');
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-600" />
            Upload Historical Dataset
          </h1>
          <p className="text-slate-500 mt-1">
            Import past grievance data for AI pattern analysis. Supported formats: CSV, XLSX.
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={step} />

        {/* Error banner */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ---- STEP 1: File Drop ---- */}
        {step === STEP.DROP && (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                dragging
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
              }`}
            >
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">
                Drag and drop a .csv or .xlsx file here
              </p>
              <p className="text-slate-400 text-sm mt-1">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && acceptFile(e.target.files[0])}
              />
            </div>

            {selectedFile && (
              <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-800">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium text-sm">{selectedFile.name}</span>
                  <span className="text-indigo-500 text-xs">({formatBytes(selectedFile.size)})</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                  className="text-indigo-400 hover:text-indigo-600"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={handleInspect}
              disabled={!selectedFile || loading}
              className="mt-6 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Inspecting…</>
              ) : (
                <><Table className="w-4 h-4" /> Inspect Dataset</>
              )}
            </button>
          </div>
        )}

        {/* ---- STEP 2: Schema Inspection ---- */}
        {step === STEP.SCHEMA && schemaData && (
          <div className="mt-6 space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard icon={<BarChart2 className="w-5 h-5 text-indigo-600" />} label="Total Rows" value={schemaData.totalRows?.toLocaleString()} />
              <SummaryCard icon={<Table className="w-5 h-5 text-blue-600" />} label="Columns" value={schemaData.totalColumns} />
              <SummaryCard icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />} label="Duplicate Rows" value={schemaData.duplicateRows} />
              <SummaryCard
                icon={<CheckCircle className="w-5 h-5 text-green-600" />}
                label="Quality Score"
                value={`${Math.round((schemaData.dataQualityScore || 0) * 100)}%`}
              />
            </div>

            {/* Column mapping table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-700">Column Mappings</h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Review AI suggestions and adjust uncertain mappings before importing.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide">
                    <tr>
                      <th className="px-5 py-3 text-left">Detected Column</th>
                      <th className="px-5 py-3 text-left">Type</th>
                      <th className="px-5 py-3 text-left">Nulls</th>
                      <th className="px-5 py-3 text-left">Suggested Mapping</th>
                      <th className="px-5 py-3 text-left">Confidence</th>
                      <th className="px-5 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(schemaData.columns || []).map((col) => (
                      <tr key={col.name} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-mono text-slate-700 text-xs">{col.name}</td>
                        <td className="px-5 py-3 text-slate-500">{col.dtype}</td>
                        <td className="px-5 py-3 text-slate-500">
                          {col.nullPct > 0 ? (
                            <span className={col.nullPct > 20 ? 'text-red-600 font-medium' : 'text-slate-500'}>
                              {col.nullPct}%
                            </span>
                          ) : (
                            <span className="text-green-600">0%</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-mono text-indigo-700 text-xs">
                            {col.suggestedMapping || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <ConfidenceBadge level={col.confidenceLevel} score={col.mappingConfidence} />
                        </td>
                        <td className="px-5 py-3">
                          <div className="relative inline-block">
                            <select
                              value={mappings[col.name] || '(ignore)'}
                              onChange={(e) =>
                                setMappings((prev) => ({ ...prev, [col.name]: e.target.value }))
                              }
                              className="appearance-none pl-2 pr-7 py-1 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                              {TARGET_FIELDS.map((f) => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-1.5 w-3 h-3 text-slate-400" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quality issues */}
            {(schemaData.qualityIssues || []).length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h3 className="font-semibold text-yellow-800 flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4" /> Data Quality Warnings
                </h3>
                <ul className="space-y-1">
                  {schemaData.qualityIssues.map((issue, i) => (
                    <li key={i} className="text-yellow-700 text-sm flex items-start gap-2">
                      <span className="mt-1">•</span> {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 text-sm"
              >
                Upload Different File
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                ) : (
                  <><Database className="w-4 h-4" /> Confirm Mappings &amp; Process Dataset</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ---- STEP 3: Processing Progress ---- */}
        {step === STEP.PROGRESS && (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-700 mb-1">Importing Dataset</h2>
            <p className="text-slate-500 text-sm mb-6">
              Processing {progress.processed.toLocaleString()} of {progress.total.toLocaleString()} records…
            </p>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="text-indigo-600 font-semibold mt-2">{progress.percentage}%</p>
          </div>
        )}

        {/* ---- STEP 4: Done ---- */}
        {step === STEP.DONE && importResult && (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Dataset Processed Successfully</h2>
            <p className="text-slate-500 mb-6">
              <span className="text-green-700 font-semibold">{importResult.imported}</span> grievance(s) imported.
              {importResult.failed > 0 && (
                <span className="text-red-600"> {importResult.failed} row(s) failed.</span>
              )}
            </p>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
            >
              Upload Another Dataset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep }) {
  const steps = [
    { num: STEP.DROP, label: 'Upload File' },
    { num: STEP.SCHEMA, label: 'Review Schema' },
    { num: STEP.PROGRESS, label: 'Processing' },
    { num: STEP.DONE, label: 'Complete' },
  ];

  return (
    <div className="flex items-center gap-2 mt-4">
      {steps.map((s, i) => (
        <React.Fragment key={s.num}>
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep > s.num
                  ? 'bg-green-500 text-white'
                  : currentStep === s.num
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {currentStep > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
            </div>
            <span
              className={`text-sm ${
                currentStep === s.num ? 'text-indigo-700 font-semibold' : 'text-slate-400'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 ${currentStep > s.num ? 'bg-green-400' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
