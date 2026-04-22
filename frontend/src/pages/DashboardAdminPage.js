/**
 * EduSchedule Pro - Tableau de bord Administrateur
 * KPIs, graphiques (Recharts), alertes temps réel, avancement programmes
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Spinner, Badge, ProgressBar } from 'react-bootstrap';
import {
  FaCalendarAlt, FaUserCheck, FaExclamationTriangle,
  FaChalkboardTeacher, FaSchool, FaBookOpen, FaClock,
  FaCheckCircle, FaBell
} from 'react-icons/fa';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { dashboardService } from '../utils/api';
import { formatTime, getDateDuJour } from '../utils/helpers';

const progressColor = (pct) => {
  if (pct >= 80) return 'success';
  if (pct >= 50) return 'info';
  if (pct >= 25) return 'warning';
  return 'danger';
};

const CAHIER_STATUT_LABEL = {
  brouillon:     { label: 'Brouillon',     color: 'secondary' },
  signe_delegue: { label: 'Signé délégué', color: 'info'      },
};

const DashboardAdminPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const response = await dashboardService.getStats('admin', 'semaine');
      setStats(response.data.data);
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  if (loading) {
    return <div className="loading-spinner"><Spinner animation="border" variant="primary" /></div>;
  }

  const chartData = stats?.heures_par_classe?.map(item => ({
    name: item.classe,
    'Planifiées': parseFloat(item.heures_planifiees) || 0,
    'Réalisées':  parseFloat(item.heures_realisees)  || 0,
  })) || [];

  const hasAlertes = (stats?.alertes_non_pointees?.length > 0) || (stats?.cahiers_en_attente?.length > 0);

  return (
    <div>
      <h4 className="mb-4">Tableau de bord — Administration</h4>

      {/* ── Bandeau alerte temps réel ─────────────────────────────── */}
      {hasAlertes && (
        <div className="alert alert-warning d-flex align-items-center gap-2 py-2 mb-4" role="alert">
          <FaBell className="flex-shrink-0" />
          <div>
            {stats.alertes_non_pointees?.length > 0 && (
              <span className="me-3">
                <strong>{stats.alertes_non_pointees.length}</strong> séance(s) non pointée(s) aujourd'hui
              </span>
            )}
            {stats.cahiers_en_attente?.length > 0 && (
              <span>
                <strong>{stats.cahiers_en_attente.length}</strong> cahier(s) en attente de signature
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── KPIs principaux ───────────────────────────────────────── */}
      <Row className="g-3 mb-4">
        <Col xs={6} lg={3}>
          <Card className="stat-card h-100">
            <Card.Body className="text-center">
              <FaCalendarAlt size={28} color="#2980b9" className="mb-2" />
              <div className="stat-value">{stats?.seances_jour ?? 0}</div>
              <div className="stat-label">Séances aujourd'hui</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} lg={3}>
          <Card className="stat-card h-100">
            <Card.Body className="text-center">
              <FaUserCheck size={28} color="#27ae60" className="mb-2" />
              <div className="stat-value">{stats?.taux_presence ?? 0}%</div>
              <div className="stat-label">Taux de présence</div>
              <ProgressBar
                now={stats?.taux_presence ?? 0}
                variant={progressColor(stats?.taux_presence ?? 0)}
                style={{ height: 6, marginTop: 6 }}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} lg={3}>
          <Card className="stat-card h-100">
            <Card.Body className="text-center">
              <FaClock size={28} color="#e67e22" className="mb-2" />
              <div className="stat-value">{stats?.retards_semaine ?? 0}</div>
              <div className="stat-label">Retards cette semaine</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} lg={3}>
          <Card className="stat-card h-100">
            <Card.Body className="text-center">
              <FaExclamationTriangle size={28} color="#e74c3c" className="mb-2" />
              <div className="stat-value">{stats?.seances_non_pointees ?? 0}</div>
              <div className="stat-label">Non pointées aujourd'hui</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── Totaux généraux ───────────────────────────────────────── */}
      <Row className="g-3 mb-4">
        <Col xs={4}>
          <Card className="stat-card h-100 border-start border-4 border-primary">
            <Card.Body className="d-flex align-items-center gap-3">
              <FaChalkboardTeacher size={24} color="#1a5276" />
              <div>
                <div className="fw-bold fs-5">{stats?.nb_enseignants ?? 0}</div>
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
                <div className="fw-bold fs-5">{stats?.nb_classes ?? 0}</div>
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
                <div className="fw-bold fs-5">{stats?.nb_matieres ?? 0}</div>
                <small className="text-muted">Matières</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── Graphique heures + Alertes détaillées ────────────────── */}
      <Row className="g-3 mb-4">
        <Col lg={8}>
          <Card className="stat-card">
            <Card.Body>
              <h6 className="mb-3">Heures planifiées vs réalisées — semaine en cours</h6>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis unit="h" tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => `${v}h`} />
                    <Legend />
                    <Bar dataKey="Planifiées" fill="#2980b9" radius={[3,3,0,0]} />
                    <Bar dataKey="Réalisées"  fill="#27ae60" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted text-center py-5">Aucune donnée pour cette semaine</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="stat-card h-100">
            <Card.Body>
              <h6 className="mb-3 d-flex align-items-center gap-2">
                <FaExclamationTriangle className="text-danger" /> Alertes en temps réel
              </h6>

              {/* Séances non pointées aujourd'hui */}
              {stats?.alertes_non_pointees?.length > 0 ? (
                stats.alertes_non_pointees.map((a, i) => (
                  <div key={i} className="d-flex gap-2 mb-2 p-2 rounded" style={{ backgroundColor: '#fdedec', fontSize: '0.8rem' }}>
                    <Badge bg="danger" className="flex-shrink-0" style={{ fontSize: '0.7rem' }}>
                      {formatTime(a.heure_debut)}
                    </Badge>
                    <div>
                      <div className="fw-bold">{a.matiere_libelle} — {a.classe_libelle}</div>
                      <div className="text-muted">{a.enseignant_nom} · {a.salle_code}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="d-flex align-items-center gap-2 mb-3 p-2 rounded text-success" style={{ backgroundColor: '#d5f5e3', fontSize: '0.82rem' }}>
                  <FaCheckCircle /> Toutes les séances sont pointées
                </div>
              )}

              <hr className="my-2" />

              {/* Cahiers en attente */}
              <div style={{ fontSize: '0.8rem', color: '#7f8c8d', marginBottom: 6 }}>
                <FaBookOpen className="me-1" />
                Cahiers en attente ({stats?.cahiers_non_signes ?? 0})
              </div>
              {stats?.cahiers_en_attente?.slice(0, 4).map((c, i) => {
                const cfg = CAHIER_STATUT_LABEL[c.statut] || { label: c.statut, color: 'secondary' };
                return (
                  <div key={i} className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '0.78rem' }}>
                    <span className="text-truncate me-1" style={{ maxWidth: '70%' }}>
                      {c.semaine_debut ? getDateDuJour(c.semaine_debut, c.jour) : c.jour} · {c.matiere_libelle}
                    </span>
                    <Badge bg={cfg.color} style={{ fontSize: '0.65rem', flexShrink: 0 }}>{cfg.label}</Badge>
                  </div>
                );
              })}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── Avancement des programmes ──────────────────────────────── */}
      {stats?.avancement_programmes?.length > 0 && (
        <Card className="stat-card">
          <Card.Body>
            <h6 className="mb-3">Avancement des programmes par matière et classe</h6>
            <Row className="g-3">
              {stats.avancement_programmes.map((item, i) => {
                const pct = parseInt(item.avancement_pct) || 0;
                return (
                  <Col md={6} lg={4} key={i}>
                    <div className="p-2 border rounded" style={{ fontSize: '0.82rem' }}>
                      <div className="d-flex justify-content-between mb-1">
                        <span>
                          <strong>{item.matiere}</strong>
                          <span className="text-muted ms-1">· {item.classe_code || item.classe}</span>
                        </span>
                        <span className={`text-${progressColor(pct)} fw-bold`}>{pct}%</span>
                      </div>
                      <ProgressBar
                        now={pct}
                        variant={progressColor(pct)}
                        style={{ height: 7, borderRadius: 4 }}
                      />
                      <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                        {item.seances_cloturees} / {item.total_seances} séances clôturées
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default DashboardAdminPage;
