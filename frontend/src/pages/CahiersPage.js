/**
 * EduSchedule Pro - Page Cahiers de Texte
 * Workflow : QR → Délégué saisit en temps réel → Délégué signe → Enseignant confirme + signe → Verrouillé
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Table, Badge, Button, Spinner, Form, Modal, Alert } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import {
  FaBook, FaPlus, FaEye, FaSignature, FaLock,
  FaCheckCircle, FaPen, FaFilter, FaEdit, FaInfoCircle
} from 'react-icons/fa';
import { cahiersService, classesService, emploiTempsService } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNotif } from '../context/NotifContext';
import SignaturePad from '../components/SignaturePad';
import { formatTime, getMondayOfWeek, getDateDuJour, getSemaineLabel } from '../utils/helpers';

// ── Statuts ──────────────────────────────────────────────────────────────────
const STATUT_CONFIG = {
  brouillon:        { label: 'En cours',           color: 'warning',   textColor: 'dark' },
  signe_delegue:    { label: 'Signé (délégué)',    color: 'info',      textColor: undefined },
  signe_enseignant: { label: 'Signé (enseignant)', color: 'primary',   textColor: undefined }, // compatibilité anciens enregistrements
  cloture:          { label: 'Clôturé ✓',          color: 'success',   textColor: undefined },
};

// ── Étapes visuelles du workflow ──────────────────────────────────────────────
const WorkflowSteps = ({ statut }) => {
  const steps = [
    { key: 'brouillon',     label: 'Saisie délégué' },
    { key: 'signe_delegue', label: 'Signature délégué' },
    { key: 'cloture',       label: 'Signature enseignant' },
  ];
  const order = { brouillon: 0, signe_delegue: 1, signe_enseignant: 2, cloture: 2 };
  const current = order[statut] ?? 0;
  return (
    <div className="d-flex align-items-center gap-1 my-2" style={{ fontSize: '0.78rem' }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <span className={`badge rounded-pill px-2 py-1 ${i <= current ? 'bg-primary' : 'bg-light text-muted'}`}>
            {i < current ? '✓ ' : ''}{s.label}
          </span>
          {i < steps.length - 1 && <span className="text-muted">→</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

const CahiersPage = () => {
  const { user, hasRole } = useAuth();
  const notif = useNotif();
  const [searchParams] = useSearchParams();

  const [cahiers, setCahiers]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [showCreate, setShowCreate]         = useState(false);
  const [showEdit, setShowEdit]             = useState(null);   // cahier à modifier
  const [showDetail, setShowDetail]         = useState(null);
  const [showSignature, setShowSignature]   = useState(null);   // { id, type }
  const [signing, setSigning]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [heureFin, setHeureFin]             = useState('');
  const [cahierPourSignature, setCahierPourSignature] = useState(null);

  // Listes pour le formulaire
  const [classes, setClasses]             = useState([]);
  const [creneaux, setCreneaux]           = useState([]);
  const [selectedClasse, setSelectedClasse] = useState('');
  const [selectedSemaine, setSelectedSemaine] = useState(getMondayOfWeek());

  // Formulaire création / édition
  const creneauParam = searchParams.get('creneau') || '';
  const emptyForm = { id_creneau: creneauParam, titre: '', points_vus: '', niveau_avancement: '', observations: '', travaux: '' };
  const [formData, setFormData] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ titre: '', points_vus: '', niveau_avancement: '', observations: '', travaux: '' });

  // ── Charger les cahiers ──────────────────────────────────────────────────
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

  // Charger classes
  useEffect(() => {
    if (hasRole(['delegue', 'admin'])) {
      classesService.getAll().then(r => setClasses(r.data.data || [])).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Charger créneaux selon la classe et la semaine
  useEffect(() => {
    if (selectedClasse && selectedSemaine) {
      emploiTempsService.getAll({ id_classe: selectedClasse, semaine: selectedSemaine })
        .then(async r => {
          if (r.data.data?.length > 0) {
            const detail = await emploiTempsService.getById(r.data.data[0].id);
            setCreneaux(detail.data.data?.creneaux || []);
          } else setCreneaux([]);
        }).catch(() => {});
    }
  }, [selectedClasse, selectedSemaine]);

  // Ouvrir formulaire avec créneau pré-sélectionné depuis URL
  useEffect(() => {
    if (creneauParam) setShowCreate(true);
  }, [creneauParam]);

  // ── Créer un cahier ──────────────────────────────────────────────────────
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
      notif.success('Cahier de texte créé !');
      setShowCreate(false);
      setFormData(emptyForm);
      loadCahiers();
    } catch (err) {
      notif.error(err.response?.data?.message || 'Erreur lors de la création');
    }
  };

  // ── Modifier un brouillon ────────────────────────────────────────────────
  const openEdit = async (cahier) => {
    try {
      const res = await cahiersService.getById(cahier.id);
      const c = res.data.data;
      const contenu = typeof c.contenu_json === 'string' ? JSON.parse(c.contenu_json) : c.contenu_json || {};
      setEditForm({
        titre: c.titre_cours || '',
        points_vus: (contenu.points_vus || []).join('\n'),
        niveau_avancement: contenu.niveau_avancement || '',
        observations: contenu.observations || '',
        travaux: contenu.travaux || '',
      });
      setShowEdit(c);
    } catch {
      notif.error('Erreur chargement du cahier');
    }
  };

  const handleEdit = async () => {
    if (!showEdit || !editForm.titre) { notif.warning('Le titre est requis'); return; }
    setSaving(true);
    try {
      await cahiersService.update(showEdit.id, {
        titre: editForm.titre,
        contenu_json: {
          points_vus: editForm.points_vus.split('\n').filter(l => l.trim()),
          niveau_avancement: editForm.niveau_avancement,
          observations: editForm.observations,
          travaux: editForm.travaux,
        }
      });
      notif.success('Cahier mis à jour !');
      setShowEdit(null);
      loadCahiers();
    } catch (err) {
      notif.error(err.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  // ── Voir le détail ───────────────────────────────────────────────────────
  const handleViewDetail = async (id) => {
    try {
      const response = await cahiersService.getById(id);
      setShowDetail(response.data.data);
    } catch {
      notif.error('Erreur chargement du cahier');
    }
  };

  // ── Ouvrir modal signature enseignant ────────────────────────────────────
  const openTeacherSign = async (cahierId) => {
    try {
      const res = await cahiersService.getById(cahierId);
      setCahierPourSignature(res.data.data);
      const now = new Date();
      setHeureFin(now.toTimeString().substring(0, 5));
      setShowSignature({ id: cahierId, type: 'enseignant' });
    } catch {
      notif.error('Erreur chargement du cahier');
    }
  };

  // ── Signer ───────────────────────────────────────────────────────────────
  const handleSignature = async (signatureBase64) => {
    if (!showSignature) return;
    setSigning(true);
    try {
      const type = hasRole(['delegue']) ? 'delegue' : 'enseignant';
      const payload = { type, signature_base64: signatureBase64 };
      if (type === 'enseignant' && heureFin) {
        payload.heure_fin_reelle = heureFin + ':00';
      }
      await cahiersService.signer(showSignature.id, payload);
      const msg = type === 'enseignant'
        ? 'Séance clôturée et verrouillée !'
        : 'Signature enregistrée — en attente de la signature de l\'enseignant';
      notif.success(msg);
      setShowSignature(null);
      setCahierPourSignature(null);
      setHeureFin('');
      loadCahiers();
    } catch (err) {
      notif.error(err.response?.data?.message || 'Erreur lors de la signature');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner"><Spinner animation="border" variant="primary" /></div>;
  }

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0"><FaBook className="me-2" />Cahiers de Texte</h4>
        {hasRole(['delegue', 'admin']) && (
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <FaPlus className="me-1" /> Nouveau cahier
          </Button>
        )}
      </div>

      {/* ── Guide workflow selon le rôle ── */}
      {hasRole(['delegue']) && (
        <Alert variant="info" className="py-2 mb-3 small d-flex align-items-start gap-2">
          <FaInfoCircle className="mt-1 flex-shrink-0" />
          <div>
            <strong>Workflow délégué :</strong> Dès que l'enseignant pointe, créez le cahier et saisissez les points abordés pendant la séance.
            Apposez votre signature à la fin. L'enseignant confirmera l'heure de fin et signera pour verrouiller la fiche.
          </div>
        </Alert>
      )}
      {hasRole(['enseignant']) && (
        <Alert variant="info" className="py-2 mb-3 small d-flex align-items-start gap-2">
          <FaSignature className="mt-1 flex-shrink-0" />
          <div>
            <strong>Workflow enseignant :</strong> Vérifiez le contenu saisi par le délégué, confirmez l'heure de fin et signez.
            Votre signature <strong>verrouille définitivement</strong> la fiche.
          </div>
        </Alert>
      )}
      {hasRole(['surveillant']) && (
        <Alert variant="secondary" className="py-2 mb-3 small d-flex align-items-start gap-2">
          <FaEye className="mt-1 flex-shrink-0" />
          <div>
            <strong>Consultation :</strong> Accès lecture seule sur toutes les fiches. Les fiches clôturées sont verrouillées après double signature.
          </div>
        </Alert>
      )}

      {/* ── Liste des cahiers ── */}
      <Card className="stat-card">
        <Card.Body>
          {cahiers.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FaBook size={40} className="mb-3 opacity-25" />
              <p>Aucun cahier de texte trouvé</p>
              {hasRole(['delegue']) && (
                <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                  <FaPlus className="me-1" />Créer le premier cahier
                </Button>
              )}
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
                      <td>
                        <div className="fw-bold" style={{ fontSize: '0.82rem' }}>
                          {c.semaine_debut ? getDateDuJour(c.semaine_debut, c.jour) : <span className="text-capitalize">{c.jour}</span>}
                        </div>
                        <small className="text-muted d-block">
                          Prévu : {formatTime(c.heure_debut)}–{formatTime(c.heure_fin)}
                        </small>
                        {c.heure_debut_reelle && (
                          <small className="text-success d-block">
                            Réel : {c.heure_debut_reelle.substring(11, 16)}
                            {c.heure_fin_reelle ? `–${c.heure_fin_reelle.substring(0, 5)}` : ''}
                          </small>
                        )}
                      </td>
                      <td>{c.matiere_libelle}</td>
                      <td>{c.enseignant_nom}</td>
                      <td>{c.classe_libelle}</td>
                      <td>{c.titre_cours || <span className="text-muted">—</span>}</td>
                      <td><Badge bg={cfg.color} text={cfg.textColor}>{cfg.label}</Badge></td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          {/* Voir */}
                          <Button size="sm" variant="outline-secondary" onClick={() => handleViewDetail(c.id)} title="Voir le détail">
                            <FaEye />
                          </Button>

                          {/* Délégué : modifier le brouillon pendant la séance */}
                          {c.statut === 'brouillon' && hasRole(['delegue']) && (
                            <Button size="sm" variant="outline-warning" onClick={() => openEdit(c)} title="Modifier le contenu">
                              <FaEdit /> Modifier
                            </Button>
                          )}

                          {/* Délégué : signer quand le contenu est prêt */}
                          {c.statut === 'brouillon' && hasRole(['delegue']) && (
                            <Button size="sm" variant="warning"
                              onClick={() => setShowSignature({ id: c.id, type: 'delegue' })}
                              title="Apposer ma signature">
                              <FaSignature /> Signer
                            </Button>
                          )}

                          {/* Enseignant : vérifier + signer + verrouiller */}
                          {(c.statut === 'signe_delegue' || c.statut === 'signe_enseignant') &&
                            hasRole(['enseignant']) &&
                            parseInt(c.id_enseignant) === parseInt(user?.id_lien) && (
                            <Button size="sm" variant="primary"
                              onClick={() => openTeacherSign(c.id)}
                              title="Vérifier, confirmer l'heure de fin et signer">
                              <FaSignature /> Signer & Clôturer
                            </Button>
                          )}

                          {/* Clôturé : badge lecture seule */}
                          {c.statut === 'cloture' && (
                            <Badge bg="success" className="align-self-center d-inline-flex align-items-center gap-1">
                              <FaLock size={10} /><FaCheckCircle className="me-1" />Verrouillé
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

      {/* ══════════════════════════════════════════════════════════════
          Modal Création
      ══════════════════════════════════════════════════════════════ */}
      <Modal show={showCreate} onHide={() => setShowCreate(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title><FaPen className="me-2" />Nouveau cahier de texte</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="light" className="small py-2 mb-3 border">
            <strong>Astuce :</strong> Vous pouvez créer le cahier dès le début de la séance et le compléter au fur et à mesure.
          </Alert>
          <Form>
            <Row className="g-3">
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
                  <Form.Label>Semaine — <span className="text-primary fw-semibold">{getSemaineLabel(selectedSemaine)}</span></Form.Label>
                  <Form.Control
                    type="date"
                    value={selectedSemaine}
                    onChange={e => {
                      const d = new Date(e.target.value);
                      setSelectedSemaine(getMondayOfWeek(d));
                      setFormData(f => ({ ...f, id_creneau: '' }));
                    }}
                  />
                  <Form.Text className="text-muted">Sélectionnez n'importe quel jour de la semaine</Form.Text>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Créneau de la séance *</Form.Label>
                  <Form.Select
                    value={formData.id_creneau}
                    onChange={e => setFormData({ ...formData, id_creneau: e.target.value })}
                    disabled={!selectedClasse}
                  >
                    <option value="">-- Sélectionner un créneau --</option>
                    {creneaux.map(c => {
                      const dateStr = getDateDuJour(selectedSemaine, c.jour);
                      return (
                        <option key={c.id} value={c.id}>
                          {dateStr} · {formatTime(c.heure_debut)}–{formatTime(c.heure_fin)} · {c.matiere_libelle}
                        </option>
                      );
                    })}
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
                  <Form.Label>Points abordés <small className="text-muted">(un point par ligne)</small></Form.Label>
                  <Form.Control
                    as="textarea" rows={4}
                    value={formData.points_vus}
                    onChange={e => setFormData({ ...formData, points_vus: e.target.value })}
                    placeholder={"Structure d'une page HTML\nBalises sémantiques header, main, footer\nIntroduction aux sélecteurs CSS"}
                  />
                  <Form.Text className="text-muted">Vous pourrez compléter pendant la séance via "Modifier"</Form.Text>
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

      {/* ══════════════════════════════════════════════════════════════
          Modal Modification (brouillon pendant la séance)
      ══════════════════════════════════════════════════════════════ */}
      <Modal show={!!showEdit} onHide={() => setShowEdit(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title><FaEdit className="me-2" />Modifier le cahier de texte</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {showEdit && (
            <>
              <div className="p-2 rounded mb-3" style={{ background: '#f0f7ff', fontSize: '0.85rem' }}>
                <strong>{showEdit.matiere_libelle}</strong> — {showEdit.enseignant_nom} —
                {formatTime(showEdit.heure_debut)}–{formatTime(showEdit.heure_fin)}
                <WorkflowSteps statut={showEdit.statut} />
              </div>
              <Form>
                <Row className="g-3">
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Titre du cours *</Form.Label>
                      <Form.Control
                        type="text"
                        value={editForm.titre}
                        onChange={e => setEditForm({ ...editForm, titre: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Points abordés <small className="text-muted">(un point par ligne)</small></Form.Label>
                      <Form.Control
                        as="textarea" rows={5}
                        value={editForm.points_vus}
                        onChange={e => setEditForm({ ...editForm, points_vus: e.target.value })}
                        placeholder="Saisissez les points abordés pendant la séance..."
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Niveau d'avancement</Form.Label>
                      <Form.Control
                        type="text"
                        value={editForm.niveau_avancement}
                        onChange={e => setEditForm({ ...editForm, niveau_avancement: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Travaux à faire</Form.Label>
                      <Form.Control
                        type="text"
                        value={editForm.travaux}
                        onChange={e => setEditForm({ ...editForm, travaux: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Observations</Form.Label>
                      <Form.Control
                        as="textarea" rows={2}
                        value={editForm.observations}
                        onChange={e => setEditForm({ ...editForm, observations: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEdit(null)}>Annuler</Button>
          <Button variant="primary" onClick={handleEdit} disabled={saving}>
            {saving ? <Spinner size="sm" animation="border" className="me-1" /> : null}
            Enregistrer les modifications
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
          Modal Détail (lecture seule)
      ══════════════════════════════════════════════════════════════ */}
      <Modal show={!!showDetail} onHide={() => setShowDetail(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title><FaBook className="me-2" />Fiche de séance</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {showDetail && (() => {
            const cfg = STATUT_CONFIG[showDetail.statut] || { label: showDetail.statut, color: 'secondary' };
            const contenu = typeof showDetail.contenu_json === 'string'
              ? JSON.parse(showDetail.contenu_json)
              : showDetail.contenu_json || {};
            return (
              <div>
                <WorkflowSteps statut={showDetail.statut} />
                <Row className="g-2 mb-3 mt-1">
                  <Col md={6}><strong>Matière :</strong> {showDetail.matiere_libelle}</Col>
                  <Col md={6}><strong>Enseignant :</strong> {showDetail.enseignant_nom}</Col>
                  <Col md={6}><strong>Classe :</strong> {showDetail.classe_libelle}</Col>
                  <Col md={6}><strong>Salle :</strong> {showDetail.salle_code}</Col>
                  <Col md={6}>
                    <strong>Horaire prévu :</strong> {showDetail.jour} {formatTime(showDetail.heure_debut)} – {formatTime(showDetail.heure_fin)}
                  </Col>
                  {(showDetail.heure_debut_reelle || showDetail.heure_fin_reelle) && (
                    <Col md={6}>
                      <strong>Horaire réel :</strong>{' '}
                      {showDetail.heure_debut_reelle?.substring(11, 16) || '?'}
                      {' '}–{' '}
                      {showDetail.heure_fin_reelle?.substring(0, 5) || '?'}
                    </Col>
                  )}
                  <Col md={6}>
                    <strong>Statut :</strong> <Badge bg={cfg.color} text={cfg.textColor}>{cfg.label}</Badge>
                  </Col>
                </Row>
                <hr />
                <h6 className="text-primary mb-3">{showDetail.titre_cours || <em className="text-muted">Sans titre</em>}</h6>
                {contenu.points_vus?.length > 0 && (
                  <div className="mb-3">
                    <strong>Points abordés :</strong>
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
                {showDetail.statut === 'cloture' && (
                  <Alert variant="success" className="mt-3 py-2 small d-flex align-items-center gap-2">
                    <FaLock /><span>Fiche verrouillée — aucune modification possible.</span>
                  </Alert>
                )}
                {showDetail.signatures?.length > 0 && (
                  <>
                    <hr />
                    <h6>Signatures :</h6>
                    {showDetail.signatures.map((sig, i) => (
                      <div key={i} className="d-flex align-items-center gap-2 mb-2 p-2 border rounded">
                        <Badge bg={sig.type_signataire === 'enseignant' ? 'primary' : 'info'}>
                          {sig.type_signataire === 'enseignant' ? 'Enseignant' : 'Délégué'}
                        </Badge>
                        <span className="fw-semibold">{sig.signataire_nom}</span>
                        <small className="text-muted">{new Date(sig.horodatage).toLocaleString('fr-FR')}</small>
                        {sig.signature_base64 && (
                          <img src={sig.signature_base64} alt="signature"
                            style={{ height: 40, border: '1px solid #ddd', borderRadius: 4, background: '#fff' }} />
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

      {/* ══════════════════════════════════════════════════════════════
          Modal Signature Délégué
      ══════════════════════════════════════════════════════════════ */}
      <Modal show={!!showSignature && showSignature?.type === 'delegue'} onHide={() => setShowSignature(null)}>
        <Modal.Header closeButton>
          <Modal.Title><FaSignature className="me-2" />Signature du délégué</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="small py-2 mb-3">
            Assurez-vous que le contenu du cahier est complet avant de signer. Après votre signature,
            l'enseignant pourra finaliser et verrouiller la fiche.
          </Alert>
          {signing ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Enregistrement...</p>
            </div>
          ) : (
            <SignaturePad onSave={handleSignature} label="Signature du délégué" />
          )}
        </Modal.Body>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
          Modal Clôture Enseignant — vérification + heure fin + signature → verrouillage
      ══════════════════════════════════════════════════════════════ */}
      <Modal
        show={!!showSignature && showSignature?.type === 'enseignant'}
        onHide={() => { setShowSignature(null); setCahierPourSignature(null); }}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title><FaSignature className="me-2" />Vérifier & Clôturer la séance</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {signing ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Verrouillage de la fiche...</p>
            </div>
          ) : cahierPourSignature ? (
            <div>
              {/* Récapitulatif séance */}
              <div className="p-3 rounded mb-3" style={{ background: '#eaf2f8' }}>
                <Row className="g-2">
                  <Col xs={6}><small className="text-muted d-block">Matière</small><strong>{cahierPourSignature.matiere_libelle}</strong></Col>
                  <Col xs={6}><small className="text-muted d-block">Classe</small><strong>{cahierPourSignature.classe_libelle}</strong></Col>
                  <Col xs={6}><small className="text-muted d-block">Salle</small><strong>{cahierPourSignature.salle_code}</strong></Col>
                  <Col xs={6}>
                    <small className="text-muted d-block">Date</small>
                    <strong>{cahierPourSignature.semaine_debut ? getDateDuJour(cahierPourSignature.semaine_debut, cahierPourSignature.jour) : cahierPourSignature.jour}</strong>
                  </Col>
                  <Col xs={6}>
                    <small className="text-muted d-block">Début prévu / réel</small>
                    <strong>{formatTime(cahierPourSignature.heure_debut)}</strong>
                    {cahierPourSignature.heure_debut_reelle && (
                      <span className="text-success ms-1">/ {cahierPourSignature.heure_debut_reelle.substring(11, 16)}</span>
                    )}
                  </Col>
                </Row>
              </div>

              {/* Contenu saisi par le délégué */}
              {cahierPourSignature.titre_cours && (
                <div className="mb-3 p-3 border rounded">
                  <strong className="text-primary d-block mb-2">{cahierPourSignature.titre_cours}</strong>
                  {(() => {
                    const c = typeof cahierPourSignature.contenu_json === 'string'
                      ? JSON.parse(cahierPourSignature.contenu_json)
                      : cahierPourSignature.contenu_json || {};
                    return (
                      <div className="small">
                        {c.niveau_avancement && <div className="text-muted mb-1">Avancement : {c.niveau_avancement}</div>}
                        {c.points_vus?.length > 0 && (
                          <div className="mb-1">
                            <strong>Points abordés :</strong>
                            <ul className="mb-0 mt-1">
                              {c.points_vus.map((p, i) => <li key={i}>{p}</li>)}
                            </ul>
                          </div>
                        )}
                        {c.travaux && <div className="text-muted">Travaux : {c.travaux}</div>}
                        {c.observations && <div className="text-muted">Observations : {c.observations}</div>}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Heure de fin */}
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">
                  Heure de fin réelle <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="time"
                  value={heureFin}
                  onChange={e => setHeureFin(e.target.value)}
                  style={{ maxWidth: 160 }}
                />
                <Form.Text className="text-muted">
                  Heure prévue : {formatTime(cahierPourSignature.heure_fin)}
                </Form.Text>
              </Form.Group>

              <Alert variant="warning" className="py-2 small">
                <FaLock className="me-1" />
                <strong>Attention :</strong> Votre signature <strong>verrouille définitivement</strong> cette fiche.
                Aucune modification ne sera possible sans déverrouillage administrateur.
              </Alert>

              <SignaturePad onSave={handleSignature} label="Signature de l'enseignant" />
            </div>
          ) : (
            <div className="text-center py-4"><Spinner animation="border" /></div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default CahiersPage;
