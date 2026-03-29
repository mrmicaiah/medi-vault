import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

import { AuthLayout } from '../components/layout/AuthLayout';
import { AppLayout } from '../components/layout/AppLayout';

import { LoginPage } from '../pages/auth/LoginPage';
import { SignupPage } from '../pages/auth/SignupPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { InvitePage } from '../pages/auth/InvitePage';

import { ApplyPage } from '../pages/public/ApplyPage';

import { ApplicantDashboardPage } from '../pages/applicant/DashboardPage';
import { ApplicationPage } from '../pages/applicant/ApplicationPage';
import { DocumentsPage } from '../pages/applicant/DocumentsPage';

import { AdminDashboardPage } from '../pages/admin/DashboardPage';
import { PipelinePage } from '../pages/admin/PipelinePage';
import { ApplicantDetailPage } from '../pages/admin/ApplicantDetailPage';
import { EmployeesPage } from '../pages/admin/EmployeesPage';
import { EmployeeDetailPage } from '../pages/admin/EmployeeDetailPage';
import { CompliancePage } from '../pages/admin/CompliancePage';
import { HirePage } from '../pages/admin/HirePage';
import { UsersPage } from '../pages/admin/UsersPage';

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

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { role, loading, initialized } = useAuth();

  if (!initialized || loading) return null;

  if (!isStaffRole(role)) {
    return <Navigate to="/applicant" replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { role } = useAuth();
  
  if (isStaffRole(role)) {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/applicant" replace />;
}

export function RouterConfig() {
  return (
    <Routes>
      {/* Public application pages - supports agency slug */}
      <Route path="/apply" element={<ApplyPage />} />
      <Route path="/apply/:agencySlug" element={<ApplyPage />} />
      
      {/* Staff invitation page - no auth required */}
      <Route path="/invite/:token" element={<InvitePage />} />

      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Protected applicant routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/applicant" element={<ApplicantDashboardPage />} />
        <Route path="/applicant/application" element={<ApplicationPage />} />
        <Route path="/applicant/documents" element={<DocumentsPage />} />
      </Route>

      {/* Protected admin/manager routes */}
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
        <Route path="/admin/pipeline" element={<PipelinePage />} />
        <Route path="/admin/applicant/:id" element={<ApplicantDetailPage />} />
        <Route path="/admin/employees" element={<EmployeesPage />} />
        <Route path="/admin/employee/:id" element={<EmployeeDetailPage />} />
        <Route path="/admin/compliance" element={<CompliancePage />} />
        <Route path="/admin/hire/:id" element={<HirePage />} />
        <Route path="/admin/users" element={<UsersPage />} />
      </Route>

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
