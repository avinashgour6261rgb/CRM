import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Shared Providers & Layout
import { ToastProvider } from './shared/context/ToastContext';
import { ConfirmProvider } from './shared/context/ConfirmContext';
import { AuthProvider } from './shared/context/AuthContext';
import { TimerProvider } from './shared/context/TimerContext';
import { Layout } from './shared/components/layout/Layout';
import { ErrorBoundary } from './shared/components/common/ErrorBoundary';
import { LoginPage } from './modules/auth/pages/LoginPage';

// HR Module Provider
import { HRProvider } from './modules/hr/context/HRContext';

// Work Module Provider & Pages
import { WorkProvider } from './modules/work/context/WorkContext';
import { ProjectsPage } from './modules/work/pages/ProjectsPage';
import { TasksPage } from './modules/work/pages/TasksPage';
import { TimesheetPage } from './modules/work/pages/TimesheetPage';

// HR Module Pages
import { LeavesPage } from './modules/hr/pages/LeavesPage';
import { AttendancePage } from './modules/hr/pages/AttendancePage';
import { HolidayPage } from './modules/hr/pages/HolidayPage';
import { AppreciationPage } from './modules/hr/pages/AppreciationPage';
import { DashboardPage } from './modules/hr/pages/DashboardPage';
import { EmployeesPage } from './modules/hr/pages/EmployeesPage';
import { TeamOperationsPage } from './modules/hr/pages/TeamOperationsPage';

// CRM Module Provider & Pages
import { CRMProvider } from './shared/context/CRMContext';
import { TicketsPage } from './modules/crm/pages/TicketsPage';
import { CalendarPage } from './modules/crm/pages/CalendarPage';
import { NoticeBoardPage } from './modules/crm/pages/NoticeBoardPage';
import { LeadsPage } from './modules/crm/pages/LeadsPage';
import { MessagesPage } from './modules/crm/pages/MessagesPage';
import { ExpensesPage } from './modules/finance/pages/ExpensesPage';
import { PayrollPage } from './modules/finance/pages/PayrollPage';
import { DocumentationPage } from './modules/hr/pages/DocumentationPage';
import { SettingsPage } from './modules/settings/pages/SettingsPage';


export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <HRProvider>
              <TimerProvider>
                <WorkProvider>
                  <CRMProvider>
                  <BrowserRouter>
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
