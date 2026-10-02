import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';

// User portal pages
import UserDashboard from './pages/user/UserDashboard';
import SubmitGrievance from './pages/user/SubmitGrievance';
import MyGrievances from './pages/user/MyGrievances';
import GrievanceDetail from './pages/user/GrievanceDetail';

// Admin portal pages
import UploadDataset from './pages/admin/UploadDataset';
import Patterns from './pages/admin/Patterns';
import PatternDetail from './pages/admin/PatternDetail';

// ---------------------------------------------------------------------------
// Placeholder pages – replaced in later stages
// ---------------------------------------------------------------------------
function AdminDashboard() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Admin Dashboard</h1>
        <p className="text-slate-500">Administration portal — coming in Stage 4.</p>
      </div>
    </div>
  );
}

function SafeguardingDashboard() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Safeguarding Portal</h1>
        <p className="text-slate-500">Sensitive Officer access — coming in a later stage.</p>
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
            {/* Inner routes rendered inside the portal */}
            <Routes>
              <Route path="dashboard" element={<UserDashboard />} />
              <Route path="submit-grievance" element={<SubmitGrievance />} />
              <Route path="my-grievances" element={<MyGrievances />} />
              <Route path="grievance/:id" element={<GrievanceDetail />} />
              {/* Default: redirect /user → /user/dashboard */}
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </ProtectedRoute>
        }
      />

      {/* Admin portal */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRoles={['admin']}>
            <Routes>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="upload" element={<UploadDataset />} />
              <Route path="patterns" element={<Patterns />} />
              <Route path="patterns/:id" element={<PatternDetail />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
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
