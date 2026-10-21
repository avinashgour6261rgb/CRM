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
    <div className="app-container flex min-h-screen bg-[#f4f6fa]" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f6fa' }}>
      <Sidebar />
      <div className="main-content-wrapper flex-1 flex flex-col min-w-0 h-screen overflow-y-auto" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
        <TopNavbar />
        <main className="content-body flex-1 p-4 md:p-6 max-w-[1680px] w-full mx-auto" style={{ flex: 1, padding: '20px 24px', maxWidth: '1680px', width: '100%', margin: '0 auto', boxSizing: 'border-box', minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

