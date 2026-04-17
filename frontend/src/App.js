/**
 * EduSchedule Pro - Composant principal App
 * Configuration du routage React Router v6 avec protection par rôle
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Spinner } from 'react-bootstrap';

// Composants de layout
import DashboardLayout from './components/DashboardLayout';
import PrivateRoute from './components/PrivateRoute';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardAdminPage from './pages/DashboardAdminPage';
import DashboardEnseignantPage from './pages/DashboardEnseignantPage';
import DashboardDeleguePage from './pages/DashboardDeleguePage';
import EmploiTempsPage from './pages/EmploiTempsPage';
import PointagePage from './pages/PointagePage';
import CahiersPage from './pages/CahiersPage';
import VacationsPage from './pages/VacationsPage';
import GestionPage from './pages/GestionPage';
import RapportsPage from './pages/RapportsPage';
import LogsPage from './pages/LogsPage';

const App = () => {
  const { loading, isAuthenticated, getDashboardPath } = useAuth();

  // Spinner pendant le chargement initial
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Chargement d'EduSchedule Pro...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Page de connexion */}
      <Route path="/login" element={<LoginPage />} />

      {/* Routes protégées avec layout Dashboard */}
      <Route
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        {/* Dashboards par rôle */}
        <Route
          path="/dashboard/admin"
          element={
            <PrivateRoute roles={['admin', 'surveillant', 'comptable']}>
              <DashboardAdminPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/enseignant"
          element={
            <PrivateRoute roles={['enseignant']}>
              <DashboardEnseignantPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/delegue"
          element={
            <PrivateRoute roles={['delegue']}>
              <DashboardDeleguePage />
            </PrivateRoute>
          }
        />

        {/* Emploi du temps (tous les utilisateurs) */}
        <Route path="/emploi-temps" element={<EmploiTempsPage />} />

        {/* Gestion CRUD (admin uniquement) */}
        <Route
          path="/classes"
          element={
            <PrivateRoute roles={['admin']}>
              <GestionPage entity="classes" />
            </PrivateRoute>
          }
        />
        <Route
          path="/matieres"
          element={
            <PrivateRoute roles={['admin']}>
              <GestionPage entity="matieres" />
            </PrivateRoute>
          }
        />
        <Route
          path="/enseignants"
          element={
            <PrivateRoute roles={['admin']}>
              <GestionPage entity="enseignants" />
            </PrivateRoute>
          }
        />
        <Route
          path="/salles"
          element={
            <PrivateRoute roles={['admin']}>
              <GestionPage entity="salles" />
            </PrivateRoute>
          }
        />

        {/* Pointage QR-Code */}
        <Route
          path="/pointage"
          element={
            <PrivateRoute roles={['admin', 'surveillant', 'enseignant']}>
              <PointagePage />
            </PrivateRoute>
          }
        />

        {/* Cahiers de texte */}
        <Route
          path="/cahiers"
          element={
            <PrivateRoute roles={['admin', 'delegue', 'enseignant', 'surveillant']}>
              <CahiersPage />
            </PrivateRoute>
          }
        />

        {/* Fiches de vacation */}
        <Route
          path="/vacations"
          element={
            <PrivateRoute roles={['admin', 'enseignant', 'surveillant', 'comptable']}>
              <VacationsPage />
            </PrivateRoute>
          }
        />

        {/* Rapports */}
        <Route
          path="/rapports"
          element={
            <PrivateRoute roles={['admin']}>
              <RapportsPage />
            </PrivateRoute>
          }
        />

        {/* Journal d'activité */}
        <Route
          path="/logs"
          element={
            <PrivateRoute roles={['admin']}>
              <LogsPage />
            </PrivateRoute>
          }
        />
      </Route>

      {/* Redirection par défaut */}
      <Route
        path="/"
        element={
          isAuthenticated
            ? <Navigate to={getDashboardPath()} replace />
            : <Navigate to="/login" replace />
        }
      />

      {/* Route 404 */}
      <Route
        path="*"
        element={
          <div className="text-center py-5">
            <h1 className="text-muted">404</h1>
            <p>Page non trouvée</p>
            <a href="/" className="btn btn-primary">Retour à l'accueil</a>
          </div>
        }
      />
    </Routes>
  );
};

export default App;
