/**
 * EduSchedule Pro - Tableau de bord Enseignant
 * Mes séances, mes fiches de vacation, mon historique
 */
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Badge, Table } from 'react-bootstrap';
import { FaCalendarAlt, FaMoneyBillWave, FaCheckCircle, FaClock } from 'react-icons/fa';
import { dashboardService } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatTime, formatMontant, STATUT_COLORS, STATUT_LABELS, MOIS_FR } from '../utils/helpers';

const DashboardEnseignantPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await dashboardService.getStats('enseignant');
        setStats(response.data.data);
      } catch (err) {
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return <div className="loading-spinner"><Spinner animation="border" variant="primary" /></div>;
  }

  const seances = stats?.seances_semaine || [];
  const vacations = stats?.vacations || [];

  return (
    <div>
      <h4 className="mb-4">Bienvenue, {user?.prenom} {user?.nom}</h4>

      {/* Séances de la semaine */}
      <Card className="stat-card mb-4">
        <Card.Body>
          <h6 className="mb-3"><FaCalendarAlt className="me-2 text-primary" />Mes séances de la semaine</h6>
          {seances.length === 0 ? (
            <p className="text-muted text-center py-3">Aucune séance cette semaine</p>
          ) : (
            <Table responsive hover size="sm">
              <thead className="table-light">
                <tr>
                  <th>Jour</th>
                  <th>Horaire</th>
                  <th>Matière</th>
                  <th>Classe</th>
                  <th>Salle</th>
                  <th>Pointage</th>
                  <th>Cahier</th>
                </tr>
              </thead>
              <tbody>
                {seances.map((s, i) => (
                  <tr key={i}>
                    <td className="text-capitalize fw-bold">{s.jour}</td>
                    <td>{formatTime(s.heure_debut)} - {formatTime(s.heure_fin)}</td>
                    <td>{s.matiere_libelle}</td>
                    <td>{s.classe_libelle}</td>
                    <td><Badge bg="secondary">{s.salle_code}</Badge></td>
                    <td>
                      {s.pointage_statut ? (
                        <Badge bg={STATUT_COLORS[s.pointage_statut] || 'secondary'}>
                          {STATUT_LABELS[s.pointage_statut] || s.pointage_statut}
                        </Badge>
                      ) : (
                        <Badge bg="light" text="dark">Non pointé</Badge>
                      )}
                    </td>
                    <td>
                      {s.cahier_statut ? (
                        <Badge bg={STATUT_COLORS[s.cahier_statut] || 'secondary'}>
                          {STATUT_LABELS[s.cahier_statut] || s.cahier_statut}
                        </Badge>
                      ) : (
                        <Badge bg="light" text="dark">Non rempli</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Fiches de vacation */}
      <Card className="stat-card mb-4">
        <Card.Body>
          <h6 className="mb-3"><FaMoneyBillWave className="me-2 text-success" />Mes fiches de vacation</h6>
          {vacations.length === 0 ? (
            <p className="text-muted text-center py-3">Aucune fiche de vacation</p>
          ) : (
            <Row className="g-3">
              {vacations.map((v) => (
                <Col md={4} key={v.id}>
                  <Card className={`border-start border-3 border-${STATUT_COLORS[v.statut]}`}>
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong>{MOIS_FR[v.mois]} {v.annee}</strong>
                        <Badge bg={STATUT_COLORS[v.statut]}>
                          {STATUT_LABELS[v.statut]}
                        </Badge>
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                        Brut : {formatMontant(v.montant_brut)}<br />
                        Net : <strong className="text-success">{formatMontant(v.montant_net)}</strong>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default DashboardEnseignantPage;
