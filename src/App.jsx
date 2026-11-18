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

// Route-Level Code Splitting (lazy-loads each page chunk on demand for fast initial load)
const lazyNamed = (importer, name) => lazy(() => importer().then(m => ({ default: m[name] })));

const ProjectsPage       = lazyNamed(() => import('./modules/work/pages/ProjectsPage'), 'ProjectsPage');
const TasksPage          = lazyNamed(() => import('./modules/work/pages/TasksPage'), 'TasksPage');
const TimesheetPage      = lazyNamed(() => import('./modules/work/pages/TimesheetPage'), 'TimesheetPage');
const LeavesPage         = lazyNamed(() => import('./modules/hr/pages/LeavesPage'), 'LeavesPage');
const AttendancePage     = lazyNamed(() => import('./modules/hr/pages/AttendancePage'), 'AttendancePage');
const HolidayPage        = lazyNamed(() => import('./modules/hr/pages/HolidayPage'), 'HolidayPage');
const AppreciationPage   = lazyNamed(() => import('./modules/hr/pages/AppreciationPage'), 'AppreciationPage');
const DashboardPage      = lazyNamed(() => import('./modules/hr/pages/DashboardPage'), 'DashboardPage');
const EmployeesPage      = lazyNamed(() => import('./modules/hr/pages/EmployeesPage'), 'EmployeesPage');
const TeamOperationsPage = lazyNamed(() => import('./modules/hr/pages/TeamOperationsPage'), 'TeamOperationsPage');
const DocumentationPage  = lazyNamed(() => import('./modules/hr/pages/DocumentationPage'), 'DocumentationPage');
const TicketsPage        = lazyNamed(() => import('./modules/crm/pages/TicketsPage'), 'TicketsPage');
const CalendarPage       = lazyNamed(() => import('./modules/crm/pages/CalendarPage'), 'CalendarPage');
const NoticeBoardPage    = lazyNamed(() => import('./modules/crm/pages/NoticeBoardPage'), 'NoticeBoardPage');
const LeadsPage          = lazyNamed(() => import('./modules/crm/pages/LeadsPage'), 'LeadsPage');
const MessagesPage       = lazyNamed(() => import('./modules/crm/pages/MessagesPage'), 'MessagesPage');
const ExpensesPage       = lazyNamed(() => import('./modules/finance/pages/ExpensesPage'), 'ExpensesPage');
const PayrollPage        = lazyNamed(() => import('./modules/finance/pages/PayrollPage'), 'PayrollPage');
const SettingsPage       = lazyNamed(() => import('./modules/settings/pages/SettingsPage'), 'SettingsPage');

const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-[260px] text-xs font-semibold text-slate-500 dark:text-slate-400">
    Loading workspace...
  </div>
);


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
