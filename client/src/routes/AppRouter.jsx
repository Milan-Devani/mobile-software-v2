import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Layout & Guards (eager: needed for every authenticated screen)
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';

// Route-level code splitting. Pages use named exports, so map each one to the
// default export React.lazy expects. Every loader is kept so all page chunks can
// be preloaded once the app is idle, keeping in-app navigation instant.
const pageLoaders = [];
const lazyPage = (loader, exportName) => {
  const load = () => loader().then((m) => ({ default: m[exportName] }));
  pageLoaders.push(load);
  return lazy(load);
};

const Login = lazyPage(() => import('../pages/auth/Login'), 'Login');
const Dashboard = lazyPage(() => import('../pages/dashboard/Dashboard'), 'Dashboard');
const CustomerList = lazyPage(() => import('../pages/customers/CustomerList'), 'CustomerList');
const CustomerDetail = lazyPage(() => import('../pages/customers/CustomerDetail'), 'CustomerDetail');
const JobList = lazyPage(() => import('../pages/jobs/JobList'), 'JobList');
const JobCreate = lazyPage(() => import('../pages/jobs/JobCreate'), 'JobCreate');
const JobDetail = lazyPage(() => import('../pages/jobs/JobDetail'), 'JobDetail');
const CustomerApprovalPage = lazyPage(() => import('../pages/public/CustomerApprovalPage'), 'CustomerApprovalPage');
const CustomerReviewPage = lazyPage(() => import('../pages/public/CustomerReviewPage'), 'CustomerReviewPage');
const GoogleReviewsManagement = lazyPage(() => import('../pages/reviews/GoogleReviewsManagement'), 'GoogleReviewsManagement');
const PartsList = lazyPage(() => import('../pages/parts/PartsList'), 'PartsList');
const PaymentsList = lazyPage(() => import('../pages/payments/PaymentsList'), 'PaymentsList');
const NotificationLogs = lazyPage(() => import('../pages/notifications/NotificationLogs'), 'NotificationLogs');
const Settings = lazyPage(() => import('../pages/settings/Settings'), 'Settings');
const SalesList = lazyPage(() => import('../pages/sales/SalesList'), 'SalesList');
const SalesInvoiceCreate = lazyPage(() => import('../pages/sales/SalesInvoiceCreate'), 'SalesInvoiceCreate');
const RecycleBin = lazyPage(() => import('../pages/recycle/RecycleBin'), 'RecycleBin');
// Vendor Management module temporarily hidden. To re-enable, restore the routes below and add e.g.:
// const VendorDashboard = lazyPage(() => import('../pages/vendors/VendorDashboard'), 'VendorDashboard');
// (VendorList, VendorDetail, VendorSendMobiles, VendorReceiveMobiles, VendorTransactionsList,
//  VendorPendingRepairs, VendorLedger, VendorReports follow the same pattern.)

const preloadAllPages = () => {
  pageLoaders.forEach((load) => load().catch(() => {}));
};

// Preload the remaining page chunks in the background once a user is signed in, so
// switching screens never waits on the network. Signed-out visitors (customers opening a
// public approval/review link on their phone) don't download the staff app.
const usePreloadPages = () => {
  const isSignedIn = useSelector((state) => Boolean(state.auth?.token));
  useEffect(() => {
    if (!isSignedIn || typeof window === 'undefined') return undefined;
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preloadAllPages, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(preloadAllPages, 1500);
    return () => window.clearTimeout(id);
  }, [isSignedIn]);
};

// The layout's TopLoadingBar already signals navigation, so the fallback renders nothing
// (same as the brief blank before a page's own data-loading state appears).
const page = (element) => <Suspense fallback={null}>{element}</Suspense>;

export const AppRouter = () => {
  usePreloadPages();

  return (
    <Routes>
      {/* 1. Public Authentication Route */}
      <Route path="/login" element={page(<Login />)} />

      {/* 2. Public Customer Approval Route (No login required) */}
      <Route path="/repair/:tokenOrJobNumber/approval" element={page(<CustomerApprovalPage />)} />

      {/* 2b. Public Customer Review Route (No login required) */}
      <Route path="/review/:uniqueToken" element={page(<CustomerReviewPage />)} />

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
        <Route path="dashboard" element={page(<Dashboard />)} />

        {/* Customers */}
        <Route path="customers" element={page(<CustomerList />)} />
        <Route path="customers/:id" element={page(<CustomerDetail />)} />

        {/* Jobs */}
        <Route path="jobs" element={page(<JobList />)} />
        <Route path="jobs/new" element={page(<JobCreate />)} />
        <Route path="jobs/:id" element={page(<JobDetail />)} />

        {/* Parts */}
        <Route path="parts" element={page(<PartsList />)} />

        {/* Sales Billing (Sell Phone & Sell Parts) */}
        <Route path="sales" element={page(<SalesList />)} />
        <Route path="sales/new" element={page(<SalesInvoiceCreate />)} />

        {/* Vendor Management Module (temporarily hidden) */}
        {/* <Route path="vendors" element={page(<VendorDashboard />)} />
        <Route path="vendors/list" element={page(<VendorList />)} />
        <Route path="vendors/send" element={page(<VendorSendMobiles />)} />
        <Route path="vendors/receive" element={page(<VendorReceiveMobiles />)} />
        <Route path="vendors/transactions" element={page(<VendorTransactionsList />)} />
        <Route path="vendors/pending" element={page(<VendorPendingRepairs />)} />
        <Route path="vendors/ledger" element={page(<VendorLedger />)} />
        <Route path="vendors/reports" element={page(<VendorReports />)} />
        <Route path="vendors/:id" element={page(<VendorDetail />)} /> */}

        {/* Payments */}
        <Route
          path="payments"
          element={
            <ProtectedRoute allowedRoles={['admin', 'developer', 'staff']}>
              {page(<PaymentsList />)}
            </ProtectedRoute>
          }
        />

        {/* Notifications */}
        <Route path="notifications" element={page(<NotificationLogs />)} />

        {/* Google Reviews Management */}
        <Route path="reviews" element={page(<GoogleReviewsManagement />)} />

        {/* Recycle Bin (Soft Delete & 30-Day Auto Purge) */}
        <Route path="recycle-bin" element={page(<RecycleBin />)} />

        {/* Settings (Admin Only) */}
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={['admin', 'developer']}>
              {page(<Settings />)}
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 4. Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
