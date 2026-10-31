import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { useAuth } from '../../context/AuthContext';

export const Layout = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!currentUser || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden bg-slate-100 dark:bg-slate-950">
        <TopNavbar />
        <main className="flex-1 p-5 md:px-6 md:py-5 max-w-[1680px] w-full mx-auto box-border min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
