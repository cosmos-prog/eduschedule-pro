/**
 * EduSchedule Pro - Composant PrivateRoute
 * HOC de protection des routes par rôle
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from 'react-bootstrap';

/**
 * Route protégée par authentification et rôle
 * @param {Array|string} roles - Rôles autorisés (optionnel, tous les rôles si omis)
 * @param {React.ReactNode} children - Composant enfant à afficher
 */
const PrivateRoute = ({ roles, children }) => {
  const { user, loading, isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  // Afficher un spinner pendant le chargement
  if (loading) {
    return (
      <div className="loading-spinner">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Rediriger vers login en sauvegardant l'URL actuelle (token inclus)
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Vérifier le rôle si spécifié
  if (roles && !hasRole(roles)) {
    return (
      <div className="text-center py-5">
        <h3 className="text-danger">Accès interdit</h3>
        <p className="text-muted">
          Vous n'avez pas les droits nécessaires pour accéder à cette page.
        </p>
        <p className="text-muted">
          Votre rôle actuel : <strong className="text-capitalize">{user?.role}</strong>
        </p>
      </div>
    );
  }

  return children;
};

export default PrivateRoute;
