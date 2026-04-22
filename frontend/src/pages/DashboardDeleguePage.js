/**
 * EduSchedule Pro - Tableau de bord Délégué
 * Emploi du temps semaine, cahiers à remplir en priorité, historique signé
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Spinner, Badge, Table, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt, FaEdit, FaHistory,
  FaCheckCircle, FaClock, FaTimesCircle, FaHourglassHalf
} from 'react-icons/fa';
import { dashboardService } from '../utils/api';
import { formatTime, STATUT_COLORS, getDateDuJour, getSemaineLabel } from '../utils/helpers';

/* ─── Statut d'affichage d'un créneau ─── */
const getCreneauStatut = (s) => {
  if (s.cahier_statut === 'cloture')        return { label: 'Clôturée',  color: 'success',   icon: <FaCheckCircle /> };
  if (s.pointage_statut === 'retard')       return { label: 'Retard',    color: 'warning',   icon: <FaClock /> };
  if (s.pointage_statut === 'valide')       return { label: 'Pointée',   color: 'primary',   icon: <FaCheckCircle /> };
  if (s.semaine_debut) {
    const jours = ['lundi','mardi','mercredi','jeudi','vendredi','samedi'];
    const idx = jours.indexOf(s.jour);
    if (idx !== -1) {
      const d = new Date(s.semaine_debut);
      d.setDate(d.getDate() + idx);
      const [h, m] = (s.heure_debut || '00:00').split(':').map(Number);
      d.setHours(h, m, 0, 0);
      if (d > new Date()) return { label: 'À venir', color: 'secondary', icon: <FaHourglassHalf /> };
    }
  }
  return { label: 'En attente', color: 'light', textColor: 'dark', icon: null };
};

const CAHIER_CFG = {
  brouillon:        { label: 'Brouillon',     color: 'secondary' },
  signe_delegue:    { label: 'Signé délégué', color: 'info'      },
  signe_enseignant: { label: 'Signé ens.',    color: 'primary'   },
  cloture:          { label: 'Clôturé',       color: 'success'   },
};

