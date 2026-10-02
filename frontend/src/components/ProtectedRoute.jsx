import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 *
 * Wraps content that requires authentication.
 * - Redirects unauthenticated users to /login.
 * - When requiredRoles is supplied, redirects unauthorised users to /unauthorized.
 *
 * @param {React.ReactNode} children
 * @param {string[]} [requiredRoles] - Optional array of allowed roles.
 */
function ProtectedRoute({ children, requiredRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default ProtectedRoute;
