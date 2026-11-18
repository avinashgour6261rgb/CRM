import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { useAuth } from '../../context/AuthContext';
import { useHR } from '../../../modules/hr/context/HRContext';
import { canAccessModule } from '../../utils/permissionUtils';

// Map protected URL paths to their RBAC module key
const getRequiredModuleForPath = (pathname) => {
  const p = String(pathname || '').toLowerCase();
  if (p.startsWith('/employees') || p.startsWith('/team-directory') || p === '/team') return 'employees';
  if (p.startsWith('/team-operations') || p.startsWith('/operations')) return 'liveOperations';
  if (p.startsWith('/leads') || p.startsWith('/lead-contact')) return 'leads';
  if (p.startsWith('/leaves')) return 'leaves';
  if (p.startsWith('/attendance')) return 'attendance';
  if (p.startsWith('/appreciation')) return 'appreciation';
  if (p.startsWith('/documents') || p.startsWith('/documentation')) return 'documentation';
  if (p.startsWith('/projects')) return 'projects';
  if (p.startsWith('/tasks') || p.startsWith('/timesheet')) return 'tasks';
  if (p.startsWith('/payroll') || p.startsWith('/payslips') || p.startsWith('/finance/payroll')) return 'payroll';
  if (p.startsWith('/expenses') || p.startsWith('/finance')) return 'expenses';
  if (p.startsWith('/tickets')) return 'tickets';
  if (p.startsWith('/events') || p.startsWith('/calendar')) return 'events';
  return null;
};

export const Layout = () => {
  const { currentUser: authUser, isAuthenticated } = useAuth();
  const { employees = [] } = useHR() || {};
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [permTick, setPermTick] = useState(0);

  // Auto-close mobile drawer when location / route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Re-evaluate route access immediately whenever permissions change live
  useEffect(() => {
    const bump = () => setPermTick(t => t + 1);
    window.addEventListener('ems_permissions_updated', bump);
    window.addEventListener('hrms_storage_change', bump);
    return () => {
      window.removeEventListener('ems_permissions_updated', bump);
      window.removeEventListener('hrms_storage_change', bump);
    };
  }, []);

  const effectiveUser = useMemo(() => {
    if (!authUser) return null;
    const matched = (employees || []).find(e =>
      (authUser._id && String(e._id) === String(authUser._id)) ||
      (authUser.employeeCode && String(e.employeeCode).toUpperCase() === String(authUser.employeeCode).toUpperCase())
    );
    if (!matched) return authUser;
    const hasAuthPerms = authUser.permissions && Object.keys(authUser.permissions).length > 0;
    const hasDbPerms = matched.permissions && Object.keys(matched.permissions).length > 0;
    return {
      ...authUser,
      ...matched,
      permissions: hasDbPerms ? matched.permissions : (hasAuthPerms ? authUser.permissions : {}),
      systemRole: matched.systemRole || authUser.systemRole,
      isDelegatedAdmin: matched.isDelegatedAdmin !== undefined ? Boolean(matched.isDelegatedAdmin) : Boolean(authUser.isDelegatedAdmin)
    };
  }, [authUser, employees, permTick]);

  if (!authUser || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const requiredModule = getRequiredModuleForPath(location.pathname);
  const hasRouteAccess = !requiredModule || canAccessModule(effectiveUser, requiredModule);

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950 overflow-x-hidden relative">
      {/* Mobile Drawer Backdrop overlay to tap anywhere to dismiss sidebar */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[140] lg:hidden animate-fade-in transition-opacity cursor-pointer"
          title="Click to close menu"
          aria-label="Close menu backdrop"
        />
      )}
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden bg-slate-100 dark:bg-slate-950">
        <TopNavbar
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
        />
        <main className="flex-1 p-3.5 sm:p-5 md:px-6 md:py-5 max-w-[1680px] w-full mx-auto box-border min-w-0">
          {hasRouteAccess ? (
            <Outlet />
          ) : (
            <div className="flex items-center justify-center min-h-[60vh] p-4">
              <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-200 dark:border-amber-800">
                  <ShieldAlert size={24} />
                </div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0">
                  Access Restricted
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 mb-4 leading-relaxed">
                  You currently do not have permission to access this module. Please contact your Administrator if you need access enabled.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard', { replace: true })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold border-0 cursor-pointer transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Dashboard</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
