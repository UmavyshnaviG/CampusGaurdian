import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'staff', label: 'Staff' },
];

const INITIAL_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'student',
  department: '',
  year: '',
  designation: '',
  hostel: '',
};

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear per-field error on change
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) setServerError('');
  }

  function validate() {
    const errors = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }
    if (formData.role === 'student' && formData.year) {
      const y = Number(formData.year);
      if (!Number.isInteger(y) || y < 1 || y > 6) {
        errors.year = 'Year must be a number between 1 and 6.';
      }
    }
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        department: formData.department.trim() || undefined,
      };
      if (formData.role === 'student') {
        if (formData.year) payload.year = Number(formData.year);
        if (formData.hostel.trim()) payload.hostel = formData.hostel.trim();
      }
      if (formData.role === 'faculty' || formData.role === 'staff') {
        if (formData.designation.trim()) payload.designation = formData.designation.trim();
      }

      await register(payload);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Registration failed. Please try again.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl shadow-md p-10 flex flex-col items-center gap-4 max-w-sm w-full text-center">
          <CheckCircle className="w-12 h-12 text-green-500" aria-hidden="true" />
          <h2 className="text-xl font-bold text-slate-800">Account created!</h2>
          <p className="text-slate-500 text-sm">Redirecting you to the login page…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg">
        {/* Branding */}
        <div className="flex items-center gap-2 mb-8">
          <ShieldCheck className="w-7 h-7 text-blue-700" aria-hidden="true" />
          <p className="text-lg font-bold text-slate-800">Campus Guardian 360</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Create account</h1>
          <p className="text-slate-500 mb-6 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>

          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-5">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Jane Doe"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                />
                <FieldError message={fieldErrors.name} />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email address <span className="text-red-500">*</span>
                </label>
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="you@example.com"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.email}
                />
                <FieldError message={fieldErrors.email} />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="reg-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Minimum 8 characters"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.password}
                />
                <FieldError message={fieldErrors.password} />
              </div>

              {/* Role */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  aria-required="true"
                >
                  {ROLE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Department – all roles */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-slate-700 mb-1">
                  Department
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="e.g. Computer Science"
                />
              </div>

              {/* Year – student only */}
              {formData.role === 'student' && (
                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-slate-700 mb-1">
                    Year of study
                  </label>
                  <input
                    id="year"
                    name="year"
                    type="number"
                    min={1}
                    max={6}
                    value={formData.year}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="1 – 6"
                    aria-invalid={!!fieldErrors.year}
                  />
                  <FieldError message={fieldErrors.year} />
                </div>
              )}

              {/* Hostel – student only */}
              {formData.role === 'student' && (
                <div>
                  <label htmlFor="hostel" className="block text-sm font-medium text-slate-700 mb-1">
                    Hostel
                  </label>
                  <input
                    id="hostel"
                    name="hostel"
                    type="text"
                    value={formData.hostel}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="e.g. Block A"
                  />
                </div>
              )}

              {/* Designation – faculty / staff */}
              {(formData.role === 'faculty' || formData.role === 'staff') && (
                <div>
                  <label htmlFor="designation" className="block text-sm font-medium text-slate-700 mb-1">
                    Designation
                  </label>
                  <input
                    id="designation"
                    name="designation"
                    type="text"
                    value={formData.designation}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="e.g. Associate Professor"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-7 w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold rounded-lg py-2.5 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  Creating account…
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Register;
