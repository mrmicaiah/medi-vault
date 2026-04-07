import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

import { AuthLayout } from '../components/layout/AuthLayout';
import { AppLayout } from '../components/layout/AppLayout';

import { LoginPage } from '../pages/auth/LoginPage';
import { SignupPage } from '../pages/auth/SignupPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { ResetCallbackPage } from '../pages/auth/ResetCallbackPage';
import { AuthCallbackPage } from '../pages/auth/AuthCallbackPage';
import { CompleteProfilePage } from '../pages/auth/CompleteProfilePage';
import { SetPasswordPage } from '../pages/auth/SetPasswordPage';
import { InvitePage } from '../pages/auth/InvitePage';

import { ApplyPage } from '../pages/public/ApplyPage';

import { ApplicantDashboardPage } from '../pages/applicant/DashboardPage';
import { ApplicationPage } from '../pages/applicant/ApplicationPage';
import { DocumentsPage as ApplicantDocumentsPage } from '../pages/applicant/DocumentsPage';

import { AdminDashboardPage } from '../pages/admin/DashboardPage';
import { ApplicantsPage } from '../pages/admin/ApplicantsPage';
import { ApplicantDetailPage } from '../pages/admin/ApplicantDetailPage';
import { EmployeesPage } from '../pages/admin/EmployeesPage';
import { EmployeeDetailPage } from '../pages/admin/EmployeeDetailPage';
import AdminDocumentsPage from '../pages/admin/DocumentsPage';
import ClientsPage from '../pages/admin/ClientsPage';
import { HirePage } from '../pages/admin/HirePage';
import { UsersPage } from '../pages/admin/UsersPage';
import { TrainingLeadsPage } from '../pages/admin/TrainingLeadsPage';
import { SettingsPage } from '../pages/admin/SettingsPage';
import { SuperadminDashboardPage } from '../pages/superadmin/DashboardPage';

const STAFF_ROLES: UserRole[] = ['admin', 'superadmin', 'manager'];

function isStaffRole(role: UserRole | null): boolean {
  return role !== null && STAFF_ROLES.includes(role);
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuth();

  if (!initialized || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-3 text-sm text-gray">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
}

function ProfileErrorScreen() {
  const handleSignOut = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/auth/login';
  };

  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <div className="text-center max-w-md px-4">
        <h1 className="font-display text-2xl font-bold text-navy">Profile Error</h1>
        <p className="mt-2 text-gray">Unable to load your profile. This may be a permissions issue.</p>
        <p className="mt-4 text-sm text-gray">Try refreshing or signing out and back in.</p>
        <div className="mt-6 flex gap-3 justify-center">
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-navy text-white rounded-lg text-sm font-medium"
          >
            Refresh
          </button>
          <button 
            onClick={handleSignOut}
            className="px-4 py-2 bg-gray-200 text-navy rounded-lg text-sm font-medium"
          >
            Sign Out
          </button>
        </div>
        <p className="mt-6 text-xs text-gray">Debug: Check browser console for [Auth] logs</p>
      </div>
    </div>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { role, profile, loading, initialized } = useAuth();

  console.log('[AdminRoute] role:', role, 'profile:', profile, 'loading:', loading, 'initialized:', initialized);

  if (!initialized || loading) return null;

  if (!profile) {
    return <ProfileErrorScreen />;
  }

  if (!isStaffRole(role)) {
    return <Navigate to="/applicant" replace />;
  }

  return <>{children}</>;
}

function SuperadminRoute({ children }: { children: React.ReactNode }) {
  const { role, profile, loading, initialized } = useAuth();

  if (!initialized || loading) return null;

  if (!profile) {
    return <ProfileErrorScreen />;
  }

  if (role !== 'superadmin') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

function ApplicantRoute({ children }: { children: React.ReactNode }) {
  const { role, profile, loading, initialized } = useAuth();

  console.log('[ApplicantRoute] role:', role, 'profile:', profile);

  if (!initialized || loading) return null;

  if (!profile) {
    return <ProfileErrorScreen />;
  }

  if (isStaffRole(role)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { role, profile } = useAuth();
  
  console.log('[RootRedirect] role:', role, 'profile:', profile);

  if (!profile) {
    return <Navigate to="/auth/login" replace />;
  }
  
  if (isStaffRole(role)) {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/applicant" replace />;
}

export function RouterConfig() {
  return (
    <Routes>
      {/* Public application pages */}
      <Route path="/apply" element={<ApplyPage />} />
      <Route path="/apply/:agencySlug" element={<ApplyPage />} />
      
      {/* Staff invitation page (custom token flow) */}
      <Route path="/invite/:token" element={<InvitePage />} />

      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/reset-callback" element={<ResetCallbackPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth/complete-profile" element={<CompleteProfilePage />} />
        <Route path="/auth/set-password" element={<SetPasswordPage />} />
      </Route>

      {/* Protected applicant routes */}
      <Route
        element={
          <ProtectedRoute>
            <ApplicantRoute>
              <AppLayout />
            </ApplicantRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/applicant" element={<ApplicantDashboardPage />} />
        <Route path="/applicant/application" element={<ApplicationPage />} />
        <Route path="/applicant/documents" element={<ApplicantDocumentsPage />} />
      </Route>

      {/* Protected admin routes */}
      <Route
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AppLayout />
            </AdminRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/applicants" element={<ApplicantsPage />} />
        <Route path="/admin/pipeline" element={<Navigate to="/admin/applicants" replace />} />
        <Route path="/admin/applicant/:id" element={<ApplicantDetailPage />} />
        <Route path="/admin/employees" element={<EmployeesPage />} />
        <Route path="/admin/employee/:id" element={<EmployeeDetailPage />} />
        <Route path="/admin/clients" element={<ClientsPage />} />
        <Route path="/admin/documents" element={<AdminDocumentsPage />} />
        <Route path="/admin/compliance" element={<Navigate to="/admin/documents" replace />} />
        <Route path="/admin/hire/:id" element={<HirePage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/training-leads" element={<TrainingLeadsPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
      </Route>

      {/* Superadmin-only routes (no AppLayout - custom dark theme) */}
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute>
            <SuperadminRoute>
              <SuperadminDashboardPage />
            </SuperadminRoute>
          </ProtectedRoute>
        }
      />

      {/* Root redirect */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RootRedirect />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="flex h-screen items-center justify-center bg-bg">
            <div className="text-center">
              <h1 className="font-display text-6xl font-bold text-navy">404</h1>
              <p className="mt-2 text-gray">Page not found</p>
              <a href="/" className="mt-4 inline-block text-sm text-maroon hover:text-maroon-light">
                Go Home
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  );
}
