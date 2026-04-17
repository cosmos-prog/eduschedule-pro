/**
 * EduSchedule Pro - Layout principal du Dashboard
 * Navbar + Sidebar + Zone de contenu
 */
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { ToastContainer } from 'react-toastify';
import { useNotif } from '../context/NotifContext';
import { Alert } from 'react-bootstrap';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { notifications, removeNotification } = useNotif();

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="d-md-none"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999
          }}
          onClick={closeSidebar}
        />
      )}

      {/* Zone principale */}
      <div className="main-content">
        <Navbar onToggleSidebar={toggleSidebar} />

        {/* Notifications */}
        <div className="mt-2">
          {notifications.slice(0, 3).map(notif => (
            <Alert
              key={notif.id}
              variant={notif.type}
              dismissible
              onClose={() => removeNotification(notif.id)}
              className="mb-2 py-2"
              style={{ fontSize: '0.9rem' }}
            >
              {notif.message}
            </Alert>
          ))}
        </div>

        {/* Contenu de la page */}
        <div className="py-3">
          <Outlet />
        </div>
      </div>

      {/* Toasts */}
      <ToastContainer position="bottom-right" autoClose={4000} />
    </div>
  );
};

export default DashboardLayout;