const DashboardDeleguePage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadStats = useCallback(async () => {
    try {
      const response = await dashboardService.getStats('delegue');
      setStats(response.data.data);
    } catch (err) {
      console.error('Erreur:', err);
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

  const cahiersARemplir = stats?.cahiers_a_remplir || [];
  const emploiTemps     = stats?.emploi_temps      || [];
  const cahiersSigns    = stats?.cahiers_signes     || [];
  const lundiSemaine    = emploiTemps[0]?.semaine_debut || null;

  return (
    <div>
      <h4 className="mb-1">Espace Délégué</h4>
      {lundiSemaine && (
        <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>
          Semaine {getSemaineLabel(lundiSemaine)}
        </p>
      )}

      {/* ── KPIs rapides ─────────────────────────────────────────── */}
      <Row className="g-3 mb-4">
        <Col xs={4}>
          <Card className="stat-card h-100 border-start border-4 border-primary">
            <Card.Body className="text-center py-3">
              <div className="fw-bold fs-4 text-primary">{emploiTemps.length}</div>
              <small className="text-muted">Séances cette semaine</small>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={4}>
          <Card className={`stat-card h-100 border-start border-4 border-${cahiersARemplir.length > 0 ? 'warning' : 'success'}`}>
            <Card.Body className="text-center py-3">
              <div className={`fw-bold fs-4 text-${cahiersARemplir.length > 0 ? 'warning' : 'success'}`}>
                {cahiersARemplir.length}
              </div>
              <small className="text-muted">Cahiers à remplir</small>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={4}>
          <Card className="stat-card h-100 border-start border-4 border-success">
            <Card.Body className="text-center py-3">
              <div className="fw-bold fs-4 text-success">{cahiersSigns.length}</div>
              <small className="text-muted">Cahiers signés</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── Cahiers à remplir — PRIORITÉ ─────────────────────────── */}
      {cahiersARemplir.length > 0 && (
        <Card className="stat-card mb-4 border-start border-4 border-warning">
          <Card.Body>
            <h6 className="mb-3 d-flex align-items-center gap-2">
              <FaEdit className="text-warning" />
              Cahiers de texte à remplir
              <Badge bg="warning" text="dark">{cahiersARemplir.length}</Badge>
            </h6>
            <Table responsive hover size="sm">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Horaire</th>
                  <th>Matière</th>
                  <th>Enseignant</th>
                  <th>État</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cahiersARemplir.map((c, i) => (
                  <tr key={i}>
                    <td className="fw-bold" style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {c.semaine_debut
                        ? getDateDuJour(c.semaine_debut, c.jour)
                        : <span className="text-capitalize">{c.jour}</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {formatTime(c.heure_debut)}–{formatTime(c.heure_fin)}
                    </td>
                    <td>{c.matiere_libelle}</td>
                    <td>{c.enseignant_nom}</td>
                    <td>
                      {c.cahier_id
                        ? <Badge bg="secondary">Brouillon</Badge>
                        : c.pointage_statut === 'retard'
                          ? <Badge bg="warning" text="dark">Retard</Badge>
                          : <Badge bg="primary">Pointée</Badge>}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={() => navigate(`/cahiers?creneau=${c.creneau_id}`)}
                      >
                        {c.cahier_id ? 'Compléter' : 'Remplir'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* ── Emploi du temps de la semaine ────────────────────────── */}
      <Card className="stat-card mb-4">
        <Card.Body>
          <h6 className="mb-3"><FaCalendarAlt className="me-2 text-primary" />Emploi du temps de la classe</h6>
          {emploiTemps.length === 0 ? (
            <p className="text-muted text-center py-3">Aucun emploi du temps publié pour cette semaine</p>
          ) : (
            <Table responsive hover size="sm">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Horaire</th>
                  <th>Matière</th>
                  <th>Enseignant</th>
                  <th>Salle</th>
                  <th>Statut</th>
                  <th>Cahier</th>
                </tr>
              </thead>
              <tbody>
                {emploiTemps.map((s, i) => {
                  const statut    = getCreneauStatut(s);
                  const cahierCfg = CAHIER_CFG[s.cahier_statut];
                  return (
                    <tr key={i}>
                      <td className="fw-bold" style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {s.semaine_debut
                          ? getDateDuJour(s.semaine_debut, s.jour)
                          : <span className="text-capitalize">{s.jour}</span>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {formatTime(s.heure_debut)}–{formatTime(s.heure_fin)}
                      </td>
                      <td>{s.matiere_libelle}</td>
                      <td>{s.enseignant_nom}</td>
                      <td><Badge bg="secondary">{s.salle_code}</Badge></td>
                      <td>
                        <Badge bg={statut.color} text={statut.textColor} className="d-inline-flex align-items-center gap-1">
                          {statut.icon} {statut.label}
                        </Badge>
                      </td>
                      <td>
                        {cahierCfg
                          ? <Badge bg={cahierCfg.color}>{cahierCfg.label}</Badge>
                          : <Badge bg="light" text="dark">—</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* ── Historique des cahiers signés ─────────────────────────── */}
      {cahiersSigns.length > 0 && (
        <Card className="stat-card">
          <Card.Body>
            <h6 className="mb-3"><FaHistory className="me-2 text-secondary" />Historique des cahiers signés</h6>
            <Table responsive hover size="sm">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Matière</th>
                  <th>Enseignant</th>
                  <th>Titre</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {cahiersSigns.map((c, i) => {
                  const cfg = CAHIER_CFG[c.statut] || { label: c.statut, color: 'secondary' };
                  return (
                    <tr key={i}>
                      <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {c.semaine_debut
                          ? getDateDuJour(c.semaine_debut, c.jour)
                          : <span className="text-capitalize">{c.jour}</span>}
                      </td>
                      <td>{c.matiere_libelle}</td>
                      <td>{c.enseignant_nom}</td>
                      <td className="text-truncate" style={{ maxWidth: 200 }}>
                        {c.titre_cours || <span className="text-muted">—</span>}
                      </td>
                      <td><Badge bg={cfg.color}>{cfg.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default DashboardDeleguePage;
