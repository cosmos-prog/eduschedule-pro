/**
 * EduSchedule Pro - Page Fiches de Vacation
 * Génération automatique, chaîne de validation, contrôles de cohérence, reçu imprimable
 */
import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Table, Badge, Button, Spinner, Form, Modal, Alert } from 'react-bootstrap';
import {
  FaMoneyBillWave, FaFileInvoiceDollar, FaCheck, FaEye,
  FaPrint, FaCog, FaSignature, FaUniversity, FaUser,
  FaCalendarAlt, FaListAlt, FaExclamationTriangle, FaCheckCircle
} from 'react-icons/fa';
import { vacationsService, enseignantsService } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNotif } from '../context/NotifContext';
import SignaturePad from '../components/SignaturePad';
import { formatMontant, MOIS_FR, getDateDuJour, formatTime } from '../utils/helpers';

/* ─── Couleurs statuts ─── */
const STATUT_CFG = {
  generee:           { label: 'Générée',           color: 'secondary' },
  signee_enseignant: { label: 'Signée enseignant', color: 'info'      },
  visee_surveillant: { label: 'Visée surveillant', color: 'warning'   },
  validee_comptable: { label: 'Validée comptable', color: 'success'   },
};

/* ════════════════════════════════════════════
   Composant : Section Alertes de cohérence
════════════════════════════════════════════ */
const AlertesCoherence = ({ alertes }) => {
  if (!alertes || alertes.length === 0) return null;
  return (
    <div className="mb-3">
      <Alert variant="warning" className="py-2 mb-0">
        <div className="d-flex align-items-center gap-2 mb-2">
          <FaExclamationTriangle />
          <strong>{alertes.length} alerte(s) de cohérence détectée(s)</strong>
        </div>
        <div style={{ fontSize: '0.82rem' }}>
          {alertes.map((a, i) => (
            <div key={i} className="mb-1 pb-1 border-bottom border-warning">
              <span className="text-capitalize fw-bold">{a.jour}</span>
              {a.semaine && <span className="text-muted ms-1">({getDateDuJour(a.semaine, a.jour)})</span>}
              {' — '}<span>{a.matiere}</span>
              <ul className="mb-0 mt-1">
                {a.messages?.map((m, j) => <li key={j}>{m}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Alert>
    </div>
  );
};

/* ════════════════════════════════════════════
   Composant : Reçu imprimable
════════════════════════════════════════════ */
const RecuVacation = ({ data }) => {
  if (!data) return null;
  const cfg = STATUT_CFG[data.statut] || { label: data.statut, color: 'secondary' };

  const totalHeures = data.lignes?.reduce((s, l) => s + parseFloat(l.duree_heures || 0), 0) || 0;
  const hasAlertes  = data.alertes?.length > 0;

  return (
    <div id="recu-vacation" style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#000', padding: '20px' }}>

      {/* En-tête établissement */}
      <div style={{ borderBottom: '3px solid #1a5276', paddingBottom: '12px', marginBottom: '16px' }}>
        <Row>
          <Col xs={8}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a5276' }}>ISGE-BF</div>
            <div style={{ fontSize: '12px', color: '#555' }}>INSTITUT SUPÉRIEUR DE GÉNIE ÉLECTRIQUE DU BURKINA FASO</div>
            <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>Ouagadougou, Burkina Faso</div>
          </Col>
          <Col xs={4} className="text-end">
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1a5276' }}>FICHE DE VACATION</div>
            <div style={{ fontSize: '11px', color: '#777' }}>N° {String(data.id).padStart(5, '0')}</div>
            <div style={{ marginTop: '4px' }}>
              <Badge bg={cfg.color} style={{ fontSize: '11px' }}>{cfg.label}</Badge>
            </div>
          </Col>
        </Row>
      </div>

      {/* Alertes cohérence */}
      {hasAlertes && (
        <div style={{ backgroundColor: '#fef9e7', border: '1px solid #f39c12', borderRadius: '6px', padding: '10px', marginBottom: '14px' }}>
          <div style={{ color: '#d68910', fontWeight: 'bold', marginBottom: '6px' }}>
            ⚠ {data.alertes.length} alerte(s) de cohérence
          </div>
          {data.alertes.map((a, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#856404', marginBottom: '4px' }}>
              <strong className="text-capitalize">{a.jour}</strong>
              {a.semaine && <span> ({getDateDuJour(a.semaine, a.jour)})</span>} — {a.matiere} :
              {' '}{a.messages?.join(' ; ')}
            </div>
          ))}
        </div>
      )}

      {/* Infos enseignant */}
      <div style={{ backgroundColor: '#eaf2f8', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
        <Row>
          <Col md={6}>
            <div><FaUser className="me-1 text-primary" style={{ fontSize: '11px' }} />
              <strong>Enseignant :</strong> {data.enseignant_nom}
            </div>
            <div><strong>Matricule :</strong> {data.matricule || '—'}</div>
            <div><strong>Spécialité :</strong> {data.specialite || '—'}</div>
          </Col>
          <Col md={6}>
            <div><FaCalendarAlt className="me-1 text-primary" style={{ fontSize: '11px' }} />
              <strong>Période :</strong> {MOIS_FR[data.mois]} {data.annee}
            </div>
            <div><strong>Taux horaire :</strong> {formatMontant(data.taux_horaire)} / heure</div>
            <div><strong>Date génération :</strong> {new Date(data.date_generation || Date.now()).toLocaleDateString('fr-FR')}</div>
          </Col>
        </Row>
      </div>

      {/* Tableau des séances */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1a5276' }}>
          <FaListAlt className="me-1" /> Détail des séances effectuées ({data.nb_seances || data.lignes?.length || 0} séance(s))
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a5276', color: 'white' }}>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>N°</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>Date</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>Classe</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>Matière</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>Prévu</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>Réel</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>Durée (h)</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>Taux (FCFA)</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>Montant (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            {data.lignes?.length > 0 ? data.lignes.map((l, i) => {
              const nonPayable = !!l.non_payable;
              const rowBg = nonPayable ? '#fff5f5' : (l.alerte ? '#fef9e7' : (i % 2 === 0 ? '#fff' : '#f8f9fa'));
              return (
              <tr key={i} style={{ backgroundColor: rowBg }}>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center' }}>
                  {i + 1}
                  {nonPayable
                    ? <span style={{ color: '#dc2626', marginLeft: '4px' }} title="Séance non pointée — non payable">✗</span>
                    : l.alerte ? <span style={{ color: '#e67e22', marginLeft: '4px' }}>⚠</span> : null
                  }
                </td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', whiteSpace: 'nowrap' }}>
                  {l.semaine_debut ? getDateDuJour(l.semaine_debut, l.jour) : <span className="text-capitalize">{l.jour}</span>}
                </td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{l.classe_libelle}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{l.matiere_libelle}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', whiteSpace: 'nowrap', color: '#555' }}>
                  {formatTime(l.heure_debut)}–{formatTime(l.heure_fin)}
                </td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', whiteSpace: 'nowrap' }}>
                  {l.heure_debut_reelle
                    ? <span style={{ color: '#27ae60', fontWeight: 'bold' }}>
                        {l.heure_debut_reelle.substring(0, 5)}–{l.heure_fin_reelle ? l.heure_fin_reelle.substring(0, 5) : '?'}
                      </span>
                    : <span style={{ color: '#dc2626', fontWeight: 'bold' }}>Non pointé</span>
                  }
                </td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center',
                  color: nonPayable ? '#dc2626' : 'inherit', fontWeight: nonPayable ? 'bold' : 'normal' }}>
                  {nonPayable ? '0h' : `${parseFloat(l.duree_heures).toFixed(1)}h`}
                </td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'right' }}>
                  {nonPayable ? <span style={{ color: '#aaa' }}>—</span> : formatMontant(l.taux)}
                </td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold',
                  color: nonPayable ? '#dc2626' : 'inherit' }}>
                  {nonPayable
                    ? <span>0 F CFA <span style={{ fontSize: '0.7rem', fontWeight: 'normal', color: '#dc2626' }}>non payable</span></span>
                    : formatMontant(l.montant)
                  }
                </td>
              </tr>
              );
            }) : (
              <tr>
                <td colSpan={9} style={{ padding: '10px', textAlign: 'center', color: '#777' }}>
                  Aucune séance — vérifiez que les cahiers de texte sont clôturés et les pointages enregistrés
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Récapitulatif financier */}
      <Row className="justify-content-end mb-4">
        <Col md={5}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <tr style={{ backgroundColor: '#d6eaf8' }}>
                <td style={{ padding: '7px 12px', border: '1px solid #aed6f1', fontWeight: 'bold' }}>
                  Total heures effectuées
                </td>
                <td style={{ padding: '7px 12px', border: '1px solid #aed6f1', textAlign: 'right', fontWeight: 'bold' }}>
                  {totalHeures.toFixed(1)}h
                </td>
              </tr>
              <tr style={{ backgroundColor: '#eaf2f8' }}>
                <td style={{ padding: '7px 12px', border: '1px solid #aed6f1' }}>Montant brut</td>
                <td style={{ padding: '7px 12px', border: '1px solid #aed6f1', textAlign: 'right' }}>
                  {formatMontant(data.montant_brut)}
                </td>
              </tr>
              <tr style={{ backgroundColor: '#fdf2f2' }}>
                <td style={{ padding: '7px 12px', border: '1px solid #f1948a', color: '#c0392b' }}>
                  Retenues (10%)
                </td>
                <td style={{ padding: '7px 12px', border: '1px solid #f1948a', textAlign: 'right', color: '#c0392b' }}>
                  − {formatMontant(data.retenues)}
                </td>
              </tr>
              <tr style={{ backgroundColor: '#d5f5e3' }}>
                <td style={{ padding: '9px 12px', border: '2px solid #27ae60', fontWeight: 'bold', fontSize: '14px', color: '#1e8449' }}>
                  MONTANT NET À PAYER
                </td>
                <td style={{ padding: '9px 12px', border: '2px solid #27ae60', textAlign: 'right', fontWeight: 'bold', fontSize: '15px', color: '#1e8449' }}>
                  {formatMontant(data.montant_net)}
                </td>
              </tr>
            </tbody>
          </table>
        </Col>
      </Row>

      {/* Chaîne de validation */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontWeight: 'bold', color: '#1a5276', marginBottom: '10px', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>
          Chaîne de validation
        </div>
        <Row>
          {[
            { role: 'enseignant',  label: 'Enseignant',  statuts: ['signee_enseignant', 'visee_surveillant', 'validee_comptable'] },
            { role: 'surveillant', label: 'Surveillant', statuts: ['visee_surveillant', 'validee_comptable'] },
            { role: 'comptable',   label: 'Comptable',   statuts: ['validee_comptable'] },
          ].map((item, i) => {
            const val    = data.validations?.find(v => v.role_validateur === item.role);
            const valide = item.statuts.includes(data.statut);
            return (
              <Col md={4} key={i}>
                <div style={{
                  border: `2px solid ${valide ? '#27ae60' : '#ddd'}`,
                  borderRadius: '6px', padding: '10px', textAlign: 'center',
                  backgroundColor: valide ? '#d5f5e3' : '#f9f9f9'
                }}>
                  <div style={{ fontWeight: 'bold', color: valide ? '#1e8449' : '#777', marginBottom: '4px' }}>
                    {valide ? '✓' : '○'} {item.label}
                  </div>
                  {val ? (
                    <>
                      <div style={{ fontSize: '11px', color: '#555' }}>{val.validateur_nom}</div>
                      <div style={{ fontSize: '10px', color: '#888' }}>
                        {new Date(val.date_validation).toLocaleDateString('fr-FR')}
                      </div>
                      {val.visa_base64 && (
                        <img src={val.visa_base64} alt="visa" style={{ height: 35, marginTop: 4 }} />
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#aaa', marginTop: '8px', height: '30px' }}>
                      En attente
                    </div>
                  )}
                </div>
              </Col>
            );
          })}
        </Row>
      </div>

      {/* Pied de page */}
      <div style={{ borderTop: '1px solid #ddd', paddingTop: '8px', fontSize: '10px', color: '#888', textAlign: 'center' }}>
        INSTITUT SUPÉRIEUR DE GÉNIE ÉLECTRIQUE DU BURKINA FASO (ISGE-BF) — Document généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════
   Page principale
════════════════════════════════════════════ */
const VacationsPage = () => {
  const { user, hasRole } = useAuth();
  const notif = useNotif();
  const printRef = useRef();

  const [vacations, setVacations]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showGenerer, setShowGenerer]   = useState(false);
  const [showDetail, setShowDetail]     = useState(null);
  const [showVisa, setShowVisa]         = useState(null);
  const [showAlertes, setShowAlertes]   = useState(null); // alertes après génération
  const [enseignants, setEnseignants]   = useState([]);
  const [genForm, setGenForm] = useState({
    id_enseignant: '', mois: new Date().getMonth() + 1, annee: new Date().getFullYear()
  });

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
      const res = await vacationsService.generer(genForm);
      setShowGenerer(false);
      loadVacations();

      // Afficher les alertes de cohérence si présentes
      if (res.data.alertes?.length > 0) {
        setShowAlertes({ alertes: res.data.alertes, message: res.data.message });
        notif.warning(res.data.message);
      } else {
        notif.success(res.data.message || 'Fiche de vacation générée');
      }
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

  // Imprimer le reçu
  const handlePrint = () => {
    const contenu = document.getElementById('recu-vacation').innerHTML;
    const fenetre = window.open('', '_blank', 'width=1000,height=750');
    fenetre.document.write(`
      <html>
        <head>
          <title>Fiche de Vacation — ISGE-BF</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 13px; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            @media print { body { margin: 10px; } }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${contenu}
        </body>
      </html>
    `);
    fenetre.document.close();
  };

  // Visa / signature
  const handleVisa = async (signatureBase64) => {
    if (!showVisa) return;
    try {
      let roleValidateur = 'enseignant';
      if (hasRole(['surveillant'])) roleValidateur = 'surveillant';
      if (hasRole(['comptable']))   roleValidateur = 'comptable';

      const fn = roleValidateur === 'surveillant'
        ? vacationsService.valider
        : roleValidateur === 'comptable'
          ? vacationsService.approuver
          : vacationsService.signer;

      await fn(showVisa, { visa_base64: signatureBase64, commentaire: '' });
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
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4><FaMoneyBillWave className="me-2" />Fiches de Vacation</h4>
        {hasRole(['admin', 'comptable']) && (
          <Button variant="primary" onClick={() => setShowGenerer(true)}>
            <FaCog className="me-1" /> Générer une fiche
          </Button>
        )}
      </div>

      {/* Guide enseignant */}
      {hasRole(['enseignant']) && (
        <Alert variant="info" className="py-2 mb-3 small">
          <FaSignature className="me-2" />
          <strong>Enseignant :</strong> Vérifiez le contenu de votre fiche puis apposez votre signature pour lancer la chaîne de validation.
        </Alert>
      )}

      {/* Liste */}
      <Card className="stat-card">
        <Card.Body>
          {vacations.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FaFileInvoiceDollar size={40} className="mb-3 opacity-25" />
              <p>Aucune fiche de vacation</p>
            </div>
          ) : (
            <Table responsive hover size="sm">
              <thead className="table-light">
                <tr>
                  <th>N°</th>
                  <th>Enseignant</th>
                  <th>Période</th>
                  <th>Séances</th>
                  <th>Montant brut</th>
                  <th>Retenues</th>
                  <th>Net à payer</th>
                  <th>Alertes</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vacations.map(v => {
                  const cfg      = STATUT_CFG[v.statut] || { label: v.statut, color: 'secondary' };
                  const alertes  = v.alertes_json ? JSON.parse(v.alertes_json) : [];
                  return (
                    <tr key={v.id}>
                      <td className="text-muted">{String(v.id).padStart(4, '0')}</td>
                      <td className="fw-bold">{v.enseignant_nom}</td>
                      <td>{MOIS_FR[v.mois]} {v.annee}</td>
                      <td className="text-center">{v.nb_seances || '—'}</td>
                      <td>{formatMontant(v.montant_brut)}</td>
                      <td className="text-danger">− {formatMontant(v.retenues)}</td>
                      <td className="fw-bold text-success">{formatMontant(v.montant_net)}</td>
                      <td className="text-center">
                        {alertes.length > 0 ? (
                          <Badge bg="warning" text="dark" title={`${alertes.length} alerte(s) de cohérence`}>
                            <FaExclamationTriangle className="me-1" />{alertes.length}
                          </Badge>
                        ) : (
                          <FaCheckCircle className="text-success" title="Aucune alerte" />
                        )}
                      </td>
                      <td><Badge bg={cfg.color}>{cfg.label}</Badge></td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button size="sm" variant="outline-secondary" onClick={() => handleDetail(v.id)} title="Voir le reçu">
                            <FaEye />
                          </Button>
                          {v.statut === 'generee' && hasRole(['enseignant']) &&
                            parseInt(v.id_enseignant) === parseInt(user?.id_lien) && (
                            <Button size="sm" variant="outline-info" onClick={() => setShowVisa(v.id)} title="Signer ma fiche">
                              <FaSignature />
                            </Button>
                          )}
                          {v.statut === 'signee_enseignant' && hasRole(['surveillant', 'admin']) && (
                            <Button size="sm" variant="outline-warning" onClick={() => setShowVisa(v.id)} title="Viser">
                              <FaCheck />
                            </Button>
                          )}
                          {v.statut === 'visee_surveillant' && hasRole(['comptable', 'admin']) && (
                            <Button size="sm" variant="outline-success" onClick={() => setShowVisa(v.id)} title="Approuver">
                              <FaCheck />
                            </Button>
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

      {/* ══ Modal Générer ══ */}
      <Modal show={showGenerer} onHide={() => setShowGenerer(false)}>
        <Modal.Header closeButton>
          <Modal.Title><FaFileInvoiceDollar className="me-2" />Générer une fiche de vacation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Enseignant</Form.Label>
            <Form.Select value={genForm.id_enseignant} onChange={e => setGenForm({ ...genForm, id_enseignant: e.target.value })}>
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
                <Form.Select value={genForm.mois} onChange={e => setGenForm({ ...genForm, mois: e.target.value })}>
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
                  type="number" value={genForm.annee}
                  onChange={e => setGenForm({ ...genForm, annee: e.target.value })}
                />
              </Form.Group>
            </Col>
          </Row>
          <Alert variant="info" className="small py-2">
            La fiche inclut toutes les séances du mois. Les contrôles de cohérence (cahier signé, pointage QR, durée) sont vérifiés automatiquement.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGenerer(false)}>Annuler</Button>
          <Button variant="primary" onClick={handleGenerer}>
            <FaCog className="me-1" />Générer
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ══ Modal Alertes de cohérence post-génération ══ */}
      <Modal show={!!showAlertes} onHide={() => setShowAlertes(null)} size="lg">
        <Modal.Header closeButton className="bg-warning bg-opacity-10">
          <Modal.Title><FaExclamationTriangle className="me-2 text-warning" />Alertes de cohérence</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">
            La fiche a été générée. Cependant, les anomalies suivantes ont été détectées. Elles n'empêchent pas la génération, mais le surveillant ne pourra pas viser la fiche tant que les séances concernées ne sont pas clôturées.
          </p>
          <AlertesCoherence alertes={showAlertes?.alertes} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowAlertes(null)}>Compris</Button>
        </Modal.Footer>
      </Modal>

      {/* ══ Modal Reçu Détaillé ══ */}
      <Modal show={!!showDetail} onHide={() => setShowDetail(null)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaUniversity className="me-2 text-primary" />
            Fiche de Vacation — Reçu détaillé
          </Modal.Title>
        </Modal.Header>
        <Modal.Body ref={printRef} className="p-0">
          <RecuVacation data={showDetail} />
        </Modal.Body>
        <Modal.Footer className="no-print">
          <Button variant="outline-secondary" onClick={() => setShowDetail(null)}>Fermer</Button>
          <Button variant="primary" onClick={handlePrint}>
            <FaPrint className="me-1" />Imprimer / Télécharger
          </Button>
          {/* Boutons de validation depuis le modal */}
          {showDetail?.statut === 'generee' && hasRole(['enseignant']) &&
            parseInt(showDetail?.id_enseignant) === parseInt(user?.id_lien) && (
            <Button variant="info" onClick={() => { setShowDetail(null); setShowVisa(showDetail.id); }}>
              <FaSignature className="me-1" />Signer ma fiche
            </Button>
          )}
          {showDetail?.statut === 'signee_enseignant' && hasRole(['surveillant', 'admin']) && (
            <Button variant="warning" onClick={() => { setShowDetail(null); setShowVisa(showDetail.id); }}>
              <FaCheck className="me-1" />Viser
            </Button>
          )}
          {showDetail?.statut === 'visee_surveillant' && hasRole(['comptable', 'admin']) && (
            <Button variant="success" onClick={() => { setShowDetail(null); setShowVisa(showDetail.id); }}>
              <FaCheck className="me-1" />Approuver
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* ══ Modal Visa ══ */}
      <Modal show={!!showVisa} onHide={() => setShowVisa(null)}>
        <Modal.Header closeButton>
          <Modal.Title><FaSignature className="me-2" />Apposer votre visa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <SignaturePad onSave={handleVisa} label="Votre signature / visa" />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default VacationsPage;
