import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  AlertTriangle,
  Loader2,
  Plus,
  X,
  RefreshCw,
  Mail,
  User,
} from 'lucide-react';
import AdminLayout from '../../components/layouts/AdminLayout';
import { getDepartments, createDepartment, updateDepartment } from '../../services/departmentService';

// ---------------------------------------------------------------------------
// Modal form
// ---------------------------------------------------------------------------
function DepartmentModal({ department, onClose, onSaved }) {
  const isEdit = Boolean(department);
  const [form, setForm] = useState({
    name: department?.name || '',
    code: department?.code || '',
    description: department?.description || '',
    contactEmail: department?.contactEmail || '',
    head: department?.head || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Department name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await updateDepartment(department._id, form);
      } else {
        await createDepartment(form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save department.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit Department' : 'Add Department'}
    >
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">
            {isEdit ? 'Edit Department' : 'Add Department'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="dept-name">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="dept-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g. Academic Affairs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="dept-code">
              Code
            </label>
            <input
              id="dept-code"
              type="text"
              name="code"
              value={form.code}
              onChange={handleChange}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g. ACAD"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="dept-desc">
              Description
            </label>
            <textarea
              id="dept-desc"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Brief description…"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="dept-email">
              Contact Email
            </label>
            <input
              id="dept-email"
              type="email"
              name="contactEmail"
              value={form.contactEmail}
              onChange={handleChange}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g. dept@campus.edu"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="dept-head">
              Head
            </label>
            <input
              id="dept-head"
              type="text"
              name="head"
              value={form.head}
              onChange={handleChange}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g. Dean of Academics"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------
export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editDepartment, setEditDepartment] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getDepartments();
      setDepartments(res.data?.departments || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditDepartment(null);
    setShowModal(true);
  }

  function openEdit(dept) {
    setEditDepartment(dept);
    setShowModal(true);
  }

  function handleModalClose() {
    setShowModal(false);
    setEditDepartment(null);
  }

  async function handleToggleActive(dept) {
    setTogglingId(dept._id);
    try {
      await updateDepartment(dept._id, { isActive: !dept.isActive });
      await load();
    } catch {
      // non-fatal
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Departments</h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage campus departments and their contact details.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              aria-label="Refresh departments"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Department
            </button>
          </div>
        </div>

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
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" aria-hidden="true" />
          </div>
        ) : departments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm bg-white rounded-xl border border-slate-200 shadow-sm">
            <Building2 className="w-12 h-12 mb-3 text-slate-300" aria-hidden="true" />
            No departments found. Add your first department.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {departments.map((dept) => (
              <div
                key={dept._id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{dept.name}</h3>
                    {dept.code && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-mono mt-1">
                        {dept.code}
                      </span>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0" aria-label={`Toggle active for ${dept.name}`}>
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={dept.isActive}
                      disabled={togglingId === dept._id}
                      onChange={() => handleToggleActive(dept)}
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-checked:bg-indigo-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-400 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                  </label>
                </div>

                {/* Details */}
                {dept.head && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    {dept.head}
                  </div>
                )}
                {dept.contactEmail && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    {dept.contactEmail}
                  </div>
                )}
                {dept.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{dept.description}</p>
                )}

                {/* Edit button */}
                <button
                  onClick={() => openEdit(dept)}
                  className="w-full py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <DepartmentModal
          department={editDepartment}
          onClose={handleModalClose}
          onSaved={() => { handleModalClose(); load(); }}
        />
      )}
    </AdminLayout>
  );
}
