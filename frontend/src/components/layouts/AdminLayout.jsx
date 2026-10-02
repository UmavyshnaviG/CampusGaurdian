import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Network,
  Zap,
  BarChart2,
  Activity,
  Search,
  Building2,
  LineChart,
  Shield,
  Upload,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { to: '/admin/dashboard',    label: 'Dashboard',        icon: LayoutDashboard },
  { to: '/admin/grievances',   label: 'Grievances',       icon: FileText },
  { to: '/admin/patterns',     label: 'Patterns',         icon: Network },
  { to: '/admin/action-center',label: 'Action Center',    icon: Zap },
  { to: '/admin/outcomes',     label: 'Outcomes',         icon: BarChart2 },
  { to: '/admin/recurrence',   label: 'Recurrence Monitor', icon: Activity },
  { to: '/admin/search',       label: 'Semantic Search',  icon: Search },
  { to: '/admin/departments',  label: 'Departments',      icon: Building2 },
  { to: '/admin/evaluation',   label: 'Evaluation',       icon: LineChart },
  { to: '/admin/audit-logs',   label: 'Audit Logs',       icon: Shield },
  { to: '/admin/upload',       label: 'Upload Dataset',   icon: Upload },
];

// ---------------------------------------------------------------------------
// AdminLayout
// ---------------------------------------------------------------------------
export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const sidebar = (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-200">
        <span className="text-base font-bold text-slate-800 leading-tight">
          Campus Guardian 360
        </span>
        <p className="text-xs text-slate-400 mt-0.5">Admin Portal</p>
      </div>

      {/* Links */}
      <ul className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-slate-200 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">
            {user?.fullName || user?.name || 'Admin'}
          </p>
          <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
        </div>
        <button
          onClick={handleLogout}
          aria-label="Logout"
          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-30">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-slate-200 flex flex-col md:hidden
          transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <span className="text-sm font-bold text-slate-800">Campus Guardian 360</span>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="p-1 text-slate-500 hover:text-slate-800"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        {sidebar}
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col md:ml-60">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <span className="text-sm font-semibold text-slate-800">Campus Guardian 360</span>
          <button
            onClick={handleLogout}
            aria-label="Logout"
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
