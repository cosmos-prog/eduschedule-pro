/**
 * EduSchedule Pro - Page Pointage QR-Code
 *
 * Mode Admin/Surveillant  : générer le QR + voir statuts du jour
 * Mode Enseignant (téléphone) : afficher infos séance + valider pointage
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Row, Col, Card, Form, Button, Badge, Spinner, Alert, Table
} from 'react-bootstrap';
import {
  FaQrcode, FaCheckCircle, FaClock, FaExclamationTriangle,
  FaTimesCircle, FaKeyboard, FaChalkboardTeacher, FaMapMarkerAlt,
  FaUsers, FaCalendarAlt, FaPrint, FaSync, FaCamera, FaStop
} from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { useLocation } from 'react-router-dom';
import { pointagesService, emploiTempsService, classesService } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNotif } from '../context/NotifContext';
import { formatTime, getMondayOfWeek, getDateDuJour, getSemaineLabel } from '../utils/helpers';

/* ─── Calcule la Date JS d'un créneau à partir du lundi + jour + heure ─── */
const getCreneauDateTime = (lundi, jour, heure) => {
  const index = ['lundi','mardi','mercredi','jeudi','vendredi','samedi'].indexOf(jour);
  if (index === -1 || !lundi) return null;
  const date = new Date(lundi);
  date.setDate(date.getDate() + index);
  if (heure) {
    const [h, m] = heure.split(':').map(Number);
    date.setHours(h, m, 0, 0);
  }
  return date;
};

/* ─────────────────────────────────────────────
   Sous-composant : copie URL + token de secours
───────────────────────────────────────────── */
const copyText = (text, id, setCopied) => {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
    return;
  }
  const el = document.getElementById(id);
  if (el) {
    el.select();
    el.setSelectionRange(0, 99999);
    try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
  }
};

