/**
 * EduSchedule Pro - Tableau de bord Administrateur
 * KPIs, graphiques (Recharts) et alertes en temps réel
 */
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Badge, Table } from 'react-bootstrap';
import {
  FaCalendarAlt, FaUserCheck, FaExclamationTriangle,
  FaChalkboardTeacher, FaSchool, FaBookOpen, FaClock
} from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardService } from '../utils/api';

const DashboardAdminPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await dashboardService.getStats('admin', 'semaine');
        setStats(response.data.data);
      } catch (err) {
        console.error('Erreur chargement stats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="loading-spinner">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Données pour le graphique
  const chartData = stats?.heures_par_classe?.map(item => ({
    name: item.classe,
    planifiees: item.heures_planifiees || 0,
    realisees: item.heures_realisees || 0,
  })) || [];

  return (
    <div>
      <h4 className="mb-4">Tableau de bord - Administration</h4>

      {/* KPIs principaux */}
      <Row className="g-3 mb-4">
        <Col xs={6} lg={3}>
          <Card className="stat-card h-100">
            <Card.Body className="text-center">
              <FaCalendarAlt size={28} color="#2980b9" className="mb-2" />
              <div className="stat-value">{stats?.seances_jour || 0}</div>
              <div className="stat-label">Séances aujourd'hui</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} lg={3}>
          <Card className="stat-card h-100">
            <Card.Body className="text-center">
              <FaUserCheck size={28} color="#27ae60" className="mb-2" />
              <div className="stat-value">{stats?.taux_presence || 0}%</div>
              <div className="stat-label">Taux de présence</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} lg={3}>
          <Card className="stat-card h-100">
            <Card.Body className="text-center">
              <FaClock size={28} color="#e67e22" className="mb-2" />
              <div className="stat-value">{stats?.retards_semaine || 0}</div>
              <div className="stat-label">Retards cette semaine</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} lg={3}>
          <Card className="stat-card h-100">
            <Card.Body className="text-center">
              <FaExclamationTriangle size={28} color="#e74c3c" className="mb-2" />
              <div className="stat-value">{stats?.seances_non_pointees || 0}</div>
              <div className="stat-label">Séances non pointées</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Statistiques détaillées */}
      <Row className="g-3 mb-4">
        <Col xs={4}>
          <Card className="stat-card h-100 border-start border-4 border-primary">
            <Card.Body className="d-flex align-items-center gap-3">
              <FaChalkboardTeacher size={24} color="#1a5276" />
              <div>
                <div className="fw-bold fs-5">{stats?.nb_enseignants || 0}</div>
                <small className="text-muted">Enseignants</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={4}>
          <Card className="stat-card h-100 border-start border-4 border-success">
            <Card.Body className="d-flex align-items-center gap-3">
              <FaSchool size={24} color="#27ae60" />
              <div>
                <div className="fw-bold fs-5">{stats?.nb_classes || 0}</div>
                <small className="text-muted">Classes</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={4}>
          <Card className="stat-card h-100 border-start border-4 border-warning">
            <Card.Body className="d-flex align-items-center gap-3">
              <FaBookOpen size={24} color="#e67e22" />
              <div>
                <div className="fw-bold fs-5">{stats?.nb_matieres || 0}</div>
                <small className="text-muted">Matières</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Graphique : Heures planifiées vs réalisées */}
      <Row className="g-3 mb-4">
        <Col lg={8}>
          <Card className="stat-card">
            <Card.Body>
              <h6 className="mb-3">Heures planifiées vs réalisées par classe</h6>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="planifiees" name="Planifiées" fill="#2980b9" />
                    <Bar dataKey="realisees" name="Réalisées" fill="#27ae60" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted text-center py-5">Aucune donnée disponible</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="stat-card h-100">
            <Card.Body>
              <h6 className="mb-3">Alertes</h6>
              {stats?.seances_non_pointees > 0 && (
                <div className="d-flex align-items-center gap-2 mb-3 p-2 rounded" style={{ backgroundColor: '#fef3e2' }}>
                  <Badge bg="warning" className="p-2"><FaExclamationTriangle /></Badge>
                  <small>{stats.seances_non_pointees} séance(s) non pointée(s) cette semaine</small>
                </div>
              )}
              {stats?.cahiers_non_signes > 0 && (
                <div className="d-flex align-items-center gap-2 mb-3 p-2 rounded" style={{ backgroundColor: '#ebf5fb' }}>
                  <Badge bg="info" className="p-2"><FaBookOpen /></Badge>
                  <small>{stats.cahiers_non_signes} cahier(s) de texte en attente</small>
                </div>
              )}
              {stats?.retards_semaine > 0 && (
                <div className="d-flex align-items-center gap-2 p-2 rounded" style={{ backgroundColor: '#fdedec' }}>
                  <Badge bg="danger" className="p-2"><FaClock /></Badge>
                  <small>{stats.retards_semaine} retard(s) enregistré(s)</small>
                </div>
              )}
              {!stats?.seances_non_pointees && !stats?.cahiers_non_signes && !stats?.retards_semaine && (
                <p className="text-muted text-center py-3">Aucune alerte</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardAdminPage;
