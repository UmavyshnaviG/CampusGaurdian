import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';

// ---------------------------------------------------------------------------
// Placeholder pages – replaced in later stages
// ---------------------------------------------------------------------------
function UserDashboard() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">User Dashboard</h1>
        <p className="text-slate-500">Student / Faculty / Staff portal — coming in Stage 3.</p>
      </div>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Admin Dashboard</h1>
        <p className="text-slate-500">Administration portal — coming in Stage 3.</p>
      </div>
    </div>
  );
}

function SafeguardingDashboard() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Safeguarding Portal</h1>
        <p className="text-slate-500">Sensitive Officer access — coming in Stage 3.</p>
      </div>
    </div>
  );
}

function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
        <p className="text-slate-500">You do not have permission to view this page.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App routes
// ---------------------------------------------------------------------------
function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* User portal — student, faculty, staff */}
      <Route
        path="/user/*"
        element={
          <ProtectedRoute requiredRoles={['student', 'faculty', 'staff']}>
            <UserDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin portal */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Safeguarding portal */}
      <Route
        path="/safeguarding/*"
        element={
          <ProtectedRoute requiredRoles={['sensitive_officer']}>
            <SafeguardingDashboard />
          </ProtectedRoute>
        }
      />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
