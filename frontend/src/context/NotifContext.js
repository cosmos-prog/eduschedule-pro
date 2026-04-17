/**
 * EduSchedule Pro - Contexte de notifications
 * Gère les notifications et alertes en temps réel
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

const NotifContext = createContext(null);

export const NotifProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Ajouter une notification
  const addNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now();
    const notif = { id, message, type, timestamp: new Date() };

    setNotifications(prev => [notif, ...prev]);

    // Supprimer automatiquement après la durée
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }
  }, []);

  // Supprimer une notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Vider toutes les notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    // Raccourcis
    success: (msg) => addNotification(msg, 'success'),
    error: (msg) => addNotification(msg, 'danger', 8000),
    warning: (msg) => addNotification(msg, 'warning', 6000),
    info: (msg) => addNotification(msg, 'info'),
  };

  return (
    <NotifContext.Provider value={value}>
      {children}
    </NotifContext.Provider>
  );
};

export const useNotif = () => {
  const context = useContext(NotifContext);
  if (!context) {
    throw new Error('useNotif doit être utilisé dans un NotifProvider');
  }
  return context;
};

export default NotifContext;