const UrlCopyBox = ({ scanUrl, token }) => {
  const [copiedToken, setCopiedToken] = useState(false);

  return (
    <div className="mt-3 p-3 rounded border bg-light">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="small fw-bold text-dark">Code à transmettre à l'enseignant</span>
        <Button
          size="sm"
          variant={copiedToken ? 'success' : 'primary'}
          onClick={() => copyText(token, 'token-textarea', setCopiedToken)}
        >
          {copiedToken ? 'Copié !' : 'Copier le code'}
        </Button>
      </div>
      <textarea
        id="token-textarea"
        readOnly
        value={token || ''}
        rows={3}
        className="form-control font-monospace"
        style={{ fontSize: '0.68rem', resize: 'none', background: '#fff' }}
        onClick={e => e.target.select()}
      />
      <div className="small text-muted mt-1">
        L'enseignant colle ce code dans son téléphone puis valide son pointage.
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Sous-composant : carte infos séance (smartphone)
───────────────────────────────────────────── */
const SeanceInfoCard = ({ info }) => {
  const couleurFenetre = {
    valide:  { bg: 'success', label: '✓ Pointage autorisé' },
    retard:  { bg: 'warning', label: '⚠ Retard détecté' },
    trop_tot:{ bg: 'info',    label: '⏳ Trop tôt' },
    expire:  { bg: 'danger',  label: '✗ Fenêtre expirée' },
  }[info.statut_fenetre] || { bg: 'secondary', label: '?' };

  return (
    <Card className="mb-4 shadow-sm border-0">
      <Card.Header className={`bg-${couleurFenetre.bg} text-white text-center py-3`}>
        <h5 className="mb-0">{couleurFenetre.label}</h5>
        <small>{info.message_fenetre}</small>
      </Card.Header>
      <Card.Body className="p-4">
        <h4 className="text-center mb-1 text-primary fw-bold">{info.matiere}</h4>
        <p className="text-center text-muted small mb-4">Code : {info.matiere_code}</p>

        <Row className="g-3 text-center">
          <Col xs={6}>
            <div className="p-3 bg-light rounded">
              <FaUsers className="text-primary mb-1" />
              <div className="small text-muted">Classe</div>
              <div className="fw-bold">{info.classe}</div>
            </div>
          </Col>
          <Col xs={6}>
            <div className="p-3 bg-light rounded">
              <FaMapMarkerAlt className="text-primary mb-1" />
              <div className="small text-muted">Salle</div>
              <div className="fw-bold">{info.salle}</div>
            </div>
          </Col>
          <Col xs={6}>
            <div className="p-3 bg-light rounded">
              <FaClock className="text-primary mb-1" />
              <div className="small text-muted">Horaire prévu</div>
              <div className="fw-bold">{info.heure_debut} – {info.heure_fin}</div>
            </div>
          </Col>
          <Col xs={6}>
            <div className="p-3 bg-light rounded">
              <FaChalkboardTeacher className="text-primary mb-1" />
              <div className="small text-muted">Enseignant</div>
              <div className="fw-bold" style={{ fontSize: '0.8rem' }}>{info.enseignant}</div>
            </div>
          </Col>
        </Row>

        {!info.est_mon_creneau && (
          <Alert variant="danger" className="mt-3 mb-0 text-center small">
            <FaExclamationTriangle className="me-1" />
            Ce créneau n'est pas attribué à votre compte
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

/* ─────────────────────────────────────────────
   Sous-composant : badge statut séance
───────────────────────────────────────────── */
const StatutBadge = ({ statut }) => {
  const cfg = {
    en_cours:  { bg: 'success',   label: '● En cours' },
    retard:    { bg: 'warning',   label: '◐ Retard' },
    absent:    { bg: 'danger',    label: '✕ Absent' },
    en_attente:{ bg: 'secondary', label: '○ En attente' },
    planifie:  { bg: 'light',     label: '◌ Planifié', text: 'dark' },
  }[statut] || { bg: 'secondary', label: '?' };

  return (
    <Badge bg={cfg.bg} text={cfg.text} className="px-2 py-1">
      {cfg.label}
    </Badge>
  );
};

/* ─────────────────────────────────────────────
   Page principale
───────────────────────────────────────────── */
const PointagePage = () => {
  const { hasRole } = useAuth();
  const notif = useNotif();
  const location = useLocation();

  // Lire le token depuis l'URL (?token=XXX)
  const urlToken = new URLSearchParams(location.search).get('token') || '';

  const isEnseignant     = hasRole(['enseignant']);
  const isAdminOrSurveillant = hasRole(['admin', 'surveillant']);

  // ── États mode enseignant ──
  const [tokenInput, setTokenInput]     = useState(urlToken);
  const [seanceInfo, setSeanceInfo]     = useState(null);
  const [loadingInfo, setLoadingInfo]   = useState(false);
  const [validating, setValidating]     = useState(false);
  const [scanResult, setScanResult]     = useState(null);
  const [infoError, setInfoError]       = useState('');
  const [scanning, setScanning]         = useState(false);
  const [cameraError, setCameraError]   = useState('');
  const qrCodeRef                       = useRef(null);

  // ── États mode admin/surveillant ──
  const [mode, setMode]                 = useState('generate');
  const [qrData, setQrData]            = useState(null);
  const [loading, setLoading]           = useState(false);
  const [classes, setClasses]           = useState([]);
  const [creneaux, setCreneaux]         = useState([]);
  const [selectedClasse, setSelectedClasse]   = useState('');
  const [selectedSemaine, setSelectedSemaine] = useState(getMondayOfWeek());
  const [selectedCreneau, setSelectedCreneau] = useState('');
  const [statuts, setStatuts]               = useState([]);
  const [loadingStatuts, setLoadingStatuts]  = useState(false);
  const [alertes, setAlertes]               = useState([]);
  const [loadingAlertes, setLoadingAlertes]  = useState(false);

  // ── Charger infos séance depuis token (enseignant) ──
  const fetchSeanceInfo = useCallback(async (token) => {
    if (!token) return;
    setLoadingInfo(true);
    setInfoError('');
    setSeanceInfo(null);
    setScanResult(null);
    try {
      const res = await pointagesService.getInfo(token);
      setSeanceInfo(res.data.data);
    } catch (err) {
      setInfoError(err.response?.data?.message || 'QR-Code invalide ou expiré');
    } finally {
      setLoadingInfo(false);
    }
  }, []);

  // Auto-charger si token dans URL
  useEffect(() => {
    if (urlToken && isEnseignant) {
      fetchSeanceInfo(urlToken);
    }
  }, [urlToken, isEnseignant, fetchSeanceInfo]);

  // ── Démarrer le scanner caméra ──
  const startCamera = useCallback(async () => {
    setCameraError('');
    setScanning(true);
    // Laisser le DOM créer le div avant d'initialiser
    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const qr = new Html5Qrcode('qr-camera-div');
        qrCodeRef.current = qr;
        await qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decodedText) => {
            const token = extraireToken(decodedText);
            setTokenInput(token);
            stopCamera();
            fetchSeanceInfo(token);
          },
          () => {} // erreurs de décodage normales — on ignore
        );
      } catch (err) {
        setCameraError('Impossible d\'accéder à la caméra. Autorisez l\'accès et réessayez.');
        setScanning(false);
      }
    }, 100);
  }, [fetchSeanceInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Arrêter le scanner caméra ──
  const stopCamera = useCallback(async () => {
    if (qrCodeRef.current) {
      try {
        // Vérifier que le scanner est bien en cours avant de l'arrêter
        const state = qrCodeRef.current.getState?.();
        // State 2 = SCANNING, State 3 = PAUSED
        if (!state || state === 2 || state === 3) {
          await qrCodeRef.current.stop();
        }
      } catch {
        // Ignorer les erreurs d'arrêt (scanner pas encore démarré)
      }
      qrCodeRef.current = null;
    }
    setScanning(false);
  }, []);

  // Cleanup caméra à la destruction du composant
  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  // ── Extraire le token depuis un texte brut OU une URL complète ──
  const extraireToken = (texte) => {
    const t = texte.trim();
    // Si l'utilisateur a collé l'URL complète (ex: http://192.168.../pointage?token=XXX)
    try {
      const url = new URL(t);
      const token = url.searchParams.get('token');
      if (token) return token;
    } catch {}
    // Sinon c'est le token brut
    return t;
  };

  // ── Valider le pointage ──
  const handleValider = async () => {
    const token = extraireToken(tokenInput);
    if (!token) return;
    setValidating(true);
    setInfoError('');
    try {
      const res = await pointagesService.scan(token);
      setScanResult(res.data);
      setSeanceInfo(null);
      notif.success(res.data.message);
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors du pointage';
      setInfoError(msg);
      notif.error(msg);
    } finally {
      setValidating(false);
    }
  };

  // ── Charger classes (admin/surveillant) ──
  useEffect(() => {
    if (isAdminOrSurveillant) {
      classesService.getAll().then(r => setClasses(r.data.data || [])).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Charger créneaux selon la classe et la semaine choisies ──
  useEffect(() => {
    if (selectedClasse && selectedSemaine) {
      setCreneaux([]);
      setSelectedCreneau('');
      emploiTempsService.getAll({ id_classe: selectedClasse, semaine: selectedSemaine })
        .then(async r => {
          if (r.data.data?.length > 0) {
            const detail = await emploiTempsService.getById(r.data.data[0].id);
            setCreneaux(detail.data.data?.creneaux || []);
          } else setCreneaux([]);
        }).catch(() => {});
    }
  }, [selectedClasse, selectedSemaine]);

  // ── Générer QR ──
  const handleGenerate = async () => {
    if (!selectedCreneau) { notif.warning('Sélectionnez un créneau'); return; }
    setLoading(true);
    try {
      const response = await pointagesService.getQR(selectedCreneau);
      setQrData(response.data.data);
      notif.success('QR-Code généré');
    } catch (err) {
      notif.error(err.response?.data?.message || 'Erreur de génération');
    } finally {
      setLoading(false);
    }
  };

  // ── Charger statuts du jour ──
  const loadStatuts = useCallback(async () => {
    setLoadingStatuts(true);
    try {
      const res = await pointagesService.getStatutsAujourdhui();
      setStatuts(res.data.data || []);
    } catch {
      setStatuts([]);
    } finally {
      setLoadingStatuts(false);
    }
  }, []);

  // ── Charger alertes retard ──
  const loadAlertes = useCallback(async () => {
    setLoadingAlertes(true);
    try {
      const res = await pointagesService.getAlertes();
      setAlertes(res.data.data || []);
    } catch {
      setAlertes([]);
    } finally {
      setLoadingAlertes(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdminOrSurveillant) return;
    if (mode === 'statuts') {
      loadStatuts();
      // Auto-refresh toutes les 30 secondes
      const iv = setInterval(loadStatuts, 30000);
      return () => clearInterval(iv);
    }
    if (mode === 'alertes') loadAlertes();
  }, [mode, isAdminOrSurveillant, loadStatuts, loadAlertes]);

  /* ══════════════════════════════════════════
     RENDU ENSEIGNANT (smartphone)
  ══════════════════════════════════════════ */
  if (isEnseignant) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '1rem' }}>
        <h4 className="text-center mb-4">
          <FaQrcode className="me-2 text-primary" />
          Mon Pointage
        </h4>

        {/* ── Résultat après validation ── */}
        {scanResult && (
          <div>
            <Alert variant={scanResult.success ? 'success' : 'danger'} className="text-center">
              {scanResult.success
                ? <FaCheckCircle size={48} className="mb-2 d-block mx-auto" />
                : <FaTimesCircle size={48} className="mb-2 d-block mx-auto" />}
              <h5 className="mb-1">{scanResult.success ? 'Pointage enregistré !' : 'Échec du pointage'}</h5>
              <p className="mb-2">{scanResult.message}</p>
            </Alert>

            {/* Détails de la séance après validation */}
            {scanResult.success && scanResult.data && (
              <Card className="shadow-sm border-0 mb-3">
                <Card.Body>
                  <h6 className="text-primary fw-bold mb-3">
                    {scanResult.data.creneau?.matiere_libelle || 'Séance'}
                  </h6>
                  <Row className="g-2 text-center">
                    <Col xs={6}>
                      <div className="p-2 bg-light rounded">
                        <FaClock className="text-primary mb-1" size={14} />
                        <div className="small text-muted">Heure prévue</div>
                        <div className="fw-bold">
                          {scanResult.data.creneau?.heure_debut?.substring(0,5)} – {scanResult.data.creneau?.heure_fin?.substring(0,5)}
                        </div>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className={`p-2 rounded ${scanResult.data.retard_minutes > 0 ? 'bg-warning bg-opacity-25' : 'bg-success bg-opacity-10'}`}>
                        <FaCheckCircle className={`mb-1 ${scanResult.data.retard_minutes > 0 ? 'text-warning' : 'text-success'}`} size={14} />
                        <div className="small text-muted">Heure réelle</div>
                        <div className="fw-bold">{scanResult.data.heure_pointage}</div>
                      </div>
                    </Col>
                    {scanResult.data.retard_minutes > 0 && (
                      <Col xs={12}>
                        <Alert variant="warning" className="py-2 mb-0 text-center small">
                          <FaExclamationTriangle className="me-1" />
                          <strong>Retard de {scanResult.data.retard_minutes} min</strong> — Le surveillant a été notifié automatiquement.
                        </Alert>
                      </Col>
                    )}
                    <Col xs={6}>
                      <div className="p-2 bg-light rounded">
                        <FaUsers className="text-primary mb-1" size={14} />
                        <div className="small text-muted">Classe</div>
                        <div className="fw-bold">{scanResult.data.creneau?.classe_libelle}</div>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="p-2 bg-light rounded">
                        <FaMapMarkerAlt className="text-primary mb-1" size={14} />
                        <div className="small text-muted">Salle</div>
                        <div className="fw-bold">{scanResult.data.creneau?.salle_code}</div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}

            <div className="d-grid">
              <Button variant="outline-primary"
                onClick={() => { setScanResult(null); setTokenInput(''); setSeanceInfo(null); setInfoError(''); }}>
                Nouveau pointage
              </Button>
            </div>
          </div>
        )}

        {/* ── Saisie + infos séance ── */}
        {!scanResult && (
          <div>
            {/* Spinner chargement infos */}
            {loadingInfo && (
              <div className="text-center py-4">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted small">Chargement des informations de la séance...</p>
              </div>
            )}

            {/* Infos séance chargées */}
            {!loadingInfo && seanceInfo && (
              <SeanceInfoCard info={seanceInfo} />
            )}

            {/* Erreur */}
            {!loadingInfo && infoError && (
              <Alert variant="danger" className="py-2 small mb-3">
                <FaTimesCircle className="me-1" /> {infoError}
              </Alert>
            )}

            {/* ── Scanner caméra ── */}
            <Card className="shadow-sm border-0 mb-3">
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0 text-primary">
                    <FaCamera className="me-2" />Scanner le QR-Code
                  </h6>
                  {scanning && (
                    <Button size="sm" variant="outline-danger" onClick={stopCamera}>
                      <FaStop className="me-1" />Arrêter
                    </Button>
                  )}
                </div>

                {cameraError && (
                  <Alert variant="warning" className="py-2 small mb-2">{cameraError}</Alert>
                )}

                {/* Div caméra — toujours présent dans le DOM quand scanning=true */}
                <div id="qr-camera-div" style={{ display: scanning ? 'block' : 'none', borderRadius: 8, overflow: 'hidden' }} />

                {!scanning && (
                  <div className="d-grid">
                    <Button variant="outline-primary" onClick={startCamera}>
                      <FaCamera className="me-2" />Ouvrir la caméra pour scanner
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Zone de saisie manuelle */}
            <Card className="shadow-sm border-0">
              <Card.Body className="p-4">
                <h6 className="mb-1 text-dark">
                  <FaKeyboard className="me-2" />
                  {seanceInfo ? 'Code de la séance' : 'Ou coller le code manuellement'}
                </h6>
                {!seanceInfo && (
                  <p className="text-muted small mb-3">
                    Copie le code depuis le PC de l'admin/surveillant et colle-le ici
                  </p>
                )}

                <Form.Control
                  as="textarea"
                  rows={seanceInfo ? 2 : 3}
                  placeholder="Colle le code ici..."
                  value={tokenInput}
                  onChange={e => {
                    setTokenInput(e.target.value);
                    setInfoError('');
                    setSeanceInfo(null);
                  }}
                  className="mb-3 font-monospace"
                  style={{ fontSize: '0.72rem' }}
                />

                {/* Bouton charger infos (si pas encore chargé) */}
                {!seanceInfo && tokenInput.trim() && !loadingInfo && (
                  <Button
                    variant="outline-primary"
                    className="w-100 mb-2"
                    onClick={() => fetchSeanceInfo(extraireToken(tokenInput))}
                  >
                    <FaCalendarAlt className="me-2" />Voir les infos de la séance
                  </Button>
                )}

                {/* Bouton valider */}
                <div className="d-grid">
                  <Button
                    variant="success"
                    size="lg"
                    onClick={handleValider}
                    disabled={!tokenInput.trim() || validating || (seanceInfo && !seanceInfo.est_mon_creneau)}
                    className="py-3 fw-bold"
                  >
                    {validating
                      ? <><Spinner size="sm" animation="border" className="me-2" />Validation en cours...</>
                      : <><FaCheckCircle className="me-2" />Valider mon pointage</>}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        )}
      </div>
    );
  }

  /* ══════════════════════════════════════════
     RENDU ADMIN / SURVEILLANT
  ══════════════════════════════════════════ */
  return (
    <div>
      <h4 className="mb-4"><FaQrcode className="me-2" />Pointage QR-Code</h4>

      {/* Onglets */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        <Button variant={mode === 'generate' ? 'primary' : 'outline-primary'}
          onClick={() => setMode('generate')}>
          <FaQrcode className="me-1" /> Générer QR
        </Button>
        <Button variant={mode === 'statuts' ? 'primary' : 'outline-primary'}
          onClick={() => setMode('statuts')}>
          <FaCalendarAlt className="me-1" /> Statuts du jour
        </Button>
        <Button variant={mode === 'alertes' ? 'danger' : 'outline-danger'}
          onClick={() => setMode('alertes')}>
          <FaExclamationTriangle className="me-1" /> Alertes retard
          {alertes.length > 0 && (
            <span className="ms-1 badge bg-white text-danger">{alertes.length}</span>
          )}
        </Button>
      </div>

      <Row className="g-4">
        {/* ── Mode Génération ── */}
        {mode === 'generate' && (
          <Col lg={8}>
            <Card className="stat-card">
              <Card.Body>
                <h6 className="mb-3">Générer un QR-Code de pointage</h6>
                <Row className="g-3 mb-3">
                  {/* Classe */}
                  <Col md={4}>
                    <Form.Label className="small text-muted mb-1">Classe</Form.Label>
                    <Form.Select value={selectedClasse} onChange={e => { setSelectedClasse(e.target.value); setQrData(null); }}>
                      <option value="">-- Classe --</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
                    </Form.Select>
                  </Col>

                  {/* Semaine */}
                  <Col md={3}>
                    <Form.Label className="small text-muted mb-1">
                      Semaine — <span className="text-primary fw-semibold" style={{ fontSize: '0.78rem' }}>{getSemaineLabel(selectedSemaine)}</span>
                    </Form.Label>
                    <Form.Control
                      type="date"
                      value={selectedSemaine}
                      onChange={e => { setSelectedSemaine(getMondayOfWeek(e.target.value)); setQrData(null); }}
                    />
                  </Col>

                  {/* Créneau — filtré : uniquement les séances à venir */}
                  <Col md={5}>
                    <Form.Label className="small text-muted mb-1">
                      Créneau
                      {creneaux.length > 0 && (() => {
                        const now = new Date();
                        const passes = creneaux.filter(c => {
                          const fin = getCreneauDateTime(selectedSemaine, c.jour, c.heure_fin);
                          return fin && fin < now;
                        }).length;
                        return passes > 0
                          ? <span className="text-muted ms-1" style={{ fontSize: '0.72rem' }}>({passes} passé{passes > 1 ? 's' : ''} masqué{passes > 1 ? 's' : ''})</span>
                          : null;
                      })()}
                    </Form.Label>
                    <Form.Select value={selectedCreneau} onChange={e => { setSelectedCreneau(e.target.value); setQrData(null); }}>
                      <option value="">-- Sélectionner un créneau --</option>
                      {creneaux
                        .filter(c => {
                          // Masquer les créneaux dont la fin est déjà passée
                          const fin = getCreneauDateTime(selectedSemaine, c.jour, c.heure_fin);
                          return !fin || fin >= new Date();
                        })
                        .map(c => {
                          const dateStr = getDateDuJour(selectedSemaine, c.jour); // "Lun. 14 avr."
                          return (
                            <option key={c.id} value={c.id}>
                              {dateStr} · {formatTime(c.heure_debut)}-{formatTime(c.heure_fin)} · {c.matiere_libelle}
                            </option>
                          );
                        })}
                    </Form.Select>
                    {creneaux.length > 0 &&
                      creneaux.filter(c => {
                        const fin = getCreneauDateTime(selectedSemaine, c.jour, c.heure_fin);
                        return !fin || fin >= new Date();
                      }).length === 0 && (
                      <div className="small text-warning mt-1">
                        <FaExclamationTriangle className="me-1" />
                        Tous les créneaux de cette semaine sont passés.
                      </div>
                    )}
                  </Col>

                  {/* Bouton */}
                  <Col md={12} className="d-flex justify-content-end">
                    <Button variant="primary" onClick={handleGenerate} disabled={loading || !selectedCreneau}>
                      {loading ? <><Spinner animation="border" size="sm" className="me-1" />Génération...</> : <><FaQrcode className="me-1" />Générer le QR</>}
                    </Button>
                  </Col>
                </Row>

                {qrData && (
                  <div className="qr-container text-center">
                    {/* Zone imprimable */}
                    <div id="qr-print-zone" style={{ display: 'inline-block' }}>
                      <QRCodeSVG value={qrData.scan_url} size={250} level="H" includeMargin />
                      <div className="mt-2">
                        <p className="fw-bold mb-0" style={{ fontSize: '1.1rem' }}>{qrData.creneau.matiere}</p>
                        <p className="text-muted mb-0 small">{qrData.creneau.enseignant}</p>
                        <p className="text-muted mb-1 small">
                          Salle {qrData.creneau.salle} &nbsp;|&nbsp;
                          {getDateDuJour(selectedSemaine, qrData.creneau.jour)} &nbsp;|&nbsp; {qrData.creneau.heure}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 d-flex flex-column align-items-center gap-2">
                      <div className="d-flex gap-2">
                        <Badge bg="success">
                          <FaClock className="me-1" />
                          Fenêtre : ±15 min autour de {qrData.creneau.heure.split(' - ')[0]}
                        </Badge>
                        <Badge bg="warning" text="dark">
                          Expire à {new Date(qrData.expire).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </Badge>
                      </div>
                      <Badge bg="info">🔒 Usage unique — se désactive après le scan</Badge>

                      {/* Bouton imprimer */}
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        className="mt-1"
                        onClick={() => {
                          const zone = document.getElementById('qr-print-zone');
                          const w = window.open('', '_blank');
                          w.document.write(`
                            <html><head><title>QR Pointage — ${qrData.creneau.matiere}</title>
                            <style>body{text-align:center;font-family:sans-serif;padding:2rem}
                            p{margin:4px 0}h2{margin-bottom:4px}</style></head>
                            <body>
                              <h2>${qrData.creneau.matiere}</h2>
                              <p>${qrData.creneau.enseignant} | Salle ${qrData.creneau.salle}</p>
                              <p>${getDateDuJour(selectedSemaine, qrData.creneau.jour)} | ${qrData.creneau.heure}</p>
                              <br/>${zone.querySelector('svg').outerHTML}
                              <p style="margin-top:12px;font-size:0.85rem;color:#666">
                                Scannez ce QR avec votre téléphone pour valider votre présence.<br/>
                                Fenêtre valide : ±15 min autour de l'heure prévue.
                              </p>
                            </body></html>
                          `);
                          w.document.close();
                          w.print();
                        }}
                      >
                        <FaPrint className="me-1" /> Imprimer / Afficher
                      </Button>
                    </div>

                    {/* URL directe + token de secours */}
                    <UrlCopyBox scanUrl={qrData.scan_url} token={qrData.token} />
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* ── Mode Statuts du jour ── */}
        {mode === 'statuts' && (
          <Col xs={12}>
            <Card className="stat-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0">
                    <FaCalendarAlt className="me-2" />
                    Séances du {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h6>
                  <div className="d-flex align-items-center gap-2">
                    <small className="text-muted">Rafraîchi toutes les 30s</small>
                    <Button variant="outline-secondary" size="sm" onClick={loadStatuts} disabled={loadingStatuts}>
                      <FaSync className={loadingStatuts ? 'fa-spin' : ''} />
                    </Button>
                  </div>
                </div>

                {loadingStatuts ? (
                  <div className="text-center py-4"><Spinner animation="border" /></div>
                ) : statuts.length === 0 ? (
                  <p className="text-muted text-center py-4">Aucune séance planifiée aujourd'hui.</p>
                ) : (
                  <Table hover responsive className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Horaire</th>
                        <th>Matière</th>
                        <th>Classe</th>
                        <th>Enseignant</th>
                        <th>Salle</th>
                        <th>Statut</th>
                        <th>Pointage réel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statuts.map(s => (
                        <tr key={s.id}>
                          <td className="fw-bold">{s.heure_debut} – {s.heure_fin}</td>
                          <td>{s.matiere}</td>
                          <td>{s.classe}</td>
                          <td>{s.enseignant}</td>
                          <td>{s.salle}</td>
                          <td><StatutBadge statut={s.statut_visuel} /></td>
                          <td>
                            {s.heure_pointage_reelle
                              ? new Date(s.heure_pointage_reelle).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                              : <span className="text-muted">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}

                {/* Légende */}
                <div className="d-flex gap-3 mt-3 flex-wrap">
                  {[
                    { statut: 'en_cours',  label: 'En cours' },
                    { statut: 'retard',    label: 'Retard' },
                    { statut: 'absent',    label: 'Absent (>30 min)' },
                    { statut: 'en_attente',label: 'En attente' },
                    { statut: 'planifie',  label: 'Planifié' },
                  ].map(item => (
                    <span key={item.statut} className="small">
                      <StatutBadge statut={item.statut} /> {item.label}
                    </span>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* ── Mode Alertes retard ── */}
        {mode === 'alertes' && (
          <Col xs={12}>
            <Card className="stat-card border-danger border-opacity-25">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0 text-danger">
                    <FaExclamationTriangle className="me-2" />
                    Alertes retard — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h6>
                  <Button variant="outline-secondary" size="sm" onClick={loadAlertes} disabled={loadingAlertes}>
                    ↻ Actualiser
                  </Button>
                </div>

                {loadingAlertes ? (
                  <div className="text-center py-4"><Spinner animation="border" variant="danger" /></div>
                ) : alertes.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <FaCheckCircle size={36} className="mb-2 text-success opacity-50" />
                    <p>Aucune alerte retard aujourd'hui.</p>
                  </div>
                ) : (
                  <Table hover responsive className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Heure alerte</th>
                        <th>Enseignant</th>
                        <th>Matière</th>
                        <th>Classe</th>
                        <th>Horaire prévu</th>
                        <th>Retard</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alertes.map((a, i) => (
                        <tr key={i} className="table-warning">
                          <td>{new Date(a.horodatage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="fw-bold">{a.enseignant_nom}</td>
                          <td>{a.matiere_libelle}</td>
                          <td>{a.classe_libelle}</td>
                          <td>{a.heure_debut?.substring(0,5)} – {a.heure_fin?.substring(0,5)}</td>
                          <td>
                            <Badge bg="danger">
                              +{a.retard_minutes} min
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default PointagePage;
