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
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminGrievances from './pages/admin/AdminGrievances';
import UploadDataset from './pages/admin/UploadDataset';
import Patterns from './pages/admin/Patterns';
import PatternDetail from './pages/admin/PatternDetail';
import ActionCenter from './pages/admin/ActionCenter';
import ActionDetail from './pages/admin/ActionDetail';
import Outcomes from './pages/admin/Outcomes';
import RecurrenceMonitor from './pages/admin/RecurrenceMonitor';
import SemanticSearch from './pages/admin/SemanticSearch';
import Departments from './pages/admin/Departments';
import Evaluation from './pages/admin/Evaluation';
import AuditLogs from './pages/admin/AuditLogs';

// Safeguarding portal pages
import SafeguardingPortal from './pages/safeguarding/SafeguardingPortal';
import SensitiveCase from './pages/safeguarding/SensitiveCase';

// ---------------------------------------------------------------------------
// Shared utility page
// ---------------------------------------------------------------------------
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
              <Route path="grievances" element={<AdminGrievances />} />
              <Route path="upload" element={<UploadDataset />} />
              <Route path="patterns" element={<Patterns />} />
              <Route path="patterns/:id" element={<PatternDetail />} />
              <Route path="action-center" element={<ActionCenter />} />
              <Route path="action-center/:id" element={<ActionDetail />} />
              <Route path="outcomes" element={<Outcomes />} />
              <Route path="recurrence" element={<RecurrenceMonitor />} />
              <Route path="search" element={<SemanticSearch />} />
              <Route path="departments" element={<Departments />} />
              <Route path="evaluation" element={<Evaluation />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </ProtectedRoute>
        }
      />

      {/* Safeguarding portal */}
      <Route
        path="/safeguarding/*"
        element={
          <ProtectedRoute requiredRoles={['sensitive_officer', 'admin']}>
            <Routes>
              <Route path="portal" element={<SafeguardingPortal />} />
              <Route path="case/:id" element={<SensitiveCase />} />
              <Route path="*" element={<Navigate to="portal" replace />} />
            </Routes>
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
