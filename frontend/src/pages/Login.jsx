import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_DESCRIPTIONS = [
  { role: 'Student', description: 'Track grievances, submit feedback, monitor resolution.' },
  { role: 'Faculty', description: 'Report issues, monitor departmental concerns.' },
  { role: 'Staff', description: 'Submit operational feedback and infrastructure reports.' },
  { role: 'Admin', description: 'AI-powered insights, pattern analysis, and action management.' },
];

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(formData.email, formData.password);
      // Redirect to role-appropriate dashboard or previous page
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'sensitive_officer') {
        navigate('/safeguarding', { replace: true });
      } else {
        navigate('/user', { replace: true });
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left panel – branding / role info */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between bg-gradient-to-br from-blue-700 to-blue-900 text-white p-10">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-9 h-9 text-blue-200" aria-hidden="true" />
          <div>
            <p className="text-xl font-bold leading-tight">Campus Guardian 360</p>
            <p className="text-blue-300 text-xs">AI-Driven Campus Intelligence</p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-6">Turning feedback into action.</h2>
          <ul className="space-y-4">
            {ROLE_DESCRIPTIONS.map(({ role, description }) => (
              <li key={role} className="flex gap-3">
                <span className="mt-1 w-2 h-2 rounded-full bg-blue-300 flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium">{role}</p>
                  <p className="text-blue-200 text-sm">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-blue-400 text-xs">© {new Date().getFullYear()} Campus Guardian 360</p>
      </div>

      {/* Right panel – login form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <ShieldCheck className="w-7 h-7 text-blue-700" aria-hidden="true" />
            <p className="text-lg font-bold text-slate-800">Campus Guardian 360</p>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-1">Sign in</h1>
          <p className="text-slate-500 mb-8">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-medium">
              Register
            </Link>
          </p>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="mb-5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="you@example.com"
                aria-required="true"
              />
            </div>

            {/* Password */}
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="••••••••"
                  aria-required="true"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold rounded-lg py-2.5 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
