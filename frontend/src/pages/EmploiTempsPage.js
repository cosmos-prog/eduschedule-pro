/**
 * EduSchedule Pro - Page Emploi du Temps
 * Grille hebdomadaire (lundi-samedi), filtres par classe et semaine
 * Admin : créer, ajouter/supprimer créneaux, publier/dépublier
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Form, Button, Badge, Spinner, Modal, Alert } from 'react-bootstrap';
import {
  FaCalendarAlt, FaPlus, FaPrint, FaCheck, FaFilter,
  FaTrash, FaEdit, FaBan, FaExclamationTriangle
} from 'react-icons/fa';
import {
  emploiTempsService, classesService, matieresService,
  enseignantsService, sallesService
} from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNotif } from '../context/NotifContext';
import { formatTime, JOURS_SEMAINE, HEURES_COURS, getMondayOfWeek, STATUT_COLORS } from '../utils/helpers';

const JOURS_OPTIONS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const EmploiTempsPage = () => {
  const { hasRole } = useAuth();
  const notif = useNotif();

  // --- Données de base ---
  const [classes, setClasses]       = useState([]);
  const [matieres, setMatieres]     = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [salles, setSalles]         = useState([]);

  // --- Filtres ---
  const [selectedClasse, setSelectedClasse]   = useState('');
  const [selectedSemaine, setSelectedSemaine] = useState(getMondayOfWeek());

  // --- Emploi du temps courant ---
  const [emploiTemps, setEmploiTemps] = useState(null);
  const [creneaux, setCreneaux]       = useState([]);
  const [loading, setLoading]         = useState(false);

  // --- Modal création emploi du temps ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating]               = useState(false);

  // --- Modal ajout créneau ---
  const [showCreneauModal, setShowCreneauModal] = useState(false);
  const [savingCreneau, setSavingCreneau]       = useState(false);
  const [conflits, setConflits]                 = useState([]);
  const [creneauForm, setCreneauForm] = useState({
    jour: 'lundi',
    heure_debut: '08:00',
    heure_fin: '10:00',
    id_matiere: '',
    id_enseignant: '',
    id_salle: '',
  });

  // --- Chargement initial des listes ---
  useEffect(() => {
    const loadBase = async () => {
      try {
        const [clRes, matRes, ensRes, salRes] = await Promise.all([
          classesService.getAll(),
          matieresService.getAll(),
          enseignantsService.getAll(),
          sallesService.getAll(),
        ]);
        const cls = clRes.data.data || [];
        setClasses(cls);
        setMatieres(matRes.data.data || []);
        setEnseignants(ensRes.data.data || []);
        setSalles(salRes.data.data || []);
        if (cls.length > 0) {
          setSelectedClasse(cls[0].id.toString());
        }
      } catch (err) {
        notif.error('Erreur chargement des données');
      }
    };
    loadBase();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Charger l'emploi du temps ---
  const loadEmploiTemps = useCallback(async () => {
    if (!selectedClasse || !selectedSemaine) return;
    setLoading(true);
    try {
      const response = await emploiTempsService.getAll({
        id_classe: selectedClasse,
        semaine: selectedSemaine
      });
      const data = response.data.data || [];
      if (data.length > 0) {
        const detailResponse = await emploiTempsService.getById(data[0].id);
        setEmploiTemps(detailResponse.data.data);
        setCreneaux(detailResponse.data.data?.creneaux || []);
      } else {
        setEmploiTemps(null);
        setCreneaux([]);
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedClasse, selectedSemaine]);

  useEffect(() => {
    loadEmploiTemps();
  }, [loadEmploiTemps]);

  // --- Obtenir le créneau pour un jour et une plage horaire ---
  const getCreneau = (jour, heureDebut) => {
    return creneaux.find(c =>
      c.jour === jour && formatTime(c.heure_debut) === heureDebut
    );
  };

  // --- Créer un emploi du temps vide ---
  const handleCreer = async () => {
    setCreating(true);
    try {
      await emploiTempsService.create({
        id_classe: parseInt(selectedClasse),
        semaine_debut: selectedSemaine,
        creneaux: []
      });
      notif.success('Emploi du temps créé en brouillon');
      setShowCreateModal(false);
      loadEmploiTemps();
    } catch (err) {
      notif.error('Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  // --- Ouvrir modal ajout créneau (pré-rempli si slot cliqué) ---
  const openAddCreneau = (jour = 'lundi', heureDebut = '08:00', heureFin = '10:00') => {
    setCreneauForm({
      jour,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      id_matiere: matieres[0]?.id?.toString() || '',
      id_enseignant: enseignants[0]?.id?.toString() || '',
      id_salle: salles[0]?.id?.toString() || '',
    });
    setConflits([]);
    setShowCreneauModal(true);
  };

  // --- Sauvegarder le créneau ---
  const handleSaveCreneau = async () => {
    if (!creneauForm.id_matiere || !creneauForm.id_enseignant || !creneauForm.id_salle) {
      notif.error('Veuillez remplir tous les champs');
      return;
    }
    setSavingCreneau(true);
    setConflits([]);
    try {
      const payload = {
        jour: creneauForm.jour,
        heure_debut: creneauForm.heure_debut + ':00',
        heure_fin: creneauForm.heure_fin + ':00',
        id_matiere: parseInt(creneauForm.id_matiere),
        id_enseignant: parseInt(creneauForm.id_enseignant),
        id_salle: parseInt(creneauForm.id_salle),
      };
      const res = await emploiTempsService.addCreneau(emploiTemps.id, payload);
      if (res.data.success) {
        notif.success('Créneau ajouté avec succès');
        setShowCreneauModal(false);
        loadEmploiTemps();
      } else {
        setConflits(res.data.conflits || []);
      }
    } catch (err) {
      notif.error('Erreur lors de l\'ajout du créneau');
    } finally {
      setSavingCreneau(false);
    }
  };

  // --- Supprimer un créneau ---
  const handleDeleteCreneau = async (idCreneau, e) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer ce créneau ?')) return;
    try {
      await emploiTempsService.deleteCreneau(idCreneau);
      notif.success('Créneau supprimé');
      loadEmploiTemps();
    } catch (err) {
      notif.error('Erreur lors de la suppression');
    }
  };

  // --- Publier ---
  const handlePublier = async () => {
    if (!emploiTemps) return;
    try {
      await emploiTempsService.publier(emploiTemps.id);
      notif.success('Emploi du temps publié avec succès');
      loadEmploiTemps();
    } catch (err) {
      notif.error('Erreur lors de la publication');
    }
  };

  // --- Dépublier ---
  const handleDepublier = async () => {
    if (!emploiTemps) return;
    if (!window.confirm('Repasser en brouillon ? Les étudiants ne pourront plus le voir.')) return;
    try {
      await emploiTempsService.depublier(emploiTemps.id);
      notif.success('Emploi du temps repassé en brouillon');
      loadEmploiTemps();
    } catch (err) {
      notif.error('Erreur lors de la dépublication');
    }
  };

  const isAdmin = hasRole(['admin']);

  return (
    <div>
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h4 className="mb-0"><FaCalendarAlt className="me-2" />Emploi du Temps</h4>
        <div className="d-flex gap-2 no-print flex-wrap">
          {isAdmin && !emploiTemps && selectedClasse && (
            <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
              <FaPlus className="me-1" /> Créer
            </Button>
          )}
          {isAdmin && emploiTemps && emploiTemps.statut_publication === 'brouillon' && (
            <>
              <Button variant="outline-primary" size="sm" onClick={() => openAddCreneau()}>
                <FaPlus className="me-1" /> Ajouter créneau
              </Button>
              <Button variant="success" size="sm" onClick={handlePublier} disabled={creneaux.length === 0}>
                <FaCheck className="me-1" /> Publier
              </Button>
            </>
          )}
          {isAdmin && emploiTemps && emploiTemps.statut_publication === 'publie' && (
            <Button variant="outline-warning" size="sm" onClick={handleDepublier}>
              <FaBan className="me-1" /> Dépublier
            </Button>
          )}
          <Button variant="outline-secondary" size="sm" onClick={() => window.print()}>
            <FaPrint className="me-1" /> Imprimer
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card className="mb-4 no-print">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Label><FaFilter className="me-1" />Classe</Form.Label>
              <Form.Select
                value={selectedClasse}
                onChange={(e) => setSelectedClasse(e.target.value)}
              >
                <option value="">-- Sélectionner --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.libelle} ({c.code})</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label>Semaine du</Form.Label>
              <Form.Control
                type="date"
                value={selectedSemaine}
                onChange={(e) => setSelectedSemaine(e.target.value)}
              />
            </Col>
            <Col md={4} className="d-flex align-items-end gap-2">
              {emploiTemps && (
                <Badge
                  bg={STATUT_COLORS[emploiTemps.statut_publication]}
                  className="fs-6 py-2 px-3"
                >
                  {emploiTemps.statut_publication === 'publie' ? '✓ Publié' : '✏ Brouillon'}
                </Badge>
              )}
              {emploiTemps && isAdmin && emploiTemps.statut_publication === 'brouillon' && (
                <small className="text-muted">
                  {creneaux.length} créneau{creneaux.length !== 1 ? 'x' : ''}
                </small>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Conseil admin en brouillon */}
      {isAdmin && emploiTemps && emploiTemps.statut_publication === 'brouillon' && (
        <Alert variant="info" className="no-print mb-3 py-2">
          <FaEdit className="me-2" />
          <strong>Mode édition :</strong> Cliquez sur une case vide pour ajouter un créneau.
          Cliquez sur <FaTrash size={12} /> pour supprimer un créneau existant.
        </Alert>
      )}

      {/* Grille */}
      {loading ? (
        <div className="loading-spinner"><Spinner animation="border" variant="primary" /></div>
      ) : (
        <div className="schedule-grid">
          {/* En-têtes des jours */}
          <div className="day-header" style={{ backgroundColor: '#34495e' }}>Horaire</div>
          {JOURS_SEMAINE.map(jour => (
            <div key={jour} className="day-header">{jour}</div>
          ))}

          {/* Lignes horaires */}
          {HEURES_COURS.map((heure) => (
            <React.Fragment key={heure.debut}>
              <div className="time-slot">
                {heure.debut}<br />-<br />{heure.fin}
              </div>
              {JOURS_SEMAINE.map(jour => {
                const creneau = getCreneau(jour, heure.debut);
                const isEditable = isAdmin && emploiTemps && emploiTemps.statut_publication === 'brouillon';
                return (
                  <div
                    key={`${jour}-${heure.debut}`}
                    className={`slot ${creneau ? 'occupied' : ''} ${isEditable && !creneau ? 'slot-clickable' : ''}`}
                    title={
                      creneau
                        ? `${creneau.matiere_libelle} - ${creneau.enseignant_nom}`
                        : isEditable ? 'Cliquer pour ajouter un créneau' : ''
                    }
                    onClick={() => {
                      if (isEditable && !creneau) {
                        openAddCreneau(jour, heure.debut, heure.fin);
                      }
                    }}
                    style={{ cursor: isEditable && !creneau ? 'pointer' : 'default' }}
                  >
                    {creneau ? (
                      <div style={{ position: 'relative' }}>
                        <div className="fw-bold" style={{ color: '#1a5276', fontSize: '0.85rem' }}>
                          {creneau.matiere_code || creneau.matiere_libelle}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#555' }}>
                          {creneau.enseignant_nom}
                        </div>
                        <div>
                          <Badge bg="light" text="dark" style={{ fontSize: '0.65rem' }}>
                            {creneau.salle_code}
                          </Badge>
                        </div>
                        {isEditable && (
                          <button
                            className="btn btn-danger btn-sm no-print"
                            style={{
                              position: 'absolute', top: 0, right: 0,
                              padding: '1px 5px', fontSize: '0.65rem', lineHeight: 1
                            }}
                            onClick={(e) => handleDeleteCreneau(creneau.id, e)}
                            title="Supprimer ce créneau"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    ) : isEditable ? (
                      <div className="text-muted text-center" style={{ fontSize: '0.7rem', opacity: 0.4 }}>
                        <FaPlus />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      )}

      {!loading && !emploiTemps && selectedClasse && (
        <div className="text-center py-5 text-muted">
          <FaCalendarAlt size={48} className="mb-3 opacity-25" />
          <p>Aucun emploi du temps pour cette classe et cette semaine.</p>
          {isAdmin && (
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <FaPlus className="me-1" /> Créer un emploi du temps
            </Button>
          )}
        </div>
      )}

      {/* ========== Modal : Créer emploi du temps ========== */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Créer un emploi du temps</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">Un emploi du temps vide (brouillon) sera créé pour :</p>
          <ul>
            <li><strong>Classe :</strong> {classes.find(c => c.id.toString() === selectedClasse)?.libelle}</li>
            <li><strong>Semaine du :</strong> {selectedSemaine}</li>
          </ul>
          <p className="text-info small">Vous pourrez ensuite ajouter les créneaux et le publier.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Annuler</Button>
          <Button variant="primary" onClick={handleCreer} disabled={creating}>
            {creating ? <Spinner size="sm" animation="border" className="me-1" /> : <FaPlus className="me-1" />}
            Créer
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ========== Modal : Ajouter un créneau ========== */}
      <Modal show={showCreneauModal} onHide={() => setShowCreneauModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title><FaPlus className="me-2" />Ajouter un créneau</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {conflits.length > 0 && (
            <Alert variant="danger">
              <FaExclamationTriangle className="me-2" />
              <strong>Conflit détecté !</strong>
              {conflits.map((c, i) => (
                <div key={i} className="small mt-1">
                  — {c.message || c.type}
                </div>
              ))}
            </Alert>
          )}

          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Jour</Form.Label>
                <Form.Select
                  value={creneauForm.jour}
                  onChange={(e) => setCreneauForm(f => ({ ...f, jour: e.target.value }))}
                >
                  {JOURS_OPTIONS.map(j => (
                    <option key={j} value={j}>{j.charAt(0).toUpperCase() + j.slice(1)}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Heure début</Form.Label>
                <Form.Control
                  type="time"
                  value={creneauForm.heure_debut}
                  onChange={(e) => setCreneauForm(f => ({ ...f, heure_debut: e.target.value }))}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Heure fin</Form.Label>
                <Form.Control
                  type="time"
                  value={creneauForm.heure_fin}
                  onChange={(e) => setCreneauForm(f => ({ ...f, heure_fin: e.target.value }))}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Matière</Form.Label>
                <Form.Select
                  value={creneauForm.id_matiere}
                  onChange={(e) => setCreneauForm(f => ({ ...f, id_matiere: e.target.value }))}
                >
                  <option value="">-- Choisir --</option>
                  {matieres.map(m => (
                    <option key={m.id} value={m.id}>{m.libelle} ({m.code})</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Enseignant</Form.Label>
                <Form.Select
                  value={creneauForm.id_enseignant}
                  onChange={(e) => setCreneauForm(f => ({ ...f, id_enseignant: e.target.value }))}
                >
                  <option value="">-- Choisir --</option>
                  {enseignants.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.prenom} {e.nom}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Salle</Form.Label>
                <Form.Select
                  value={creneauForm.id_salle}
                  onChange={(e) => setCreneauForm(f => ({ ...f, id_salle: e.target.value }))}
                >
                  <option value="">-- Choisir --</option>
                  {salles.map(s => (
                    <option key={s.id} value={s.id}>{s.code} – {s.libelle}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreneauModal(false)}>Annuler</Button>
          <Button variant="primary" onClick={handleSaveCreneau} disabled={savingCreneau}>
            {savingCreneau
              ? <><Spinner size="sm" animation="border" className="me-1" />Vérification...</>
              : <><FaPlus className="me-1" />Ajouter</>
            }
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EmploiTempsPage;
