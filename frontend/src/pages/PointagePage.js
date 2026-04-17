/**
 * EduSchedule Pro - Page Pointage QR-Code
 *
 * Mode Admin/Surveillant  : générer le QR + voir statuts du jour
 * Mode Enseignant (téléphone) : afficher infos séance + valider pointage
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Row, Col, Card, Form, Button, Badge, Spinner, Alert, Table
} from 'react-bootstrap';
import {
  FaQrcode, FaCheckCircle, FaClock, FaExclamationTriangle,
  FaTimesCircle, FaKeyboard, FaChalkboardTeacher, FaMapMarkerAlt,
  FaUsers, FaCalendarAlt
} from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { useLocation } from 'react-router-dom';
import { pointagesService, emploiTempsService, classesService } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNotif } from '../context/NotifContext';
import { formatTime, getMondayOfWeek } from '../utils/helpers';

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
  const [saisieManuelle, setSaisieManuelle] = useState(false);

  // ── États mode admin/surveillant ──
  const [mode, setMode]                 = useState('generate');
  const [qrData, setQrData]            = useState(null);
  const [loading, setLoading]           = useState(false);
  const [classes, setClasses]           = useState([]);
  const [creneaux, setCreneaux]         = useState([]);
  const [selectedClasse, setSelectedClasse] = useState('');
  const [selectedCreneau, setSelectedCreneau] = useState('');
  const [statuts, setStatuts]           = useState([]);
  const [loadingStatuts, setLoadingStatuts] = useState(false);

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

  // ── Valider le pointage ──
  const handleValider = async () => {
    setValidating(true);
    try {
      const res = await pointagesService.scan(tokenInput);
      setScanResult(res.data);
      setSeanceInfo(null);
      notif.success(res.data.message);
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors du pointage';
      setScanResult({ success: false, message: msg });
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

  // ── Charger créneaux selon la classe choisie ──
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

  useEffect(() => {
    if (mode === 'statuts' && isAdminOrSurveillant) loadStatuts();
  }, [mode, isAdminOrSurveillant, loadStatuts]);

  /* ══════════════════════════════════════════
     RENDU ENSEIGNANT (smartphone)
  ══════════════════════════════════════════ */
  if (isEnseignant) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
        <h4 className="text-center mb-4">
          <FaQrcode className="me-2 text-primary" />
          Mon Pointage
        </h4>

        {/* Résultat après validation */}
        {scanResult && (
          <Alert variant={scanResult.success ? 'success' : 'danger'} className="text-center">
            {scanResult.success
              ? <FaCheckCircle size={40} className="mb-2 d-block mx-auto" />
              : <FaTimesCircle size={40} className="mb-2 d-block mx-auto" />}
            <h5>{scanResult.success ? 'Pointage enregistré !' : 'Échec du pointage'}</h5>
            <p className="mb-2">{scanResult.message}</p>
            {scanResult.data && (
              <div className="small">
                <span className="me-3">
                  <strong>Heure réelle :</strong> {scanResult.data.heure_pointage}
                </span>
                {scanResult.data.retard_minutes > 0 && (
                  <span className="text-warning">
                    <FaClock className="me-1" />
                    {scanResult.data.retard_minutes} min de retard
                  </span>
                )}
              </div>
            )}
            <hr />
            <Button variant="outline-primary" size="sm"
              onClick={() => { setScanResult(null); setTokenInput(''); setSeanceInfo(null); }}>
              Nouveau pointage
            </Button>
          </Alert>
        )}

        {/* Chargement infos */}
        {!scanResult && loadingInfo && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Chargement des informations...</p>
          </div>
        )}

        {/* Erreur token */}
        {!scanResult && !loadingInfo && infoError && (
          <Alert variant="danger" className="text-center">
            <FaTimesCircle size={32} className="mb-2 d-block mx-auto" />
            <strong>{infoError}</strong>
            <hr />
            <Button variant="outline-secondary" size="sm"
              onClick={() => { setInfoError(''); setSaisieManuelle(true); }}>
              <FaKeyboard className="me-1" /> Saisir un code manuellement
            </Button>
          </Alert>
        )}

        {/* Carte infos séance */}
        {!scanResult && !loadingInfo && seanceInfo && (
          <>
            <SeanceInfoCard info={seanceInfo} />

            {seanceInfo.est_mon_creneau && seanceInfo.statut_fenetre !== 'expire' && seanceInfo.statut_fenetre !== 'trop_tot' && (
              <div className="d-grid mt-2">
                <Button
                  variant={seanceInfo.statut_fenetre === 'retard' ? 'warning' : 'success'}
                  size="lg"
                  onClick={handleValider}
                  disabled={validating}
                  className="py-3 fw-bold"
                >
                  {validating
                    ? <><Spinner size="sm" animation="border" className="me-2" />Validation...</>
                    : <><FaCheckCircle className="me-2" />Valider mon pointage</>}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Saisie manuelle */}
        {!scanResult && !loadingInfo && !seanceInfo && (saisieManuelle || !urlToken) && (
          <Card className="shadow-sm border-0">
            <Card.Body className="p-4">
              <h6 className="mb-3">
                <FaKeyboard className="me-2 text-primary" />
                Saisir le code manuellement
              </h6>
              <Form.Control
                type="text"
                placeholder="Coller le token du QR-Code ici..."
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                className="mb-3"
              />
              <div className="d-grid">
                <Button variant="primary"
                  onClick={() => fetchSeanceInfo(tokenInput)}
                  disabled={!tokenInput || loadingInfo}>
                  Vérifier le code
                </Button>
              </div>
            </Card.Body>
          </Card>
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
      <div className="d-flex gap-2 mb-4">
        <Button variant={mode === 'generate' ? 'primary' : 'outline-primary'}
          onClick={() => setMode('generate')}>
          <FaQrcode className="me-1" /> Générer QR
        </Button>
        <Button variant={mode === 'statuts' ? 'primary' : 'outline-primary'}
          onClick={() => setMode('statuts')}>
          <FaCalendarAlt className="me-1" /> Statuts du jour
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
                  <Col md={5}>
                    <Form.Select value={selectedClasse} onChange={e => setSelectedClasse(e.target.value)}>
                      <option value="">-- Classe --</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
                    </Form.Select>
                  </Col>
                  <Col md={5}>
                    <Form.Select value={selectedCreneau} onChange={e => setSelectedCreneau(e.target.value)}>
                      <option value="">-- Créneau --</option>
                      {creneaux.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.jour} {formatTime(c.heure_debut)}-{formatTime(c.heure_fin)} | {c.matiere_libelle}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={2}>
                    <Button variant="primary" className="w-100" onClick={handleGenerate} disabled={loading}>
                      {loading ? <Spinner animation="border" size="sm" /> : 'Générer'}
                    </Button>
                  </Col>
                </Row>

                {qrData && (
                  <div className="qr-container text-center">
                    <QRCodeSVG value={qrData.scan_url} size={250} level="H" includeMargin />
                    <div className="mt-3">
                      <p className="fw-bold mb-1">{qrData.creneau.matiere}</p>
                      <p className="text-muted mb-1">{qrData.creneau.enseignant} | Salle {qrData.creneau.salle}</p>
                      <p className="text-muted mb-1">{qrData.creneau.jour} | {qrData.creneau.heure}</p>
                      <Badge bg="info" className="mt-1">
                        Fenêtre valide : ±15 min autour de l'heure prévue
                      </Badge>
                      <br />
                      <Badge bg="warning" text="dark" className="mt-1">
                        <FaClock className="me-1" />
                        Expire : {new Date(qrData.expire).toLocaleTimeString('fr-FR')}
                      </Badge>
                      <div className="mt-2">
                        <small className="text-muted">{qrData.scan_url}</small>
                      </div>
                    </div>
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
                  <Button variant="outline-secondary" size="sm" onClick={loadStatuts} disabled={loadingStatuts}>
                    ↻ Actualiser
                  </Button>
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
      </Row>
    </div>
  );
};

export default PointagePage;
