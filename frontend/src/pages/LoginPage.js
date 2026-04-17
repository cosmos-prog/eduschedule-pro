/**
 * EduSchedule Pro - Page de connexion
 */
import React, { useState } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Form, Button, Spinner, Alert } from 'react-bootstrap';
import { FaEnvelope, FaLock, FaSignInAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { role: 'Admin',       email: 'admin@eduschedule.pro',      password: 'password' },
  { role: 'Enseignant',  email: 'cedric.bere@isge.edu',       password: 'password' },
  { role: 'Délégué',     email: 'delegue.l1@isge.edu',        password: 'password' },
  { role: 'Surveillant', email: 'surveillant@isge.edu',       password: 'password' },
  { role: 'Comptable',   email: 'comptable@isge.edu',         password: 'password' },
];

const LoginPage = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [activeDemo, setActiveDemo] = useState(null);
  const { login, isAuthenticated, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // URL de retour après login (ex: /pointage?token=XXX)
  const from = location.state?.from?.pathname
    ? location.state.from.pathname + (location.state.from.search || '')
    : null;

  if (isAuthenticated) {
    return <Navigate to={from || getDashboardPath()} replace />;
  }

  const fillDemo = (account, index) => {
    setEmail(account.email);
    setPassword(account.password);
    setActiveDemo(index);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        // Rediriger vers la page d'origine (QR pointage ou dashboard)
        navigate(from || getDashboardPath(), { replace: true });
      } else {
        setError(result.message || 'Identifiants incorrects');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* En-tête */}
        <div className="text-center mb-4">
          <h2>EduSchedule Pro</h2>
          <p className="subtitle">Système de Gestion des Emplois du Temps</p>
        </div>


        {/* Comptes de démonstration cliquables */}
        <div className="demo-accounts mb-4">
          <p className="demo-title">Connexion rapide :</p>
          <div className="demo-grid">
            {DEMO_ACCOUNTS.map((account, i) => (
              <button
                key={i}
                type="button"
                className={`demo-btn ${activeDemo === i ? 'active' : ''}`}
                onClick={() => fillDemo(account, i)}
              >
                {account.role}
              </button>
            ))}
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <Alert variant="danger" className="py-2" style={{ fontSize: '0.9rem' }}>
            {error}
          </Alert>
        )}

        {/* Formulaire */}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label><FaEnvelope className="me-2" />Adresse email</Form.Label>
            <Form.Control
              type="email"
              placeholder="votre.email@isge.edu"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setActiveDemo(null); }}
              required
              autoFocus
              size="lg"
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label><FaLock className="me-2" />Mot de passe</Form.Label>
            <Form.Control
              type="password"
              placeholder="Votre mot de passe"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setActiveDemo(null); }}
              required
              size="lg"
            />
          </Form.Group>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-100"
            disabled={loading}
          >
            {loading ? (
              <><Spinner animation="border" size="sm" className="me-2" />Connexion...</>
            ) : (
              <><FaSignInAlt className="me-2" />Se connecter</>
            )}
          </Button>
        </Form>

      </div>
    </div>
  );
};

export default LoginPage;
