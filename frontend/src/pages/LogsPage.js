/**
 * EduSchedule Pro - Page Journal d'activité (Logs)
 * Historique des actions avec filtres (admin uniquement)
 */
import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Spinner, Form, Row, Col, Button } from 'react-bootstrap';
import { FaClipboardList, FaFilter, FaSearch } from 'react-icons/fa';
import { logsService } from '../utils/api';
import { useNotif } from '../context/NotifContext';

const LogsPage = () => {
  const notif = useNotif();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    date_debut: '',
    date_fin: ''
  });

  useEffect(() => {
    loadLogs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLogs = async (params = {}) => {
    setLoading(true);
    try {
      const response = await logsService.getAll(params);
      setLogs(response.data.data || []);
    } catch {
      notif.error('Erreur de chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    const params = {};
    if (filters.action) params.action = filters.action;
    if (filters.date_debut) params.date_debut = filters.date_debut;
    if (filters.date_fin) params.date_fin = filters.date_fin;
    loadLogs(params);
  };

  const getActionBadge = (action) => {
    const colors = {
      connexion: 'primary',
      deconnexion: 'secondary',
      creation_emploi_temps: 'success',
      publication_emploi_temps: 'info',
      pointage_qr: 'warning',
      saisie_cahier_texte: 'dark',
    };
    return colors[action] || 'light';
  };

  return (
    <div>
      <h4 className="mb-4"><FaClipboardList className="me-2" />Journal d'activité</h4>

      {/* Filtres */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={3}>
              <Form.Label><FaFilter className="me-1" />Action</Form.Label>
              <Form.Select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              >
                <option value="">Toutes les actions</option>
                <option value="connexion">Connexion</option>
                <option value="deconnexion">Déconnexion</option>
                <option value="creation_emploi_temps">Création emploi du temps</option>
                <option value="publication_emploi_temps">Publication emploi du temps</option>
                <option value="pointage_qr">Pointage QR</option>
                <option value="saisie_cahier_texte">Saisie cahier de texte</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label>Date début</Form.Label>
              <Form.Control
                type="date"
                value={filters.date_debut}
                onChange={(e) => setFilters({ ...filters, date_debut: e.target.value })}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Date fin</Form.Label>
              <Form.Control
                type="date"
                value={filters.date_fin}
                onChange={(e) => setFilters({ ...filters, date_fin: e.target.value })}
              />
            </Col>
            <Col md={3}>
              <Button variant="primary" className="w-100" onClick={handleFilter}>
                <FaSearch className="me-1" /> Filtrer
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tableau des logs */}
      <Card className="stat-card">
        <Card.Body>
          {loading ? (
            <div className="loading-spinner"><Spinner animation="border" variant="primary" /></div>
          ) : (
            <>
              <p className="text-muted mb-3">{logs.length} entrée(s) trouvée(s)</p>
              <Table responsive hover size="sm">
                <thead className="table-light">
                  <tr>
                    <th>Date / Heure</th>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Action</th>
                    <th>Détails</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.85rem' }}>
                        {new Date(log.date_heure).toLocaleString('fr-FR')}
                      </td>
                      <td>{log.utilisateur_nom || 'Système'}</td>
                      <td>
                        <Badge bg="secondary" className="text-capitalize">{log.role || '-'}</Badge>
                      </td>
                      <td>
                        <Badge bg={getActionBadge(log.action)}>
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td style={{ fontSize: '0.8rem', maxWidth: '250px' }}>
                        {log.details_json ? (
                          <code style={{ fontSize: '0.75rem' }}>
                            {typeof log.details_json === 'string'
                              ? log.details_json.substring(0, 100)
                              : JSON.stringify(log.details_json).substring(0, 100)}
                          </code>
                        ) : '-'}
                      </td>
                      <td><code style={{ fontSize: '0.75rem' }}>{log.ip || '-'}</code></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {logs.length === 0 && (
                <p className="text-muted text-center py-3">Aucun log trouvé</p>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default LogsPage;
