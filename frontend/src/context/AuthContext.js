/**
 * EduSchedule Pro - Contexte d'authentification
 * Gère le state utilisateur, le token JWT, et les redirections par rôle
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('eduschedule_token'));
  const [loading, setLoading] = useState(true);

  // Vérifier le token au chargement
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await authService.me();
          if (response.data.success) {
            setUser(response.data.user);
          } else {
            logout();
          }
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Connexion
  const login = useCallback(async (email, password) => {
    const response = await authService.login(email, password);
    if (response.data.success) {
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('eduschedule_token', newToken);
      localStorage.setItem('eduschedule_user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return { success: true, user: userData };
    }
    return { success: false, message: response.data.message };
  }, []);

  // Déconnexion
  const logout = useCallback(async () => {
    try { await authService.logout(); } catch {} // eslint-disable-line no-empty
    localStorage.removeItem('eduschedule_token');
    localStorage.removeItem('eduschedule_user');
    setToken(null);
    setUser(null);
  }, []);

  // Vérifier si l'utilisateur a un rôle spécifique
  const hasRole = useCallback((roles) => {
    if (!user) return false;
    if (typeof roles === 'string') return user.role === roles;
    return roles.includes(user.role);
  }, [user]);

  // Obtenir le chemin du dashboard selon le rôle
  const getDashboardPath = useCallback(() => {
    if (!user) return '/login';
    switch (user.role) {
      case 'admin': return '/dashboard/admin';
      case 'enseignant': return '/dashboard/enseignant';
      case 'delegue': return '/dashboard/delegue';
      case 'surveillant': return '/dashboard/admin';
      case 'comptable': return '/dashboard/admin';
      case 'etudiant': return '/emploi-temps';
      default: return '/login';
    }
  }, [user]);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    hasRole,
    getDashboardPath,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

export default AuthContext;
