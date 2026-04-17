/**
 * EduSchedule Pro - Page Fiches de Vacation
 * Génération automatique, chaîne de validation, reçu imprimable
 */
import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Table, Badge, Button, Spinner, Form, Modal, Alert } from 'react-bootstrap';
import {
  FaMoneyBillWave, FaFileInvoiceDollar, FaCheck, FaEye,
  FaPrint, FaCog, FaSignature, FaUniversity, FaUser,
  FaCalendarAlt, FaListAlt
} from 'react-icons/fa';
import { vacationsService, enseignantsService } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNotif } from '../context/NotifContext';
import SignaturePad from '../components/SignaturePad';
import { formatMontant, MOIS_FR } from '../utils/helpers';

/* ─── Couleurs statuts ─── */
const STATUT_CFG = {
  generee:           { label: 'Générée',           color: 'secondary' },
  signee_enseignant: { label: 'Signée enseignant', color: 'info'      },
  visee_surveillant: { label: 'Visée surveillant', color: 'warning'   },
  approuvee:         { label: 'Approuvée',          color: 'success'   },
};

/* ════════════════════════════════════════════
   Composant : Reçu imprimable
════════════════════════════════════════════ */
const RecuVacation = ({ data }) => {
  if (!data) return null;
  const cfg = STATUT_CFG[data.statut] || { label: data.statut, color: 'secondary' };

  return (
    <div id="recu-vacation" style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#000', padding: '20px' }}>

      {/* En-tête établissement */}
      <div style={{ borderBottom: '3px solid #1a5276', paddingBottom: '12px', marginBottom: '16px' }}>
        <Row>
          <Col xs={8}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a5276' }}>
              ISGE-BF
            </div>
            <div style={{ fontSize: '12px', color: '#555' }}>
              Institut Supérieur de Gestion des Entreprises du Burkina Faso
            </div>
            <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>
              Ouagadougou, Burkina Faso
            </div>
          </Col>
          <Col xs={4} className="text-end">
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1a5276' }}>
              FICHE DE VACATION
            </div>
            <div style={{ fontSize: '11px', color: '#777' }}>
              N° {String(data.id).padStart(5, '0')}
            </div>
            <div style={{ marginTop: '4px' }}>
              <Badge bg={cfg.color} style={{ fontSize: '11px' }}>{cfg.label}</Badge>
            </div>
          </Col>
        </Row>
      </div>

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
          <FaListAlt className="me-1" /> Détail des séances effectuées
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a5276', color: 'white' }}>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>N°</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>Date</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>Classe</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>Matière</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>Horaire</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>Durée (h)</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>Taux (F CFA)</th>
              <th style={{ padding: '6px 8px', border: '1px solid #ddd' }}>Montant (F CFA)</th>
            </tr>
          </thead>
          <tbody>
            {data.lignes?.length > 0 ? data.lignes.map((l, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd' }} className="text-capitalize">{l.jour}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{l.classe_libelle}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{l.matiere_libelle}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{l.heure_debut} – {l.heure_fin}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{l.duree_heures}h</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'right' }}>{formatMontant(l.taux)}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>{formatMontant(l.montant)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} style={{ padding: '10px', textAlign: 'center', color: '#777' }}>Aucune séance</td>
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
                  {data.lignes?.reduce((s, l) => s + parseFloat(l.duree_heures || 0), 0).toFixed(1)}h
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
                  - {formatMontant(data.retenues)}
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
            { role: 'Enseignant', statuts: ['signee_enseignant', 'visee_surveillant', 'approuvee'] },
            { role: 'Surveillant', statuts: ['visee_surveillant', 'approuvee'] },
            { role: 'Comptable', statuts: ['approuvee'] },
          ].map((item, i) => {
            const val = data.validations?.find(v => v.role_validateur === item.role.toLowerCase());
            const valide = item.statuts.includes(data.statut);
            return (
              <Col md={4} key={i}>
                <div style={{
                  border: `2px solid ${valide ? '#27ae60' : '#ddd'}`,
                  borderRadius: '6px', padding: '10px', textAlign: 'center',
                  backgroundColor: valide ? '#d5f5e3' : '#f9f9f9'
                }}>
                  <div style={{ fontWeight: 'bold', color: valide ? '#1e8449' : '#777', marginBottom: '4px' }}>
                    {valide ? '✓' : '○'} {item.role}
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
        ISGE-BF — EduSchedule Pro — Document généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
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

  const [vacations, setVacations]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showGenerer, setShowGenerer] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showVisa, setShowVisa]     = useState(null);
  const [enseignants, setEnseignants] = useState([]);
  const [genForm, setGenForm]       = useState({
    id_enseignant: '', mois: '', annee: new Date().getFullYear()
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

  // Imprimer le reçu
  const handlePrint = () => {
    const contenu = document.getElementById('recu-vacation').innerHTML;
    const fenetre = window.open('', '_blank', 'width=900,height=700');
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
      if (hasRole(['comptable'])) roleValidateur = 'comptable';

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
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vacations.map(v => {
                  const cfg = STATUT_CFG[v.statut] || { label: v.statut, color: 'secondary' };
                  return (
                    <tr key={v.id}>
                      <td className="text-muted">{String(v.id).padStart(4, '0')}</td>
                      <td className="fw-bold">{v.enseignant_nom}</td>
                      <td>{MOIS_FR[v.mois]} {v.annee}</td>
                      <td className="text-center">{v.nb_seances || '—'}</td>
                      <td>{formatMontant(v.montant_brut)}</td>
                      <td className="text-danger">- {formatMontant(v.retenues)}</td>
                      <td className="fw-bold text-success">{formatMontant(v.montant_net)}</td>
                      <td><Badge bg={cfg.color}>{cfg.label}</Badge></td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button size="sm" variant="outline-secondary" onClick={() => handleDetail(v.id)} title="Voir le reçu">
                            <FaEye />
                          </Button>
                          {v.statut === 'generee' && hasRole(['enseignant']) && (
                            <Button size="sm" variant="outline-info" onClick={() => setShowVisa(v.id)} title="Signer">
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
            La fiche sera générée automatiquement à partir des séances pointées du mois sélectionné.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGenerer(false)}>Annuler</Button>
          <Button variant="primary" onClick={handleGenerer}>
            <FaCog className="me-1" />Générer
          </Button>
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
          {/* Bouton validation depuis le modal */}
          {showDetail?.statut === 'generee' && hasRole(['enseignant']) && (
            <Button variant="info" onClick={() => { setShowDetail(null); setShowVisa(showDetail.id); }}>
              <FaSignature className="me-1" />Signer
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
