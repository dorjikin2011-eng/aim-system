// frontend/src/App.tsx
import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AdminStatsProvider } from './context/AdminStatsContext'; // ✅ ADDED

import LoginPage from './pages/Login';
import PreventionDashboard from './pages/prevention/PreventionDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AgencyList from './pages/admin/AgencyList';
import AgencyForm from './pages/admin/AgencyForm';
import AgencyCreationWizard from './pages/admin/AgencyCreationWizard';
import UserList from './pages/admin/UserList';
import UserForm from './pages/admin/UserForm';
import AuditLogExplorer from './pages/admin/AuditLogExplorer';
import ReportsPage from './pages/admin/ReportsPage';
import ConfigPage from './pages/admin/ConfigPage';
import AgencyAssessmentPage from './pages/prevention/AgencyAssessment/AgencyAssessmentPage';
import AssignmentManager from './pages/admin/AssignmentManager';
import FocalDashboard from './pages/focal/FocalDashboard';
import HoaDashboard from './pages/hoa/HoaDashboard';
import NominateFocal from './pages/hoa/NominateFocal';
import FocalNominations from './pages/admin/FocalNominations';
import CommissionDashboard from './pages/commission/CommissionDashboard';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Indicator1EditPage from './pages/focal/Indicator1EditPage';
import EvidenceUploadPage from './pages/focal/EvidenceUploadPage';
import DirectorDashboard from './pages/director/DirectorDashboard';

import { RequireAuth } from './middleware/auth';

/* =========================
   Root Redirect (Role-aware) - FIXED VERSION
   ========================= */
function RootRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login', { replace: true });
      } else {
        switch (user.role) {
          case 'system_admin':
          case 'admin':
            navigate('/admin', { replace: true });
            break;
          case 'prevention_officer':
            navigate('/prevention', { replace: true });
            break;
          case 'commissioner':
            navigate('/commission', { replace: true });
            break;
          case 'director':
            navigate('/director', { replace: true });
            break;
          case 'agency_head':
            navigate('/hoa', { replace: true });
            break;
          case 'focal_person':
            navigate('/focal', { replace: true });
            break;
          default:
            navigate('/unauthorized', { replace: true });
        }
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="mt-2 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}

/* =========================
   Admin Route Wrapper - ✅ NEW HELPER COMPONENT
   ========================= */
const AdminRouteWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <RequireAuth allowedRoles={['system_admin', 'admin']}>
      <AdminStatsProvider>
        {children}
      </AdminStatsProvider>
    </RequireAuth>
  );
};

/* =========================
   App Routes - ✅ FULLY FIXED
   ========================= */
