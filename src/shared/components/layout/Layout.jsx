import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { useAuth } from '../../context/AuthContext';

export const Layout = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-close mobile drawer when location / route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!currentUser || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

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
          <Outlet />
        </main>
      </div>
    </div>
  );
};
