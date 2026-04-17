/**
 * EduSchedule Pro - Tableau de bord Délégué
 * Emploi du temps de la classe, cahiers à remplir, historique
 */
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Badge, Table, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaBook, FaEdit, FaCheckCircle } from 'react-icons/fa';
import { dashboardService } from '../utils/api';
import { formatTime, STATUT_COLORS, STATUT_LABELS } from '../utils/helpers';

const DashboardDeleguePage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await dashboardService.getStats('delegue');
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

  const cahiersARemplir = stats?.cahiers_a_remplir || [];
  const emploiTemps = stats?.emploi_temps || [];

  return (
    <div>
      <h4 className="mb-4">Espace Délégué</h4>

      {/* Cahiers à remplir en priorité */}
      {cahiersARemplir.length > 0 && (
        <Card className="stat-card mb-4 border-start border-4 border-warning">
          <Card.Body>
            <h6 className="mb-3">
              <FaEdit className="me-2 text-warning" />
              Cahiers de texte à remplir ({cahiersARemplir.length})
            </h6>
            <Table responsive hover size="sm">
              <thead className="table-light">
                <tr>
                  <th>Jour</th>
                  <th>Horaire</th>
                  <th>Matière</th>
                  <th>Enseignant</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cahiersARemplir.map((c, i) => (
                  <tr key={i}>
                    <td className="text-capitalize">{c.jour}</td>
                    <td>{formatTime(c.heure_debut)} - {formatTime(c.heure_fin)}</td>
                    <td>{c.matiere_libelle}</td>
                    <td>{c.enseignant_nom}</td>
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

      {/* Emploi du temps de la semaine */}
      <Card className="stat-card mb-4">
        <Card.Body>
          <h6 className="mb-3"><FaCalendarAlt className="me-2 text-primary" />Emploi du temps de la classe</h6>
          {emploiTemps.length === 0 ? (
            <p className="text-muted text-center py-3">Aucun emploi du temps publié</p>
          ) : (
            <Table responsive hover size="sm">
              <thead className="table-light">
                <tr>
                  <th>Jour</th>
                  <th>Horaire</th>
                  <th>Matière</th>
                  <th>Enseignant</th>
                  <th>Salle</th>
                  <th>Pointage</th>
                  <th>Cahier</th>
                </tr>
              </thead>
              <tbody>
                {emploiTemps.map((s, i) => (
                  <tr key={i}>
                    <td className="text-capitalize fw-bold">{s.jour}</td>
                    <td>{formatTime(s.heure_debut)} - {formatTime(s.heure_fin)}</td>
                    <td>{s.matiere_libelle}</td>
                    <td>{s.enseignant_nom}</td>
                    <td><Badge bg="secondary">{s.salle_code}</Badge></td>
                    <td>
                      {s.pointage_statut ? (
                        <Badge bg={STATUT_COLORS[s.pointage_statut]}>{STATUT_LABELS[s.pointage_statut]}</Badge>
                      ) : (
                        <Badge bg="light" text="dark">En attente</Badge>
                      )}
                    </td>
                    <td>
                      {s.cahier_statut ? (
                        <Badge bg={STATUT_COLORS[s.cahier_statut]}>{STATUT_LABELS[s.cahier_statut]}</Badge>
                      ) : (
                        <Badge bg="light" text="dark">-</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default DashboardDeleguePage;
