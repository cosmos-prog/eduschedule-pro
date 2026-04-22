/**
 * EduSchedule Pro - Page Jours Fériés
 * CRUD : liste, ajout, modification, suppression des jours fériés
 */
import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Spinner, Badge, Row, Col, InputGroup
} from 'react-bootstrap';
import { FaCalendarTimes, FaPlus, FaEdit, FaTrash, FaSearch, FaSync } from 'react-icons/fa';
import { joursferiesService } from '../utils/api';
import { useNotif } from '../context/NotifContext';

const ANNEE_COURANTE = new Date().getFullYear();

const JoursferiesPage = () => {
  const notif = useNotif();
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [annee, setAnnee]         = useState(ANNEE_COURANTE);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({
    date_ferie: '',
    libelle: '',
    recurrent: false,
  });

  useEffect(() => { loadItems(); }, [annee]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await joursferiesService.getAll(annee);
      setItems(res.data.data || []);
    } catch {
      notif.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ date_ferie: '', libelle: '', recurrent: false });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      date_ferie: item.date_ferie,
      libelle: item.libelle,
      recurrent: !!parseInt(item.recurrent),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.date_ferie || !form.libelle.trim()) {
      notif.error('Date et libellé requis');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, recurrent: form.recurrent ? 1 : 0 };
      if (editItem) {
        await joursferiesService.update(editItem.id, payload);
        notif.success('Jour férié modifié');
      } else {
        await joursferiesService.create(payload);
        notif.success('Jour férié ajouté');
      }
      setShowModal(false);
      loadItems();
    } catch (err) {
      notif.error(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, libelle) => {
    if (!window.confirm(`Supprimer « ${libelle} » ?`)) return;
    try {
      await joursferiesService.delete(id);
      notif.success('Jour férié supprimé');
      loadItems();
    } catch (err) {
      notif.error(err.response?.data?.message || 'Erreur de suppression');
    }
  };

  // Filtrage local
  const filtered = items.filter(it =>
    it.libelle.toLowerCase().includes(search.toLowerCase()) ||
    it.date_ferie.includes(search)
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <div>
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h4 className="mb-0"><FaCalendarTimes className="me-2 text-danger" />Jours Fériés</h4>
        <Button variant="primary" size="sm" onClick={openCreate}>
          <FaPlus className="me-1" /> Ajouter
        </Button>
      </div>

      {/* Filtres */}
      <Card className="stat-card mb-3">
        <Card.Body className="py-2">
          <Row className="g-2 align-items-center">
            <Col md={3}>
              <Form.Select size="sm" value={annee} onChange={e => setAnnee(parseInt(e.target.value))}>
                {[ANNEE_COURANTE - 1, ANNEE_COURANTE, ANNEE_COURANTE + 1].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={5}>
              <InputGroup size="sm">
                <InputGroup.Text><FaSearch /></InputGroup.Text>
                <Form.Control
                  placeholder="Rechercher..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Button size="sm" variant="outline-secondary" onClick={loadItems} title="Rafraîchir">
                <FaSync />
              </Button>
            </Col>
            <Col md={2} className="text-end">
              <small className="text-muted">{filtered.length} jour{filtered.length !== 1 ? 's' : ''}</small>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tableau */}
      <Card className="stat-card">
        <Card.Body>
          {loading ? (
            <div className="text-center py-4"><Spinner animation="border" variant="primary" /></div>
          ) : (
            <Table responsive hover size="sm">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th>Date</th>
                  <th>Libellé</th>
                  <th className="text-center">Récurrent</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="text-muted">{idx + 1}</td>
                    <td className="fw-bold" style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {formatDate(item.date_ferie)}
                    </td>
                    <td>{item.libelle}</td>
                    <td className="text-center">
                      {parseInt(item.recurrent) === 1
                        ? <Badge bg="success">Chaque année</Badge>
                        : <Badge bg="secondary">Ponctuel</Badge>}
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button size="sm" variant="outline-primary" onClick={() => openEdit(item)} title="Modifier">
                          <FaEdit />
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(item.id, item.libelle)} title="Supprimer">
                          <FaTrash />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-muted text-center py-4">
              {search ? 'Aucun résultat pour cette recherche' : `Aucun jour férié pour ${annee}`}
            </p>
          )}
        </Card.Body>
      </Card>

      {/* Modal création / modification */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCalendarTimes className="me-2 text-danger" />
            {editItem ? 'Modifier le jour férié' : 'Ajouter un jour férié'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Date <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="date"
                value={form.date_ferie}
                onChange={e => setForm(f => ({ ...f, date_ferie: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Libellé <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                placeholder="Ex : Fête de l'Indépendance"
                value={form.libelle}
                onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))}
              />
            </Form.Group>
            <Form.Check
              type="switch"
              id="recurrent-switch"
              label="Se répète chaque année (jour fixe)"
              checked={form.recurrent}
              onChange={e => setForm(f => ({ ...f, recurrent: e.target.checked }))}
            />
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving
              ? <><Spinner size="sm" animation="border" className="me-1" />Enregistrement...</>
              : editItem ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default JoursferiesPage;
