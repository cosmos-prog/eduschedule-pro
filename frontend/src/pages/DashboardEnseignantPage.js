/**
 * EduSchedule Pro - Tableau de bord Enseignant
 * Séances semaine (avec statuts temps réel), fiches vacation, historique mensuel
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Spinner, Badge, Table } from 'react-bootstrap';
import {
  FaCalendarAlt, FaMoneyBillWave, FaHistory,
  FaCheckCircle, FaClock, FaTimesCircle, FaHourglassHalf
} from 'react-icons/fa';
import { dashboardService } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatTime, formatMontant, MOIS_FR, getDateDuJour, getSemaineLabel } from '../utils/helpers';

/* ─── Calcule le statut affiché d'une séance ─── */
const getSeanceStatut = (s) => {
  if (s.cahier_statut === 'cloture')  return { label: 'Clôturée',   color: 'success',   icon: <FaCheckCircle /> };
  if (s.pointage_statut === 'retard') return { label: 'Retard',     color: 'warning',   icon: <FaClock /> };
  if (s.pointage_statut === 'valide') return { label: 'Pointée',    color: 'primary',   icon: <FaCheckCircle /> };
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
  return { label: 'Non pointée', color: 'danger', icon: <FaTimesCircle /> };
};

const VACATION_STATUT = {
  generee:           { label: 'Générée',  color: 'secondary' },
  signee_enseignant: { label: 'Signée',   color: 'info'      },
  visee_surveillant: { label: 'Visée',    color: 'warning'   },
  validee_comptable: { label: 'Validée',  color: 'success'   },
};

const CAHIER_CFG = {
  brouillon:        { label: 'Brouillon',     color: 'secondary' },
  signe_delegue:    { label: 'Signé délégué', color: 'info'      },
  signe_enseignant: { label: 'Signé',         color: 'primary'   },
  cloture:          { label: 'Clôturé',       color: 'success'   },
};

const DashboardEnseignantPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const response = await dashboardService.getStats('enseignant');
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

  const seances    = stats?.seances_semaine    || [];
  const vacations  = stats?.vacations          || [];
  const historique = stats?.historique_mensuel || [];

  const lundiSemaine  = seances[0]?.semaine_debut || null;
  const seancesAVenir    = seances.filter(s => getSeanceStatut(s).label === 'À venir').length;
  const seancesPointees  = seances.filter(s => ['Pointée','Retard','Clôturée'].includes(getSeanceStatut(s).label)).length;
  const seancesCloturees = seances.filter(s => s.cahier_statut === 'cloture').length;

  return (
    <div>
      <h4 className="mb-1">Bienvenue, {user?.prenom} {user?.nom}</h4>
      {lundiSemaine && (
        <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>
          Semaine {getSemaineLabel(lundiSemaine)}
        </p>
      )}

      {/* ── KPIs rapides ─────────────────────────────────────────── */}
      <Row className="g-3 mb-4">
        <Col xs={4}>
          <Card className="stat-card h-100 border-start border-4 border-secondary">
            <Card.Body className="text-center py-3">
              <div className="fw-bold fs-4">{seancesAVenir}</div>
              <small className="text-muted">À venir</small>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={4}>
          <Card className="stat-card h-100 border-start border-4 border-primary">
            <Card.Body className="text-center py-3">
              <div className="fw-bold fs-4 text-primary">{seancesPointees}</div>
              <small className="text-muted">Pointées</small>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={4}>
          <Card className="stat-card h-100 border-start border-4 border-success">
            <Card.Body className="text-center py-3">
              <div className="fw-bold fs-4 text-success">{seancesCloturees}</div>
              <small className="text-muted">Clôturées</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── Séances de la semaine ─────────────────────────────────── */}
      <Card className="stat-card mb-4">
        <Card.Body>
          <h6 className="mb-3">
            <FaCalendarAlt className="me-2 text-primary" />
            Mes séances de la semaine
          </h6>
          {seances.length === 0 ? (
            <p className="text-muted text-center py-3">Aucune séance cette semaine</p>
          ) : (
            <Table responsive hover size="sm">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Horaire</th>
                  <th>Matière</th>
                  <th>Classe</th>
                  <th>Salle</th>
                  <th>Statut séance</th>
                  <th>Cahier</th>
                </tr>
              </thead>
              <tbody>
                {seances.map((s, i) => {
                  const statut = getSeanceStatut(s);
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
                      <td>{s.classe_libelle}</td>
                      <td><Badge bg="secondary">{s.salle_code}</Badge></td>
                      <td>
                        <Badge bg={statut.color} className="d-inline-flex align-items-center gap-1">
                          {statut.icon} {statut.label}
                        </Badge>
                      </td>
                      <td>
                        {cahierCfg
                          ? <Badge bg={cahierCfg.color}>{cahierCfg.label}</Badge>
                          : <Badge bg="light" text="dark">Non rempli</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* ── Fiches de vacation ────────────────────────────────────── */}
      <Card className="stat-card mb-4">
        <Card.Body>
          <h6 className="mb-3"><FaMoneyBillWave className="me-2 text-success" />Mes fiches de vacation</h6>
          {vacations.length === 0 ? (
            <p className="text-muted text-center py-3">Aucune fiche de vacation générée</p>
          ) : (
            <Row className="g-3">
              {vacations.map((v) => {
                const cfg = VACATION_STATUT[v.statut] || { label: v.statut, color: 'secondary' };
                return (
                  <Col md={4} key={v.id}>
                    <Card className={`border-start border-3 border-${cfg.color} h-100`}>
                      <Card.Body className="py-2">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <strong style={{ fontSize: '0.9rem' }}>{MOIS_FR[v.mois]} {v.annee}</strong>
                          <Badge bg={cfg.color} style={{ fontSize: '0.7rem' }}>{cfg.label}</Badge>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#555' }}>
                          {v.nb_seances > 0 && <div>{v.nb_seances} séance(s)</div>}
                          <div>Brut : {formatMontant(v.montant_brut)}</div>
                          <div>Net : <strong className="text-success">{formatMontant(v.montant_net)}</strong></div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Card.Body>
      </Card>

      {/* ── Historique mensuel ────────────────────────────────────── */}
      {historique.length > 0 && (
        <Card className="stat-card">
          <Card.Body>
            <h6 className="mb-3"><FaHistory className="me-2 text-secondary" />Historique mensuel des séances</h6>
            <Table responsive size="sm">
              <thead className="table-light">
                <tr>
                  <th>Mois</th>
                  <th className="text-center">Planifiées</th>
                  <th className="text-center">Pointées</th>
                  <th className="text-center">Clôturées</th>
                  <th className="text-center">Heures</th>
                  <th className="text-center">Taux présence</th>
                </tr>
              </thead>
              <tbody>
                {historique.map((h, i) => {
                  const taux = h.nb_seances > 0
                    ? Math.round((h.nb_pointees / h.nb_seances) * 100) : 0;
                  return (
                    <tr key={i}>
                      <td className="fw-bold">{MOIS_FR[h.mois]} {h.annee}</td>
                      <td className="text-center">{h.nb_seances}</td>
                      <td className="text-center">
                        <Badge bg={parseInt(h.nb_pointees) === parseInt(h.nb_seances) ? 'success' : 'warning'}>
                          {h.nb_pointees}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <Badge bg={parseInt(h.nb_cloturees) === parseInt(h.nb_seances) ? 'success' : 'info'}>
                          {h.nb_cloturees}
                        </Badge>
                      </td>
                      <td className="text-center">{h.heures_planifiees}h</td>
                      <td className="text-center">
                        <span className={`fw-bold text-${taux >= 80 ? 'success' : taux >= 50 ? 'warning' : 'danger'}`}>
                          {taux}%
                        </span>
                      </td>
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

export default DashboardEnseignantPage;
