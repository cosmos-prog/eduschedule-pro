/**
 * EduSchedule Pro - Page Fiches de Vacation
 * Génération automatique, chaîne de validation, export PDF
 */
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, Button, Spinner, Form, Modal } from 'react-bootstrap';
import {
  FaMoneyBillWave, FaFileInvoiceDollar, FaCheck, FaEye,
  FaFilePdf, FaCog, FaSignature
} from 'react-icons/fa';
import { vacationsService, enseignantsService } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNotif } from '../context/NotifContext';
import SignaturePad from '../components/SignaturePad';
import { formatMontant, STATUT_COLORS, STATUT_LABELS, MOIS_FR } from '../utils/helpers';

const VacationsPage = () => {
  const { user, hasRole } = useAuth();
  const notif = useNotif();
  const [vacations, setVacations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerer, setShowGenerer] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showVisa, setShowVisa] = useState(null);
  const [enseignants, setEnseignants] = useState([]);
  const [genForm, setGenForm] = useState({ id_enseignant: '', mois: '', annee: new Date().getFullYear() });

  useEffect(() => {
    loadVacations();
    if (hasRole(['admin', 'comptable'])) loadEnseignants();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadVacations = async () => {
    setLoading(true);
    try {
      const params = {};
      if (hasRole(['enseignant'])) params.id_enseignant = user.id_lien;
      const response = await vacationsService.getAll(params);
      setVacations(response.data.data || []);
    } catch {
      notif.error('Erreur chargement des fiches');
    } finally {
      setLoading(false);
    }
  };

  const loadEnseignants = async () => {
    try {
      const resp = await enseignantsService.getAll();
      setEnseignants(resp.data.data || []);
    } catch {}
  };

  // Générer une fiche
  const handleGenerer = async () => {
    if (!genForm.id_enseignant || !genForm.mois) {
      notif.warning('Sélectionnez un enseignant et un mois');
      return;
    }
    try {
      await vacationsService.generer(genForm);
      notif.success('Fiche de vacation générée');
      setShowGenerer(false);
      loadVacations();
    } catch (err) {
      notif.error(err.response?.data?.message || 'Erreur de génération');
    }
  };

  // Voir le détail
  const handleDetail = async (id) => {
    try {
      const response = await vacationsService.getById(id);
      setShowDetail(response.data.data);
    } catch {
      notif.error('Erreur chargement du détail');
    }
  };

  // Valider / Apposer un visa
  const handleVisa = async (signatureBase64) => {
    if (!showVisa) return;
    try {
      let roleValidateur = 'enseignant';
      if (hasRole(['surveillant'])) roleValidateur = 'surveillant';
      if (hasRole(['comptable'])) roleValidateur = 'comptable';

      const serviceFn = roleValidateur === 'surveillant'
        ? vacationsService.valider
        : roleValidateur === 'comptable'
          ? vacationsService.approuver
          : vacationsService.signer;

      await serviceFn(showVisa, {
        visa_base64: signatureBase64,
        commentaire: ''
      });

      notif.success('Validation enregistrée');
      setShowVisa(null);
      loadVacations();
    } catch (err) {
      notif.error(err.response?.data?.message || 'Erreur de validation');
    }
  };

  if (loading) {
    return <div className="loading-spinner"><Spinner animation="border" variant="primary" /></div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4><FaMoneyBillWave className="me-2" />Fiches de Vacation</h4>
        {hasRole(['admin', 'comptable']) && (
          <Button variant="primary" onClick={() => setShowGenerer(true)}>
            <FaCog className="me-1" /> Générer une fiche
          </Button>
        )}
      </div>

      {/* Liste des fiches */}
      <Card className="stat-card">
        <Card.Body>
          {vacations.length === 0 ? (
            <p className="text-muted text-center py-4">Aucune fiche de vacation</p>
          ) : (
            <Table responsive hover size="sm">
              <thead className="table-light">
                <tr>
                  <th>Enseignant</th>
                  <th>Période</th>
                  <th>Montant brut</th>
                  <th>Retenues</th>
                  <th>Montant net</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vacations.map(v => (
                  <tr key={v.id}>
                    <td>{v.enseignant_nom}</td>
                    <td>{MOIS_FR[v.mois]} {v.annee}</td>
                    <td>{formatMontant(v.montant_brut)}</td>
                    <td className="text-danger">{formatMontant(v.retenues)}</td>
                    <td className="fw-bold text-success">{formatMontant(v.montant_net)}</td>
                    <td>
                      <Badge bg={STATUT_COLORS[v.statut]}>{STATUT_LABELS[v.statut]}</Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button size="sm" variant="outline-primary" onClick={() => handleDetail(v.id)}>
                          <FaEye />
                        </Button>
                        {/* Bouton validation selon rôle et statut */}
                        {v.statut === 'generee' && hasRole(['enseignant']) && (
                          <Button size="sm" variant="outline-success" onClick={() => setShowVisa(v.id)}>
                            <FaSignature /> Signer
                          </Button>
                        )}
                        {v.statut === 'signee_enseignant' && hasRole(['surveillant', 'admin']) && (
                          <Button size="sm" variant="outline-warning" onClick={() => setShowVisa(v.id)}>
                            <FaCheck /> Viser
                          </Button>
                        )}
                        {v.statut === 'visee_surveillant' && hasRole(['comptable', 'admin']) && (
                          <Button size="sm" variant="outline-success" onClick={() => setShowVisa(v.id)}>
                            <FaCheck /> Approuver
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Modal générer */}
      <Modal show={showGenerer} onHide={() => setShowGenerer(false)}>
        <Modal.Header closeButton>
          <Modal.Title><FaFileInvoiceDollar className="me-2" />Générer une fiche de vacation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Enseignant</Form.Label>
            <Form.Select value={genForm.id_enseignant} onChange={(e) => setGenForm({ ...genForm, id_enseignant: e.target.value })}>
              <option value="">-- Sélectionner --</option>
              {enseignants.map(e => (
                <option key={e.id} value={e.id}>{e.prenom} {e.nom} ({e.matricule})</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Mois</Form.Label>
                <Form.Select value={genForm.mois} onChange={(e) => setGenForm({ ...genForm, mois: e.target.value })}>
                  <option value="">-- Mois --</option>
                  {MOIS_FR.slice(1).map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Année</Form.Label>
                <Form.Control
                  type="number"
                  value={genForm.annee}
                  onChange={(e) => setGenForm({ ...genForm, annee: e.target.value })}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGenerer(false)}>Annuler</Button>
          <Button variant="primary" onClick={handleGenerer}>Générer</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal détail */}
      <Modal show={!!showDetail} onHide={() => setShowDetail(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Fiche de vacation - Détail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {showDetail && (
            <div>
              <Row className="mb-3">
                <Col md={6}><strong>Enseignant :</strong> {showDetail.enseignant_nom}</Col>
                <Col md={6}><strong>Matricule :</strong> {showDetail.matricule}</Col>
              </Row>
              <Row className="mb-3">
                <Col md={4}><strong>Période :</strong> {MOIS_FR[showDetail.mois]} {showDetail.annee}</Col>
                <Col md={4}><strong>Taux horaire :</strong> {formatMontant(showDetail.taux_horaire)}</Col>
                <Col md={4}>
                  <strong>Statut :</strong>{' '}
                  <Badge bg={STATUT_COLORS[showDetail.statut]}>{STATUT_LABELS[showDetail.statut]}</Badge>
                </Col>
              </Row>
              <hr />
              <h6>Détail des séances :</h6>
              {showDetail.lignes?.length > 0 ? (
                <Table responsive size="sm" bordered>
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Classe</th>
                      <th>Matière</th>
                      <th>Durée (h)</th>
                      <th>Taux</th>
                      <th>Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showDetail.lignes.map((l, i) => (
                      <tr key={i}>
                        <td>{l.jour} ({l.semaine_debut})</td>
                        <td>{l.classe_libelle}</td>
                        <td>{l.matiere_libelle}</td>
                        <td>{l.duree_heures}h</td>
                        <td>{formatMontant(l.taux)}</td>
                        <td className="fw-bold">{formatMontant(l.montant)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-primary">
                      <td colSpan={5} className="text-end fw-bold">Montant brut :</td>
                      <td className="fw-bold">{formatMontant(showDetail.montant_brut)}</td>
                    </tr>
                    <tr className="table-danger">
                      <td colSpan={5} className="text-end">Retenues (10%) :</td>
                      <td>{formatMontant(showDetail.retenues)}</td>
                    </tr>
                    <tr className="table-success">
                      <td colSpan={5} className="text-end fw-bold">Montant net :</td>
                      <td className="fw-bold fs-5">{formatMontant(showDetail.montant_net)}</td>
                    </tr>
                  </tfoot>
                </Table>
              ) : (
                <p className="text-muted">Aucune ligne de détail</p>
              )}
              {showDetail.validations?.length > 0 && (
                <>
                  <hr />
                  <h6>Chaîne de validation :</h6>
                  {showDetail.validations.map((val, i) => (
                    <div key={i} className="d-flex align-items-center gap-2 mb-2">
                      <Badge bg="success"><FaCheck /></Badge>
                      <span className="text-capitalize">{val.role_validateur}</span> :
                      <strong>{val.validateur_nom}</strong>
                      <small className="text-muted">({new Date(val.date_validation).toLocaleString('fr-FR')})</small>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Modal visa / signature */}
      <Modal show={!!showVisa} onHide={() => setShowVisa(null)}>
        <Modal.Header closeButton>
          <Modal.Title><FaSignature className="me-2" />Apposer votre visa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <SignaturePad onSave={handleVisa} label="Votre visa / signature" />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default VacationsPage;
