/**
 * EduSchedule Pro - Page Rapports
 * Génération de rapports : présence, avancement programme, vacations
 */
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Spinner, Table, Badge } from 'react-bootstrap';
import { FaChartBar, FaDownload } from 'react-icons/fa';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { dashboardService } from '../utils/api';
import { useNotif } from '../context/NotifContext';

const COLORS = ['#1a5276', '#27ae60', '#e67e22', '#e74c3c', '#8e44ad', '#3498db'];

const RapportsPage = () => {
  const notif = useNotif();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeRapport, setTypeRapport] = useState('presence');

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await dashboardService.getStats('admin', 'mois');
        setStats(response.data.data);
      } catch {
        notif.error('Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="loading-spinner"><Spinner animation="border" variant="primary" /></div>;
  }

  const chartData = stats?.heures_par_classe?.map(item => ({
    name: item.classe,
    planifiees: item.heures_planifiees || 0,
    realisees: item.heures_realisees || 0,
    taux: item.heures_planifiees > 0
      ? Math.round((item.heures_realisees / item.heures_planifiees) * 100)
      : 0,
  })) || [];

  const pieData = [
    { name: 'Présents', value: stats?.taux_presence || 0 },
    { name: 'Absents', value: 100 - (stats?.taux_presence || 0) },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4><FaChartBar className="me-2" />Rapports</h4>
        <Button variant="outline-primary" onClick={() => window.print()}>
          <FaDownload className="me-1" /> Imprimer
        </Button>
      </div>

      {/* Sélecteur de type */}
      <Card className="mb-4 no-print">
        <Card.Body>
          <Form.Group>
            <Form.Label>Type de rapport</Form.Label>
            <Form.Select value={typeRapport} onChange={(e) => setTypeRapport(e.target.value)}>
              <option value="presence">Rapport de présence</option>
              <option value="avancement">Avancement du programme</option>
              <option value="vacations">Synthèse des vacations</option>
            </Form.Select>
          </Form.Group>
        </Card.Body>
      </Card>

      {/* Rapport de présence */}
      {typeRapport === 'presence' && (
        <Row className="g-4">
          <Col lg={4}>
            <Card className="stat-card h-100">
              <Card.Body>
                <h6 className="text-center mb-3">Taux de présence global</h6>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={90}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center mt-2">
                  <span className="fs-3 fw-bold text-primary">{stats?.taux_presence || 0}%</span>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={8}>
            <Card className="stat-card h-100">
              <Card.Body>
                <h6 className="mb-3">Présence par classe</h6>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="planifiees" name="Heures planifiées" fill="#2980b9" />
                    <Bar dataKey="realisees" name="Heures réalisées" fill="#27ae60" />
                  </BarChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Rapport avancement */}
      {typeRapport === 'avancement' && (
        <Card className="stat-card">
          <Card.Body>
            <h6 className="mb-3">Avancement du programme par classe</h6>
            {chartData.length > 0 ? (
              <Table responsive hover>
                <thead className="table-light">
                  <tr>
                    <th>Classe</th>
                    <th>Heures planifiées</th>
                    <th>Heures réalisées</th>
                    <th>Taux d'avancement</th>
                    <th>Progression</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((item, i) => (
                    <tr key={i}>
                      <td className="fw-bold">{item.name}</td>
                      <td>{item.planifiees}h</td>
                      <td>{item.realisees}h</td>
                      <td>
                        <Badge bg={item.taux >= 75 ? 'success' : item.taux >= 50 ? 'warning' : 'danger'}>
                          {item.taux}%
                        </Badge>
                      </td>
                      <td style={{ width: '30%' }}>
                        <div className="progress" style={{ height: '20px' }}>
                          <div
                            className={`progress-bar bg-${item.taux >= 75 ? 'success' : item.taux >= 50 ? 'warning' : 'danger'}`}
                            style={{ width: `${item.taux}%` }}
                          >
                            {item.taux}%
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-muted text-center py-4">Aucune donnée disponible</p>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Rapport vacations */}
      {typeRapport === 'vacations' && (
        <Card className="stat-card">
          <Card.Body>
            <h6 className="mb-3">Synthèse des vacations</h6>
            <Row className="g-3 mb-4">
              <Col md={4}>
                <Card className="border-start border-4 border-primary text-center py-3">
                  <div className="fs-4 fw-bold text-primary">{stats?.nb_enseignants || 0}</div>
                  <small className="text-muted">Enseignants actifs</small>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="border-start border-4 border-success text-center py-3">
                  <div className="fs-4 fw-bold text-success">{stats?.taux_presence || 0}%</div>
                  <small className="text-muted">Taux global de présence</small>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="border-start border-4 border-warning text-center py-3">
                  <div className="fs-4 fw-bold text-warning">{stats?.retards_semaine || 0}</div>
                  <small className="text-muted">Retards cette semaine</small>
                </Card>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default RapportsPage;