export default function App() {
  return (
    <Routes>
      {/* ==================== */}
      {/* PUBLIC ROUTES */}
      {/* ==================== */}
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/unauthorized"
        element={
          <div className="min-h-screen flex items-center justify-center flex-col">
            <h1 className="text-2xl font-bold">Unauthorized</h1>
            <p className="mt-2 text-gray-600">You do not have access to this page.</p>
          </div>
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* ==================== */}
      {/* ROOT REDIRECT */}
      {/* ==================== */}
      <Route path="/" element={<RootRedirect />} />

      {/* ==================== */}
      {/* COMMISSIONER ROUTES */}
      {/* ==================== */}
      <Route
        path="/commission/*"
        element={
          <RequireAuth allowedRoles={['commissioner']}>
            <CommissionDashboard />
          </RequireAuth>
        }
      />

      {/* ==================== */}
      {/* DIRECTOR ROUTES */}
      {/* ==================== */}
      <Route
        path="/director/*"
        element={
          <RequireAuth allowedRoles={['director']}>
            <DirectorDashboard />
          </RequireAuth>
        }
      />

      {/* ==================== */}
      {/* PREVENTION OFFICER ROUTES */}
      {/* ==================== */}
      <Route
        path="/prevention"
        element={
          <RequireAuth allowedRoles={['prevention_officer']}>
            <PreventionDashboard />
          </RequireAuth>
        }
      />

      <Route
        path="/prevention/agencies/:agencyId/assessment"
        element={
          <RequireAuth allowedRoles={['prevention_officer']}>
            <AgencyAssessmentPage />
          </RequireAuth>
        }
      />

      {/* ==================== */}
      {/* ADMIN ROUTES - ✅ FIXED WITH PROVIDER */}
      {/* ==================== */}
      
      {/* Admin Dashboard - Main Route */}
      <Route
        path="/admin"
        element={
          <AdminRouteWrapper>
            <AdminDashboard />
          </AdminRouteWrapper>
        }
      />

      {/* Agency Management */}
      <Route
        path="/admin/agencies"
        element={
          <AdminRouteWrapper>
            <AgencyList />
          </AdminRouteWrapper>
        }
      />

      <Route
        path="/admin/agencies/new"
        element={
          <AdminRouteWrapper>
            <AgencyForm />
          </AdminRouteWrapper>
        }
      />

      <Route
        path="/admin/agencies/:id/edit"
        element={
          <AdminRouteWrapper>
            <AgencyForm />
          </AdminRouteWrapper>
        }
      />

      <Route
        path="/admin/agencies/wizard"
        element={
          <AdminRouteWrapper>
            <AgencyCreationWizard />
          </AdminRouteWrapper>
        }
      />

      {/* Assignment Manager */}
      <Route
        path="/admin/assignments"
        element={
          <AdminRouteWrapper>
            <AssignmentManager />
          </AdminRouteWrapper>
        }
      />

      {/* User Management */}
      <Route
        path="/admin/users"
        element={
          <AdminRouteWrapper>
            <UserList />
          </AdminRouteWrapper>
        }
      />

      <Route
        path="/admin/users/new"
        element={
          <AdminRouteWrapper>
            <UserForm />
          </AdminRouteWrapper>
        }
      />

      <Route
        path="/admin/users/:id/edit"
        element={
          <AdminRouteWrapper>
            <UserForm />
          </AdminRouteWrapper>
        }
      />

      {/* Audit Logs */}
      <Route
        path="/admin/logs"
        element={
          <AdminRouteWrapper>
            <AuditLogExplorer />
          </AdminRouteWrapper>
        }
      />

      {/* Reports */}
      <Route
        path="/admin/reports"
        element={
          <AdminRouteWrapper>
            <ReportsPage />
          </AdminRouteWrapper>
        }
      />

      {/* Configuration */}
      <Route
        path="/admin/config"
        element={
          <AdminRouteWrapper>
            <ConfigPage />
          </AdminRouteWrapper>
        }
      />

      {/* Focal Nominations */}
      <Route
        path="/admin/focal-nominations"
        element={
          <AdminRouteWrapper>
            <FocalNominations />
          </AdminRouteWrapper>
        }
      />

      {/* ==================== */}
      {/* FOCAL PERSON ROUTES */}
      {/* ==================== */}
      <Route
        path="/focal/indicators/1"
        element={
          <RequireAuth allowedRoles={['focal_person']}>
            <Indicator1EditPage />
          </RequireAuth>
        }
      />

      <Route
        path="/focal/indicators/:indicatorId/evidence"
        element={
          <RequireAuth allowedRoles={['focal_person']}>
            <EvidenceUploadPage />
          </RequireAuth>
        }
      />

      <Route
        path="/focal/*"
        element={
          <RequireAuth allowedRoles={['focal_person']}>
            <FocalDashboard />
          </RequireAuth>
        }
      />

      {/* ==================== */}
      {/* HEAD OF AGENCY ROUTES */}
      {/* ==================== */}
      <Route
        path="/hoa/*"
        element={
          <RequireAuth allowedRoles={['agency_head']}>
            <HoaDashboard />
          </RequireAuth>
        }
      />

      <Route
        path="/hoa/nominate-focal"
        element={
          <RequireAuth allowedRoles={['agency_head']}>
            <NominateFocal />
          </RequireAuth>
        }
      />

      {/* ==================== */}
      {/* CATCH-ALL 404 ROUTE */}
      {/* ==================== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}