/**
 * EduSchedule Pro - Page Cahiers de Texte
 * Flux : Délégué crée → Enseignant signe → Surveillant clôture
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Table, Badge, Button, Spinner, Form, Modal, Alert } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import {
  FaBook, FaPlus, FaEye, FaSignature, FaLock,
  FaCheckCircle, FaPen, FaFilter
} from 'react-icons/fa';
import { cahiersService, classesService, emploiTempsService } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNotif } from '../context/NotifContext';
import SignaturePad from '../components/SignaturePad';
import { formatTime, getMondayOfWeek } from '../utils/helpers';

// Statuts et couleurs
const STATUT_CONFIG = {
  brouillon:       { label: 'Brouillon',         color: 'secondary' },
  signe_delegue:   { label: 'Signé (délégué)',   color: 'info'      },
  signe_enseignant:{ label: 'Signé (enseignant)', color: 'primary'   },
  cloture:         { label: 'Clôturé',            color: 'success'   },
};

const CahiersPage = () => {
  const { user, hasRole } = useAuth();
  const notif = useNotif();
  const [searchParams] = useSearchParams();

  const [cahiers, setCahiers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showSignature, setShowSignature] = useState(null); // { id, type }
  const [signing, setSigning]     = useState(false);

  // Listes pour le formulaire
  const [classes, setClasses]     = useState([]);
  const [creneaux, setCreneaux]   = useState([]);
  const [selectedClasse, setSelectedClasse] = useState('');

  // Formulaire création
  const creneauParam = searchParams.get('creneau') || '';
  const [formData, setFormData] = useState({
    id_creneau: creneauParam,
    titre: '',
    points_vus: '',
    niveau_avancement: '',
    observations: '',
    travaux: '',
  });

  // Charger les cahiers
  const loadCahiers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (hasRole(['delegue'])) params.id_classe = user?.id_lien;
      if (hasRole(['enseignant'])) params.id_enseignant = user?.id_lien;
      const response = await cahiersService.getAll(params);
      setCahiers(response.data.data || []);
    } catch {
      notif.error('Erreur chargement des cahiers');
    } finally {
      setLoading(false);
    }
  }, [user, hasRole]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadCahiers(); }, [loadCahiers]);

  // Charger classes pour le formulaire
  useEffect(() => {
    if (hasRole(['delegue', 'admin'])) {
      classesService.getAll().then(r => setClasses(r.data.data || [])).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Charger créneaux selon la classe sélectionnée
  useEffect(() => {
    if (selectedClasse) {
      emploiTempsService.getAll({ id_classe: selectedClasse, semaine: getMondayOfWeek() })
        .then(async r => {
          if (r.data.data?.length > 0) {
            const detail = await emploiTempsService.getById(r.data.data[0].id);
            setCreneaux(detail.data.data?.creneaux || []);
          } else setCreneaux([]);
        }).catch(() => {});
    }
  }, [selectedClasse]);

  // Ouvrir formulaire avec créneau pré-sélectionné depuis URL
  useEffect(() => {
    if (creneauParam) setShowCreate(true);
  }, [creneauParam]);

  // Créer un cahier
  const handleCreate = async () => {
    if (!formData.id_creneau || !formData.titre) {
      notif.warning('Sélectionnez un créneau et saisissez le titre du cours');
      return;
    }
    try {
      await cahiersService.create({
        id_creneau: parseInt(formData.id_creneau),
        titre: formData.titre,
        contenu_json: {
          points_vus: formData.points_vus.split('\n').filter(l => l.trim()),
          niveau_avancement: formData.niveau_avancement,
          observations: formData.observations,
          travaux: formData.travaux,
        }
      });
      notif.success('Cahier de texte créé avec succès');
      setShowCreate(false);
      setFormData({ id_creneau: '', titre: '', points_vus: '', niveau_avancement: '', observations: '', travaux: '' });
      loadCahiers();
    } catch (err) {
      notif.error(err.response?.data?.message || 'Erreur lors de la création');
    }
  };

  // Voir le détail
  const handleViewDetail = async (id) => {
    try {
      const response = await cahiersService.getById(id);
      setShowDetail(response.data.data);
    } catch {
      notif.error('Erreur chargement du cahier');
    }
  };

  // Signer
  const handleSignature = async (signatureBase64) => {
    if (!showSignature) return;
    setSigning(true);
    try {
      const type = hasRole(['delegue']) ? 'delegue' : 'enseignant';
      await cahiersService.signer(showSignature.id, { type, signature_base64: signatureBase64 });
      notif.success('Signature enregistrée avec succès');
      setShowSignature(null);
      loadCahiers();
    } catch (err) {
      notif.error(err.response?.data?.message || 'Erreur lors de la signature');
    } finally {
      setSigning(false);
    }
  };

  // Clôturer (surveillant)
  const handleCloturer = async (id) => {
    if (!window.confirm('Clôturer définitivement ce cahier de texte ?')) return;
    try {
      await cahiersService.cloturer(id, {
        heure_fin: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      });
      notif.success('Cahier de texte clôturé');
      loadCahiers();
    } catch (err) {
      notif.error('Erreur lors de la clôture');
    }
  };

  if (loading) {
    return <div className="loading-spinner"><Spinner animation="border" variant="primary" /></div>;
  }

  return (
    <div>
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4><FaBook className="me-2" />Cahiers de Texte</h4>
        {hasRole(['delegue', 'admin']) && (
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <FaPlus className="me-1" /> Nouveau cahier
          </Button>
        )}
      </div>

      {/* Guide selon le rôle */}
      {hasRole(['delegue']) && (
        <Alert variant="info" className="py-2 mb-3 small">
          <FaPen className="me-2" />
          <strong>Délégué :</strong> Créez le cahier après chaque séance et apposez votre signature.
        </Alert>
      )}
      {hasRole(['enseignant']) && (
        <Alert variant="info" className="py-2 mb-3 small">
          <FaSignature className="me-2" />
          <strong>Enseignant :</strong> Signez les cahiers après vérification du contenu.
        </Alert>
      )}
      {hasRole(['surveillant']) && (
        <Alert variant="info" className="py-2 mb-3 small">
          <FaLock className="me-2" />
          <strong>Surveillant :</strong> Clôturez les cahiers une fois signés par l'enseignant.
        </Alert>
      )}

      {/* Liste */}
      <Card className="stat-card">
        <Card.Body>
          {cahiers.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FaBook size={40} className="mb-3 opacity-25" />
              <p>Aucun cahier de texte trouvé</p>
            </div>
          ) : (
            <Table responsive hover size="sm">
              <thead className="table-light">
                <tr>
                  <th>Séance</th>
                  <th>Matière</th>
                  <th>Enseignant</th>
                  <th>Classe</th>
                  <th>Titre du cours</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cahiers.map(c => {
                  const cfg = STATUT_CONFIG[c.statut] || { label: c.statut, color: 'secondary' };
                  return (
                    <tr key={c.id}>
                      <td className="text-capitalize">
                        {c.jour}<br />
                        <small className="text-muted">{formatTime(c.heure_debut)}-{formatTime(c.heure_fin)}</small>
                      </td>
                      <td>{c.matiere_libelle}</td>
                      <td>{c.enseignant_nom}</td>
                      <td>{c.classe_libelle}</td>
                      <td>{c.titre_cours || <span className="text-muted">—</span>}</td>
                      <td><Badge bg={cfg.color}>{cfg.label}</Badge></td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          {/* Voir */}
                          <Button size="sm" variant="outline-secondary" onClick={() => handleViewDetail(c.id)} title="Voir détail">
                            <FaEye />
                          </Button>

                          {/* Délégué signe si brouillon */}
                          {c.statut === 'brouillon' && hasRole(['delegue']) && (
                            <Button size="sm" variant="outline-warning"
                              onClick={() => setShowSignature({ id: c.id, type: 'delegue' })}
                              title="Signer en tant que délégué">
                              <FaSignature /> Signer
                            </Button>
                          )}

                          {/* Enseignant signe si signé par délégué */}
                          {c.statut === 'signe_delegue' && hasRole(['enseignant']) && (
                            <Button size="sm" variant="outline-primary"
                              onClick={() => setShowSignature({ id: c.id, type: 'enseignant' })}
                              title="Signer en tant qu'enseignant">
                              <FaSignature /> Signer
                            </Button>
                          )}

                          {/* Surveillant/Admin clôture si signé par enseignant */}
                          {c.statut === 'signe_enseignant' && hasRole(['surveillant', 'admin']) && (
                            <Button size="sm" variant="outline-danger"
                              onClick={() => handleCloturer(c.id)}
                              title="Clôturer la séance">
                              <FaLock /> Clôturer
                            </Button>
                          )}

                          {/* Clôturé */}
                          {c.statut === 'cloture' && (
                            <Badge bg="success" className="align-self-center">
                              <FaCheckCircle className="me-1" />Clôturé
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* ══ Modal Création ══ */}
      <Modal show={showCreate} onHide={() => setShowCreate(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title><FaPen className="me-2" />Nouveau cahier de texte</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="g-3">
              {/* Sélection classe → créneau */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label><FaFilter className="me-1" />Classe</Form.Label>
                  <Form.Select value={selectedClasse} onChange={e => setSelectedClasse(e.target.value)}>
                    <option value="">-- Sélectionner une classe --</option>
                    {classes.map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.libelle}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Créneau de la séance *</Form.Label>
                  <Form.Select
                    value={formData.id_creneau}
                    onChange={e => setFormData({ ...formData, id_creneau: e.target.value })}
                  >
                    <option value="">-- Sélectionner un créneau --</option>
                    {creneaux.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.jour} {formatTime(c.heure_debut)}-{formatTime(c.heure_fin)} | {c.matiere_libelle}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Titre du cours *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.titre}
                    onChange={e => setFormData({ ...formData, titre: e.target.value })}
                    placeholder="Ex: Introduction au HTML5 — Les balises sémantiques"
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Points vus <small className="text-muted">(un point par ligne)</small></Form.Label>
                  <Form.Control
                    as="textarea" rows={4}
                    value={formData.points_vus}
                    onChange={e => setFormData({ ...formData, points_vus: e.target.value })}
                    placeholder={"Structure d'une page HTML\nBalises sémantiques header, main, footer\nIntroduction aux sélecteurs CSS"}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Niveau d'avancement</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.niveau_avancement}
                    onChange={e => setFormData({ ...formData, niveau_avancement: e.target.value })}
                    placeholder="Ex: Chapitre 2 / 8"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Travaux à faire</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.travaux}
                    onChange={e => setFormData({ ...formData, travaux: e.target.value })}
                    placeholder="Ex: Exercice 3 page 45"
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Observations</Form.Label>
                  <Form.Control
                    as="textarea" rows={2}
                    value={formData.observations}
                    onChange={e => setFormData({ ...formData, observations: e.target.value })}
                    placeholder="Remarques sur le déroulement de la séance..."
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Annuler</Button>
          <Button variant="primary" onClick={handleCreate}>
            <FaPlus className="me-1" />Créer le cahier
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ══ Modal Détail ══ */}
      <Modal show={!!showDetail} onHide={() => setShowDetail(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title><FaBook className="me-2" />Cahier de texte</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {showDetail && (() => {
            const cfg = STATUT_CONFIG[showDetail.statut] || { label: showDetail.statut, color: 'secondary' };
            const contenu = typeof showDetail.contenu_json === 'string'
              ? JSON.parse(showDetail.contenu_json)
              : showDetail.contenu_json || {};
            return (
              <div>
                <Row className="g-2 mb-3">
                  <Col md={6}><strong>Matière :</strong> {showDetail.matiere_libelle}</Col>
                  <Col md={6}><strong>Enseignant :</strong> {showDetail.enseignant_nom}</Col>
                  <Col md={6}><strong>Classe :</strong> {showDetail.classe_libelle}</Col>
                  <Col md={6}><strong>Salle :</strong> {showDetail.salle_code}</Col>
                  <Col md={6}>
                    <strong>Séance :</strong> {showDetail.jour} {formatTime(showDetail.heure_debut)} – {formatTime(showDetail.heure_fin)}
                  </Col>
                  <Col md={6}>
                    <strong>Statut :</strong> <Badge bg={cfg.color}>{cfg.label}</Badge>
                  </Col>
                </Row>
                <hr />
                <h6 className="text-primary">{showDetail.titre_cours}</h6>
                {contenu.points_vus?.length > 0 && (
                  <div className="mb-2">
                    <strong>Points vus :</strong>
                    <ul className="mt-1 mb-0">
                      {contenu.points_vus.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                )}
                {contenu.niveau_avancement && (
                  <p className="mb-1"><strong>Avancement :</strong> {contenu.niveau_avancement}</p>
                )}
                {contenu.travaux && (
                  <p className="mb-1"><strong>Travaux à faire :</strong> {contenu.travaux}</p>
                )}
                {contenu.observations && (
                  <p className="mb-1"><strong>Observations :</strong> {contenu.observations}</p>
                )}
                {showDetail.signatures?.length > 0 && (
                  <>
                    <hr />
                    <h6>Signatures :</h6>
                    {showDetail.signatures.map((sig, i) => (
                      <div key={i} className="d-flex align-items-center gap-2 mb-2">
                        <Badge bg="success">{sig.type_signataire}</Badge>
                        <span>{sig.signataire_nom}</span>
                        <small className="text-muted">{new Date(sig.horodatage).toLocaleString('fr-FR')}</small>
                        {sig.signature_base64 && (
                          <img src={sig.signature_base64} alt="signature" style={{ height: 40, border: '1px solid #ddd', borderRadius: 4 }} />
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })()}
        </Modal.Body>
      </Modal>

      {/* ══ Modal Signature ══ */}
      <Modal show={!!showSignature} onHide={() => setShowSignature(null)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaSignature className="me-2" />
            {showSignature?.type === 'delegue' ? 'Signature du délégué' : 'Signature de l\'enseignant'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {signing ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Enregistrement de la signature...</p>
            </div>
          ) : (
            <SignaturePad
              onSave={handleSignature}
              label={showSignature?.type === 'delegue' ? 'Signature du délégué' : 'Signature de l\'enseignant'}
            />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default CahiersPage;
