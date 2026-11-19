import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { fetchCompanySettingsFromDB } from './shared/services/companySettingsService';

// Shared Providers & Layout (kept eager for instant app shell)
import { ToastProvider } from './shared/context/ToastContext';
import { ConfirmProvider } from './shared/context/ConfirmContext';
import { AuthProvider } from './shared/context/AuthContext';
import { TimerProvider } from './shared/context/TimerContext';
import { Layout } from './shared/components/layout/Layout';
import { ErrorBoundary } from './shared/components/common/ErrorBoundary';
import { LoginPage } from './modules/auth/pages/LoginPage';

// Module Providers
import { HRProvider } from './modules/hr/context/HRContext';
import { WorkProvider } from './modules/work/context/WorkContext';
import { CRMProvider } from './shared/context/CRMContext';

// Route-Level Code Splitting with Automatic Deployment Chunk-Refresh Recovery
const isChunkLoadError = (err) => {
  const msg = err?.message || String(err || '');
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /MIME type of "text\/html"/i.test(msg)
  );
};

const lazyWithRetry = (importer, name) =>
  lazy(async () => {
    try {
      const module = await importer();
      try {
        sessionStorage.removeItem('ems_chunk_reload_ts');
      } catch (_) {}
      return { default: name ? module[name] : (module.default || module) };
    } catch (error) {
      if (isChunkLoadError(error) && typeof window !== 'undefined') {
        const lastReload = Number(sessionStorage.getItem('ems_chunk_reload_ts') || 0);
        const now = Date.now();
        if (now - lastReload > 15000) {
          sessionStorage.setItem('ems_chunk_reload_ts', String(now));
          window.location.reload();
          // Return pending promise so React doesn't try to render an error boundary while reloading
          return new Promise(() => {});
        }
      }
      throw error;
    }
  });

const ProjectsPage       = lazyWithRetry(() => import('./modules/work/pages/ProjectsPage'), 'ProjectsPage');
const TasksPage          = lazyWithRetry(() => import('./modules/work/pages/TasksPage'), 'TasksPage');
const TimesheetPage      = lazyWithRetry(() => import('./modules/work/pages/TimesheetPage'), 'TimesheetPage');
const LeavesPage         = lazyWithRetry(() => import('./modules/hr/pages/LeavesPage'), 'LeavesPage');
const AttendancePage     = lazyWithRetry(() => import('./modules/hr/pages/AttendancePage'), 'AttendancePage');
const HolidayPage        = lazyWithRetry(() => import('./modules/hr/pages/HolidayPage'), 'HolidayPage');
const AppreciationPage   = lazyWithRetry(() => import('./modules/hr/pages/AppreciationPage'), 'AppreciationPage');
const DashboardPage      = lazyWithRetry(() => import('./modules/hr/pages/DashboardPage'), 'DashboardPage');
const EmployeesPage      = lazyWithRetry(() => import('./modules/hr/pages/EmployeesPage'), 'EmployeesPage');
const TeamOperationsPage = lazyWithRetry(() => import('./modules/hr/pages/TeamOperationsPage'), 'TeamOperationsPage');
const DocumentationPage  = lazyWithRetry(() => import('./modules/hr/pages/DocumentationPage'), 'DocumentationPage');
const TicketsPage        = lazyWithRetry(() => import('./modules/crm/pages/TicketsPage'), 'TicketsPage');
const CalendarPage       = lazyWithRetry(() => import('./modules/crm/pages/CalendarPage'), 'CalendarPage');
const NoticeBoardPage    = lazyWithRetry(() => import('./modules/crm/pages/NoticeBoardPage'), 'NoticeBoardPage');
const LeadsPage          = lazyWithRetry(() => import('./modules/crm/pages/LeadsPage'), 'LeadsPage');
const MessagesPage       = lazyWithRetry(() => import('./modules/crm/pages/MessagesPage'), 'MessagesPage');
const ExpensesPage       = lazyWithRetry(() => import('./modules/finance/pages/ExpensesPage'), 'ExpensesPage');
const PayrollPage        = lazyWithRetry(() => import('./modules/finance/pages/PayrollPage'), 'PayrollPage');
const SettingsPage       = lazyWithRetry(() => import('./modules/settings/pages/SettingsPage'), 'SettingsPage');

