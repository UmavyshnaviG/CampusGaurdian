import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ---------------------------------------------------------------------------
// UserLayout
// ---------------------------------------------------------------------------
export default function UserLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: app name */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">CG</span>
            </div>
            <span className="font-bold text-slate-800 text-sm">Campus Guardian 360</span>
          </div>

          {/* Center: nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            <NavLink
              to="/user/dashboard"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/user/submit-grievance"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`
              }
            >
              Submit
            </NavLink>
            <NavLink
              to="/user/my-grievances"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`
              }
            >
              My Grievances
            </NavLink>
          </nav>

          {/* Right: user name + logout */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 hidden sm:block">
              {user?.fullName || user?.name || ''}
            </span>
            <button
              onClick={handleLogout}
              aria-label="Logout"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="pt-0 p-6">
        {children}
      </main>
    </div>
  );
}
