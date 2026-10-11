import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout & Guards
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';

// Pages
import { Login } from '../pages/auth/Login';
import { Dashboard } from '../pages/dashboard/Dashboard';
import { CustomerList } from '../pages/customers/CustomerList';
import { CustomerDetail } from '../pages/customers/CustomerDetail';
import { JobList } from '../pages/jobs/JobList';
import { JobCreate } from '../pages/jobs/JobCreate';
import { JobDetail } from '../pages/jobs/JobDetail';
import { CustomerApprovalPage } from '../pages/public/CustomerApprovalPage';
import { PartsList } from '../pages/parts/PartsList';
import { PaymentsList } from '../pages/payments/PaymentsList';
import { NotificationLogs } from '../pages/notifications/NotificationLogs';
import { Settings } from '../pages/settings/Settings';

export const AppRouter = () => {
  return (
    <Routes>
      {/* 1. Public Authentication Route */}
      <Route path="/login" element={<Login />} />

      {/* 2. Public Customer Approval Route (No login required) */}
      <Route path="/repair/:tokenOrJobNumber/approval" element={<CustomerApprovalPage />} />

      {/* 3. Protected Employee Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Customers */}
        <Route path="customers" element={<CustomerList />} />
        <Route path="customers/:id" element={<CustomerDetail />} />

        {/* Jobs */}
        <Route path="jobs" element={<JobList />} />
        <Route path="jobs/new" element={<JobCreate />} />
        <Route path="jobs/:id" element={<JobDetail />} />

        {/* Parts */}
        <Route path="parts" element={<PartsList />} />

        {/* Payments */}
        <Route
          path="payments"
          element={
            <ProtectedRoute allowedRoles={['admin', 'staff']}>
              <PaymentsList />
            </ProtectedRoute>
          }
        />

        {/* Notifications */}
        <Route path="notifications" element={<NotificationLogs />} />

        {/* Settings (Admin Only) */}
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 4. Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