import { WorkspaceLoader } from './shared/components/common/WorkspaceLoader';

const RouteFallback = () => <WorkspaceLoader />;


export function App() {
  useEffect(() => {
    fetchCompanySettingsFromDB().catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <HRProvider>
              <TimerProvider>
                <WorkProvider>
                  <CRMProvider>
                  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      {/* ── Public Auth Routes ── */}
                      <Route path="/login" element={<LoginPage />} />

                      {/* ── Protected Workspace Routes ── */}
                      <Route path="/" element={<Layout />}>
                        <Route index element={<Navigate to="/dashboard" replace />} />

                      {/* ── Core HR & CRM Dashboard ─────────────────────────── */}
                      <Route path="dashboard"   element={<DashboardPage />} />

                      {/* ── Leads & Pipeline Module Routes ──────────────────── */}
                      <Route path="leads"        element={<LeadsPage />} />
                      <Route path="lead-contact" element={<LeadsPage />} />

                      {/* ── Work Module Routes ──────────────────────────────── */}
                      <Route path="projects"      element={<ProjectsPage />} />
                      <Route path="tasks"         element={<TasksPage />} />
                      <Route path="timesheet"     element={<TimesheetPage />} />
                      <Route path="timesheets"    element={<Navigate to="/timesheet" replace />} />
                      <Route path="work"          element={<Navigate to="/projects" replace />} />

                      {/* ── HR Module Routes ────────────────────────────────── */}
                      <Route path="employees"        element={<EmployeesPage />} />
                      <Route path="team"             element={<EmployeesPage />} />
                      <Route path="team-operations"  element={<TeamOperationsPage />} />
                      <Route path="operations"       element={<TeamOperationsPage />} />
                      <Route path="leaves"           element={<LeavesPage />} />
                      <Route path="attendance"       element={<AttendancePage />} />
                      <Route path="holiday"          element={<HolidayPage />} />
                      <Route path="holidays"         element={<HolidayPage />} />
                      <Route path="appreciation"     element={<AppreciationPage />} />
                      <Route path="appreciations"    element={<AppreciationPage />} />
                      <Route path="documents"        element={<DocumentationPage />} />
                      <Route path="documentation"    element={<DocumentationPage />} />

                      {/* ── Finance & Payroll Module ────────────────────────── */}
                      <Route path="finance"          element={<ExpensesPage />} />
                      <Route path="finance/expenses" element={<ExpensesPage />} />
                      <Route path="expenses"         element={<ExpensesPage />} />
                      <Route path="payroll"          element={<PayrollPage />} />
                      <Route path="payslips"         element={<PayrollPage />} />
                      <Route path="finance/payroll"  element={<PayrollPage />} />

                      {/* ── CRM Modules: Tickets, Events, Messages, Notices ──── */}
                      <Route path="tickets"      element={<TicketsPage />} />
                      <Route path="events"       element={<CalendarPage />} />
                      <Route path="calendar"     element={<CalendarPage />} />
                      <Route path="messages"     element={<MessagesPage />} />
                      <Route path="chat"         element={<MessagesPage />} />
                      <Route path="notice-board" element={<NoticeBoardPage />} />
                      <Route path="notices"      element={<NoticeBoardPage />} />

                      {/* ── Settings ────────────────────────────────────────── */}
                      <Route path="settings"                 element={<SettingsPage />} />
                      <Route path="profile-settings"         element={<SettingsPage />} />
                      <Route path="security-settings"        element={<SettingsPage />} />
                      <Route path="account/settings/*"       element={<SettingsPage />} />

                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Route>
                  </Routes>
                  </Suspense>
                </BrowserRouter>
              </CRMProvider>
            </WorkProvider>
          </TimerProvider>
        </HRProvider>
      </AuthProvider>
    </ConfirmProvider>
  </ToastProvider>
  </ErrorBoundary>
);
}

export default App;
