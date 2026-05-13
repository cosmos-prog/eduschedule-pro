/**
 * EduSchedule Pro - Page Emploi du Temps
 * Grille hebdomadaire (lundi-samedi)
 * Modes : Par classe | Par enseignant | Par salle
 * Admin : créer, ajouter/supprimer créneaux, publier/dépublier, dupliquer
 * Vue journalière : filtrer sur un seul jour
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Row, Col, Card, Form, Button, Badge, Spinner, Modal, Alert, ButtonGroup
} from 'react-bootstrap';
import {
  FaCalendarAlt, FaPlus, FaPrint, FaCheck, FaFilter,
  FaTrash, FaEdit, FaBan, FaExclamationTriangle, FaCopy,
  FaChalkboardTeacher, FaDoorOpen, FaSchool, FaCalendarDay
} from 'react-icons/fa';
import {
  emploiTempsService, classesService, matieresService,
  enseignantsService, sallesService, joursferiesService
} from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNotif } from '../context/NotifContext';
import {
  formatTime, JOURS_SEMAINE, HEURES_COURS,
  getMondayOfWeek, STATUT_COLORS, getDateDuJour, getSemaineLabel
} from '../utils/helpers';

const JOURS_OPTIONS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/* ─── Ajouter 7 jours à une date ISO ─── */
const addWeek = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
};

const EmploiTempsPage = () => {
  const { hasRole } = useAuth();
  const notif = useNotif();

  // --- Listes de référence ---
  const [classes, setClasses]         = useState([]);
  const [matieres, setMatieres]       = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [salles, setSalles]           = useState([]);

  // --- Filtres ---
  const [viewMode, setViewMode]           = useState('classe');  // 'classe' | 'enseignant' | 'salle'
  const [selectedClasse, setSelectedClasse]       = useState('');
  const [selectedEnseignant, setSelectedEnseignant] = useState('');
  const [selectedSalle, setSelectedSalle]         = useState('');
  const [selectedSemaine, setSelectedSemaine]     = useState(getMondayOfWeek());
  const [filteredJour, setFilteredJour]           = useState(null); // null = toute la semaine

  // --- Jours fériés : { 'YYYY-MM-DD': 'Libellé' } ---
  const [joursFeries, setJoursFeries] = useState({});

  // --- Emploi du temps (mode classe) ---
  const [emploiTemps, setEmploiTemps] = useState(null);
  const [creneaux, setCreneaux]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [apiError, setApiError]       = useState(null);

  // --- Modal création ET ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating]               = useState(false);

  // --- Modal ajout créneau ---
  const [showCreneauModal, setShowCreneauModal] = useState(false);
  const [savingCreneau, setSavingCreneau]       = useState(false);
  const [conflits, setConflits]                 = useState([]);
  const [creneauForm, setCreneauForm] = useState({
    jour: 'lundi', heure_debut: '08:00', heure_fin: '10:00',
    id_matiere: '', id_enseignant: '', id_salle: '',
  });
  // Mapping matière → enseignant principal (historique) pour auto-sélection
  const [matEnsMap, setMatEnsMap] = useState({});

  // --- Modal dupliquer ---
  const [showDupModal, setShowDupModal]     = useState(false);
  const [dupSemaineCible, setDupSemaineCible] = useState('');
  const [dupliquant, setDupliquant]         = useState(false);
  const [dupResultat, setDupResultat]       = useState(null); // { nb_creneaux, nb_skipped, skipped }

  const isAdmin = hasRole(['admin']);

  /* ─── Chargement initial des listes ─── */
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
        const ens = ensRes.data.data || [];
        setEnseignants(ens);
        const sal = salRes.data.data || [];
        setSalles(sal);
        if (cls.length > 0) setSelectedClasse(cls[0].id.toString());
        if (ens.length > 0) setSelectedEnseignant(ens[0].id.toString());
        if (sal.length > 0) setSelectedSalle(sal[0].id.toString());
        // Charger le mapping matière → enseignant principal (pour auto-sélection)
        try {
          const mapRes = await emploiTempsService.getMatiereEnseignantMap();
          setMatEnsMap(mapRes.data?.data || {});
        } catch { /* silencieux, non bloquant */ }
        // Charger les jours fériés (années courante + suivante pour couvrir les semaines à cheval)
        try {
          const annee = new Date().getFullYear();
          const [fRes1, fRes2] = await Promise.all([
            joursferiesService.getAll(annee),
            joursferiesService.getAll(annee + 1),
          ]);
          const map = {};
          [...(fRes1.data?.data || []), ...(fRes2.data?.data || [])].forEach(f => {
            map[f.date_ferie] = f.libelle;
          });
          setJoursFeries(map);
        } catch { /* silencieux */ }
      } catch {
        notif.error('Erreur chargement des données');
      }
    };
    loadBase();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Charger les créneaux selon le mode ─── */
  const loadCreneaux = useCallback(async () => {
    if (!selectedSemaine) return;

    if (viewMode === 'classe') {
      if (!selectedClasse) return;
      setLoading(true);
      try {
        const response = await emploiTempsService.getAll({
          id_classe: selectedClasse, semaine: selectedSemaine
        });
        const data = response.data.data || [];
        if (data.length > 0) {
          const det = await emploiTempsService.getById(data[0].id);
          setEmploiTemps(det.data.data);
          setCreneaux(det.data.data?.creneaux || []);
        } else {
          setEmploiTemps(null);
          setCreneaux([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else {
      // Par enseignant ou par salle
      const filter = viewMode === 'enseignant'
        ? { semaine: selectedSemaine, id_enseignant: selectedEnseignant }
        : { semaine: selectedSemaine, id_salle: selectedSalle };
      const hasFilter = viewMode === 'enseignant' ? !!selectedEnseignant : !!selectedSalle;
      if (!hasFilter) return;
      setLoading(true);
      setApiError(null);
      try {
        console.log('[EmploiTemps] GET creneaux_semaine', filter);
        const res = await emploiTempsService.getCreneauxSemaine(filter);
        console.log('[EmploiTemps] Réponse :', res.data);
        setEmploiTemps(null);
        setCreneaux(res.data.data || []);
        if (!res.data.success) {
          setApiError(res.data.message || 'Réponse API invalide');
        }
      } catch (err) {
        console.error('[EmploiTemps] Erreur :', err);
        setApiError(
          err.response?.data?.message
          || err.message
          || 'Erreur réseau'
        );
        setCreneaux([]);
      } finally {
        setLoading(false);
      }
    }
  }, [viewMode, selectedClasse, selectedEnseignant, selectedSalle, selectedSemaine]);

  useEffect(() => {
    loadCreneaux();
    const interval = setInterval(loadCreneaux, 30000);
    return () => clearInterval(interval);
  }, [loadCreneaux]);

  /* ─── Date ISO d'un jour de la semaine (ex: 'lundi' → '2026-05-11') ─── */
  const getISODate = (jour) => {
    const index = ['lundi','mardi','mercredi','jeudi','vendredi','samedi'].indexOf(jour);
    if (index === -1 || !selectedSemaine) return null;
    const d = new Date(selectedSemaine + 'T00:00:00');
    d.setDate(d.getDate() + index);
    return d.toISOString().slice(0, 10);
  };

  /* ─── Grille : trouver le créneau d'un jour/heure ─── */
  const getCreneau = (jour, heureDebut) =>
    creneaux.find(c => c.jour === jour && formatTime(c.heure_debut) === heureDebut);

  /* ─── Lignes horaires dynamiques : standards + créneaux réels ─── */
  const heuresAffichees = useMemo(() => {
    // Base : créneaux standards
    const map = {};
    HEURES_COURS.forEach(h => { map[h.debut] = h.fin; });
    // Ajouter les créneaux réels non-standards
    creneaux.forEach(c => {
      const debut = formatTime(c.heure_debut);
      const fin   = formatTime(c.heure_fin);
      if (!map[debut]) map[debut] = fin;
    });
    return Object.entries(map)
      .map(([debut, fin]) => ({ debut, fin }))
      .sort((a, b) => a.debut.localeCompare(b.debut));
  }, [creneaux]);

  /* ─── Jours affichés (filtrage vue journalière) ─── */
  const joursAffiches = filteredJour
    ? JOURS_SEMAINE.filter(j => j === filteredJour)
    : JOURS_SEMAINE;

  /* ─── Créer un ET vide ─── */
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
      loadCreneaux();
    } catch {
      notif.error('Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  /* ─── Ouvrir modal créneau (pré-rempli) ─── */
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

  /* ─── Sauvegarder le créneau ─── */
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
        loadCreneaux();
      } else {
        setConflits(res.data.conflits || []);
      }
    } catch {
      notif.error('Erreur lors de l\'ajout du créneau');
    } finally {
      setSavingCreneau(false);
    }
  };

  /* ─── Supprimer un créneau ─── */
  const handleDeleteCreneau = async (idCreneau, e) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer ce créneau ?')) return;
    try {
      await emploiTempsService.deleteCreneau(idCreneau);
      notif.success('Créneau supprimé');
      loadCreneaux();
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la suppression';
      notif.error(msg);
    }
  };

  /* ─── Publier / Dépublier ─── */
  const handlePublier = async () => {
    if (!emploiTemps) return;
    try {
      await emploiTempsService.publier(emploiTemps.id);
      notif.success('Emploi du temps publié avec succès');
      loadCreneaux();
    } catch { notif.error('Erreur lors de la publication'); }
  };

  const handleDepublier = async () => {
    if (!emploiTemps) return;
    if (!window.confirm('Repasser en brouillon ? Les étudiants ne pourront plus le voir.')) return;
    try {
      await emploiTempsService.depublier(emploiTemps.id);
      notif.success('Emploi du temps repassé en brouillon');
      loadCreneaux();
    } catch { notif.error('Erreur lors de la dépublication'); }
  };

  /* ─── Ouvrir modal dupliquer ─── */
  const openDupliquer = () => {
    setDupSemaineCible(addWeek(selectedSemaine));
    setDupResultat(null);
    setShowDupModal(true);
  };

  /* ─── Dupliquer ─── */
  const handleDupliquer = async () => {
    setDupliquant(true);
    try {
      const res = await emploiTempsService.dupliquer(emploiTemps.id, {
        semaine_cible: dupSemaineCible
      });
      if (res.data.success) {
        setDupResultat(res.data);
      }
    } catch (err) {
      notif.error(err.response?.data?.message || 'Erreur lors de la duplication');
    } finally {
      setDupliquant(false);
    }
  };

  const closeDupModal = () => {
    setShowDupModal(false);
    if (dupResultat) {
      // Naviguer vers la semaine cible
      setSelectedSemaine(dupSemaineCible);
    }
    setDupResultat(null);
  };

  /* ─── Contenu d'une cellule selon le mode ─── */
  const renderCellContent = (creneau) => {
    if (viewMode === 'classe') {
      return (
        <>
          <div className="fw-bold" style={{ color: '#1a5276', fontSize: '0.85rem' }}>
            {creneau.matiere_code || creneau.matiere_libelle}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#555' }}>{creneau.enseignant_nom}</div>
          <Badge bg="light" text="dark" style={{ fontSize: '0.65rem' }}>{creneau.salle_code}</Badge>
        </>
      );
    }
    const isBrouillon = creneau.statut_publication === 'brouillon';
    if (viewMode === 'enseignant') {
      return (
        <>
          <div className="fw-bold" style={{ color: '#1a5276', fontSize: '0.85rem' }}>
            {creneau.matiere_code || creneau.matiere_libelle}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#555' }}>{creneau.classe_code || creneau.classe_libelle}</div>
          <Badge bg="light" text="dark" style={{ fontSize: '0.65rem' }}>{creneau.salle_code}</Badge>
          {isBrouillon && <Badge bg="warning" text="dark" className="ms-1" style={{ fontSize: '0.6rem' }}>Brouillon</Badge>}
        </>
      );
    }
    // salle
    return (
      <>
        <div className="fw-bold" style={{ color: '#1a5276', fontSize: '0.85rem' }}>
          {creneau.matiere_code || creneau.matiere_libelle}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#555' }}>{creneau.enseignant_nom}</div>
        <Badge bg="light" text="dark" style={{ fontSize: '0.65rem' }}>{creneau.classe_code || creneau.classe_libelle}</Badge>
        {isBrouillon && <Badge bg="warning" text="dark" className="ms-1" style={{ fontSize: '0.6rem' }}>Brouillon</Badge>}
      </>
    );
  };

  /* ─── Nombre de colonnes de la grille ─── */
  const nbCols = joursAffiches.length + 1; // +1 pour colonne horaire
  const gridCols = `80px repeat(${joursAffiches.length}, 1fr)`;

  return (
    <div>
      {/* ── En-tête ───────────────────────────────────────────────── */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h4 className="mb-0"><FaCalendarAlt className="me-2" />Emploi du Temps</h4>
        <div className="d-flex gap-2 no-print flex-wrap align-items-center">
          {isAdmin && viewMode === 'classe' && !emploiTemps && selectedClasse && (
            <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
              <FaPlus className="me-1" /> Créer
            </Button>
          )}
          {isAdmin && viewMode === 'classe' && emploiTemps && emploiTemps.statut_publication === 'brouillon' && (
            <>
              <Button variant="outline-primary" size="sm" onClick={() => openAddCreneau()}>
                <FaPlus className="me-1" /> Créneau
              </Button>
              <Button variant="success" size="sm" onClick={handlePublier} disabled={creneaux.length === 0}>
                <FaCheck className="me-1" /> Publier
              </Button>
            </>
          )}
          {isAdmin && viewMode === 'classe' && emploiTemps && emploiTemps.statut_publication === 'publie' && (
            <Button variant="outline-warning" size="sm" onClick={handleDepublier}>
              <FaBan className="me-1" /> Dépublier
            </Button>
          )}
          {isAdmin && viewMode === 'classe' && emploiTemps && creneaux.length > 0 && (
            <Button variant="outline-info" size="sm" onClick={openDupliquer} title="Dupliquer vers une autre semaine">
              <FaCopy className="me-1" /> Dupliquer
            </Button>
          )}
          <Button variant="outline-secondary" size="sm" onClick={() => window.print()}>
            <FaPrint className="me-1" /> Imprimer
          </Button>
        </div>
      </div>

      {/* ── Onglets de mode ───────────────────────────────────────── */}
      <div className="no-print mb-3">
        <ButtonGroup size="sm">
          <Button
            variant={viewMode === 'classe' ? 'primary' : 'outline-primary'}
            onClick={() => { setViewMode('classe'); setFilteredJour(null); }}
          >
            <FaSchool className="me-1" /> Par classe
          </Button>
          <Button
            variant={viewMode === 'enseignant' ? 'primary' : 'outline-primary'}
            onClick={() => { setViewMode('enseignant'); setFilteredJour(null); }}
          >
            <FaChalkboardTeacher className="me-1" /> Par enseignant
          </Button>
          <Button
            variant={viewMode === 'salle' ? 'primary' : 'outline-primary'}
            onClick={() => { setViewMode('salle'); setFilteredJour(null); }}
          >
            <FaDoorOpen className="me-1" /> Par salle
          </Button>
        </ButtonGroup>
      </div>

      {/* ── Filtres ───────────────────────────────────────────────── */}
      <Card className="mb-3 no-print">
        <Card.Body className="py-2">
          <Row className="g-2 align-items-end">
            {/* Sélecteur principal selon mode */}
            {viewMode === 'classe' && (
              <Col md={4}>
                <Form.Label className="mb-1"><FaFilter className="me-1" />Classe</Form.Label>
                <Form.Select size="sm" value={selectedClasse} onChange={e => setSelectedClasse(e.target.value)}>
                  <option value="">-- Sélectionner --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.libelle} ({c.code})</option>)}
                </Form.Select>
              </Col>
            )}
            {viewMode === 'enseignant' && (
              <Col md={4}>
                <Form.Label className="mb-1"><FaChalkboardTeacher className="me-1" />Enseignant</Form.Label>
                <Form.Select size="sm" value={selectedEnseignant} onChange={e => setSelectedEnseignant(e.target.value)}>
                  <option value="">-- Sélectionner --</option>
                  {enseignants.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
                </Form.Select>
              </Col>
            )}
            {viewMode === 'salle' && (
              <Col md={4}>
                <Form.Label className="mb-1"><FaDoorOpen className="me-1" />Salle</Form.Label>
                <Form.Select size="sm" value={selectedSalle} onChange={e => setSelectedSalle(e.target.value)}>
                  <option value="">-- Sélectionner --</option>
                  {salles.map(s => <option key={s.id} value={s.id}>{s.code}{s.batiment ? ` – ${s.batiment}` : ''}</option>)}
                </Form.Select>
              </Col>
            )}

            {/* Sélecteur de semaine */}
            <Col md={4}>
              <Form.Label className="mb-1">
                Semaine — <span className="text-primary fw-semibold">{getSemaineLabel(selectedSemaine)}</span>
              </Form.Label>
              <Form.Control
                size="sm"
                type="date"
                value={selectedSemaine}
                onChange={e => setSelectedSemaine(getMondayOfWeek(e.target.value))}
              />
            </Col>

            {/* Statut + vue journalière */}
            <Col md={4} className="d-flex align-items-end gap-2 flex-wrap">
              {viewMode === 'classe' && emploiTemps && (
                <Badge bg={STATUT_COLORS[emploiTemps.statut_publication]} className="py-2 px-3">
                  {emploiTemps.statut_publication === 'publie' ? '✓ Publié' : '✏ Brouillon'}
                </Badge>
              )}
              {/* Vue journalière */}
              <div className="ms-auto d-flex align-items-center gap-1">
                <FaCalendarDay className="text-muted" style={{ fontSize: '0.85rem' }} />
                <ButtonGroup size="sm">
                  <Button
                    variant={filteredJour === null ? 'secondary' : 'outline-secondary'}
                    style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                    onClick={() => setFilteredJour(null)}
                  >
                    Sem.
                  </Button>
                  {JOURS_SEMAINE.map(j => (
                    <Button
                      key={j}
                      variant={filteredJour === j ? 'primary' : 'outline-secondary'}
                      style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                      onClick={() => setFilteredJour(filteredJour === j ? null : j)}
                    >
                      {j.slice(0, 2).toUpperCase()}
                    </Button>
                  ))}
                </ButtonGroup>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ── Conseil édition ───────────────────────────────────────── */}
      {isAdmin && viewMode === 'classe' && emploiTemps && emploiTemps.statut_publication === 'brouillon' && (
        <Alert variant="info" className="no-print mb-3 py-2">
          <FaEdit className="me-2" />
          <strong>Mode édition :</strong> Cliquez sur une case vide pour ajouter un créneau.
          Cliquez sur <FaTrash size={12} /> pour supprimer.
        </Alert>
      )}

      {/* ── Grille ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="loading-spinner"><Spinner animation="border" variant="primary" /></div>
      ) : (
        <div
          className="schedule-grid"
          style={{ gridTemplateColumns: gridCols }}
        >
          {/* En-têtes */}
          <div className="day-header" style={{ backgroundColor: '#34495e' }}>Horaire</div>
          {joursAffiches.map(jour => {
            const dateStr   = getDateDuJour(selectedSemaine, jour);
            const isoDate   = getISODate(jour);
            const ferieLib  = isoDate ? joursFeries[isoDate] : null;
            const [jourCourt, ...reste] = dateStr.split(' ');
            return (
              <div
                key={jour}
                className="day-header"
                style={{ flexDirection: 'column', gap: 0, backgroundColor: ferieLib ? '#7f1d1d' : undefined }}
              >
                <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{jourCourt}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>{reste.join(' ')}</span>
                {ferieLib && (
                  <span style={{
                    fontSize: '0.6rem', marginTop: 3, backgroundColor: '#fca5a5',
                    color: '#7f1d1d', borderRadius: 4, padding: '1px 5px', fontWeight: 600,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%'
                  }}>
                    🎌 Férié
                  </span>
                )}
              </div>
            );
          })}

          {/* Lignes horaires */}
          {heuresAffichees.map(heure => (
            <React.Fragment key={heure.debut}>
              <div className="time-slot">
                {heure.debut}<br />-<br />{heure.fin}
              </div>
              {joursAffiches.map(jour => {
                const isoDate  = getISODate(jour);
                const ferieLib = isoDate ? joursFeries[isoDate] : null;
                const creneau  = getCreneau(jour, heure.debut);
                const isEditable = isAdmin && viewMode === 'classe' && emploiTemps
                  && emploiTemps.statut_publication === 'brouillon' && !ferieLib;

                if (ferieLib) {
                  // Cellule jour férié : fond rouge clair, pas de clic
                  return (
                    <div
                      key={`${jour}-${heure.debut}`}
                      className="slot"
                      style={{ backgroundColor: '#fef2f2', cursor: 'not-allowed', borderColor: '#fca5a5' }}
                    >
                      <div style={{ textAlign: 'center', color: '#b91c1c', fontSize: '0.68rem', padding: '4px 2px', lineHeight: 1.3 }}>
                        <div>🎌 Férié</div>
                        <div style={{ fontWeight: 600, marginTop: 2, wordBreak: 'break-word' }}>{ferieLib}</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`${jour}-${heure.debut}`}
                    className={`slot ${creneau ? 'occupied' : ''} ${isEditable && !creneau ? 'slot-clickable' : ''}`}
                    onClick={() => { if (isEditable && !creneau) openAddCreneau(jour, heure.debut, heure.fin); }}
                    style={{ cursor: isEditable && !creneau ? 'pointer' : 'default' }}
                  >
                    {creneau ? (
                      <div style={{ position: 'relative' }}>
                        {renderCellContent(creneau)}
                        {isEditable && (
                          <button
                            className="btn btn-danger btn-sm no-print"
                            style={{ position: 'absolute', top: 0, right: 0, padding: '1px 5px', fontSize: '0.65rem', lineHeight: 1 }}
                            onClick={e => handleDeleteCreneau(creneau.id, e)}
                            title="Supprimer"
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

      {/* ── État vide (mode classe) ───────────────────────────────── */}
      {!loading && viewMode === 'classe' && !emploiTemps && selectedClasse && (
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

      {/* ── État vide (modes enseignant / salle) ─────────────────── */}
      {!loading && viewMode !== 'classe' && creneaux.length === 0 && (
        <div className="text-center py-5 text-muted">
          <FaCalendarAlt size={48} className="mb-3 opacity-25" />
          <p className="mb-1">Aucun créneau pour cette semaine.</p>
          {!isAdmin && (
            <p className="small text-muted">
              Seuls les emplois du temps publiés sont visibles.
            </p>
          )}
          {isAdmin && (
            <p className="small text-muted">
              Vérifiez que des emplois du temps existent pour cette semaine
              (mode « Par classe » pour en créer).
            </p>
          )}
        </div>
      )}

      {/* ══════════ Modal : Créer emploi du temps ══════════ */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Créer un emploi du temps</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">Un emploi du temps vide (brouillon) sera créé pour :</p>
          <ul>
            <li><strong>Classe :</strong> {classes.find(c => c.id.toString() === selectedClasse)?.libelle}</li>
            <li><strong>Semaine :</strong> {getSemaineLabel(selectedSemaine)}</li>
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

      {/* ══════════ Modal : Ajouter créneau ══════════ */}
      <Modal show={showCreneauModal} onHide={() => setShowCreneauModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title><FaPlus className="me-2" />Ajouter un créneau</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {conflits.length > 0 && (
            <Alert variant="danger">
              <FaExclamationTriangle className="me-2" /><strong>Conflit détecté !</strong>
              {conflits.map((c, i) => <div key={i} className="small mt-1">— {c.message || c.type}</div>)}
            </Alert>
          )}
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Jour</Form.Label>
                <Form.Select value={creneauForm.jour} onChange={e => setCreneauForm(f => ({ ...f, jour: e.target.value }))}>
                  {JOURS_OPTIONS.map(j => {
                    const iso = getISODate(j);
                    const fLib = iso ? joursFeries[iso] : null;
                    return (
                      <option key={j} value={j} disabled={!!fLib}>
                        {j.charAt(0).toUpperCase() + j.slice(1)}{fLib ? ` 🎌 Férié (${fLib})` : ''}
                      </option>
                    );
                  })}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Heure début</Form.Label>
                <Form.Control type="time" value={creneauForm.heure_debut} onChange={e => setCreneauForm(f => ({ ...f, heure_debut: e.target.value }))} />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Heure fin</Form.Label>
                <Form.Control type="time" value={creneauForm.heure_fin} onChange={e => setCreneauForm(f => ({ ...f, heure_fin: e.target.value }))} />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Matière</Form.Label>
                <Form.Select
                  value={creneauForm.id_matiere}
                  onChange={e => {
                    const idMatiere = e.target.value;
                    const autoEns = matEnsMap[idMatiere]?.toString() || creneauForm.id_enseignant;
                    setCreneauForm(f => ({ ...f, id_matiere: idMatiere, id_enseignant: autoEns }));
                  }}
                >
                  <option value="">-- Choisir --</option>
                  {matieres.map(m => <option key={m.id} value={m.id}>{m.libelle} ({m.code})</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Enseignant</Form.Label>
                <Form.Select value={creneauForm.id_enseignant} onChange={e => setCreneauForm(f => ({ ...f, id_enseignant: e.target.value }))}>
                  <option value="">-- Choisir --</option>
                  {enseignants.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Salle</Form.Label>
                <Form.Select value={creneauForm.id_salle} onChange={e => setCreneauForm(f => ({ ...f, id_salle: e.target.value }))}>
                  <option value="">-- Choisir --</option>
                  {salles.map(s => <option key={s.id} value={s.id}>{s.code}{s.batiment ? ` – ${s.batiment}` : ''}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreneauModal(false)}>Annuler</Button>
          <Button variant="primary" onClick={handleSaveCreneau} disabled={savingCreneau}>
            {savingCreneau ? <><Spinner size="sm" animation="border" className="me-1" />Vérification...</> : <><FaPlus className="me-1" />Ajouter</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ══════════ Modal : Dupliquer ══════════ */}
      <Modal show={showDupModal} onHide={closeDupModal} centered>
        <Modal.Header closeButton>
          <Modal.Title><FaCopy className="me-2 text-info" />Dupliquer l'emploi du temps</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!dupResultat ? (
            <>
              <p className="text-muted mb-3">
                Copie de tous les créneaux de la semaine <strong>{getSemaineLabel(selectedSemaine)}</strong> vers une nouvelle semaine.
              </p>
              <Form.Group>
                <Form.Label>Semaine cible (lundi)</Form.Label>
                <Form.Control
                  type="date"
                  value={dupSemaineCible}
                  onChange={e => setDupSemaineCible(e.target.value)}
                />
                {dupSemaineCible && (
                  <Form.Text className="text-muted">{getSemaineLabel(dupSemaineCible)}</Form.Text>
                )}
              </Form.Group>
              <Alert variant="info" className="mt-3 mb-0 py-2 small">
                Les créneaux en conflit (enseignant ou salle déjà occupé) seront ignorés automatiquement.
              </Alert>
            </>
          ) : (
            <Alert variant={dupResultat.nb_skipped > 0 ? 'warning' : 'success'}>
              <div className="fw-bold mb-1">Duplication réussie !</div>
              <div>{dupResultat.nb_creneaux} créneau(x) copié(s)</div>
              {dupResultat.nb_skipped > 0 && (
                <div className="mt-1">
                  {dupResultat.nb_skipped} créneau(x) ignoré(s) (conflit) :
                  <ul className="mb-0 mt-1 small">
                    {dupResultat.skipped.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              <div className="mt-2 small text-muted">
                Nouvel emploi du temps créé en brouillon. Vous y serez redirigé à la fermeture.
              </div>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDupModal}>
            {dupResultat ? 'Fermer et aller à la semaine' : 'Annuler'}
          </Button>
          {!dupResultat && (
            <Button variant="info" onClick={handleDupliquer} disabled={dupliquant || !dupSemaineCible}>
              {dupliquant
                ? <><Spinner size="sm" animation="border" className="me-1" />Duplication...</>
                : <><FaCopy className="me-1" />Dupliquer</>}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EmploiTempsPage;
