/**
 * EduSchedule Pro - Page de Gestion CRUD générique
 * Utilisée pour Classes, Matières, Enseignants, Salles
 */
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Table, Button, Modal, Form, Spinner, Badge, Row, Col } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaSchool, FaBookOpen, FaChalkboardTeacher, FaDoorOpen } from 'react-icons/fa';
import { classesService, matieresService, enseignantsService, sallesService } from '../utils/api';
import { useNotif } from '../context/NotifContext';
import { formatMontant } from '../utils/helpers';

// Configuration par entité
const ENTITY_CONFIG = {
  classes: {
    title: 'Classes',
    icon: <FaSchool className="me-2" />,
    service: classesService,
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'libelle', label: 'Libellé' },
      { key: 'niveau', label: 'Niveau' },
      { key: 'annee_academique', label: 'Année' },
    ],
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'L1-RST' },
      { key: 'libelle', label: 'Libellé', type: 'text', required: true, placeholder: 'Licence 1 RST' },
      { key: 'niveau', label: 'Niveau', type: 'select', required: true, options: ['Licence 1', 'Licence 2', 'Licence 3', 'Master 1', 'Master 2'] },
      { key: 'annee_academique', label: 'Année académique', type: 'text', required: false, placeholder: '2025-2026' },
    ],
  },
  matieres: {
    title: 'Matières',
    icon: <FaBookOpen className="me-2" />,
    service: matieresService,
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'libelle', label: 'Libellé' },
      { key: 'volume_horaire_total', label: 'Vol. horaire (h)' },
      { key: 'coefficient', label: 'Coeff.' },
    ],
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'DEV-WEB' },
      { key: 'libelle', label: 'Libellé', type: 'text', required: true, placeholder: 'Développement Web' },
      { key: 'volume_horaire_total', label: 'Volume horaire total', type: 'number', required: false },
      { key: 'coefficient', label: 'Coefficient', type: 'number', required: false },
    ],
  },
  enseignants: {
    title: 'Enseignants',
    icon: <FaChalkboardTeacher className="me-2" />,
    service: enseignantsService,
    columns: [
      { key: 'matricule', label: 'Matricule' },
      { key: 'nom', label: 'Nom' },
      { key: 'prenom', label: 'Prénom' },
      { key: 'email', label: 'Email' },
      { key: 'specialite', label: 'Spécialité' },
      { key: 'statut', label: 'Statut', render: (v) => <Badge bg={v === 'permanent' ? 'primary' : 'info'}>{v}</Badge> },
      { key: 'taux_horaire', label: 'Taux/h', render: (v) => formatMontant(v) },
    ],
    fields: [
      { key: 'nom', label: 'Nom', type: 'text', required: true },
      { key: 'prenom', label: 'Prénom', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'telephone', label: 'Téléphone', type: 'text', required: false },
      { key: 'specialite', label: 'Spécialité', type: 'text', required: false },
      { key: 'statut', label: 'Statut', type: 'select', required: true, options: ['vacataire', 'permanent'] },
      { key: 'taux_horaire', label: 'Taux horaire (FCFA)', type: 'number', required: true },
    ],
  },
  salles: {
    title: 'Salles',
    icon: <FaDoorOpen className="me-2" />,
    service: sallesService,
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'capacite', label: 'Capacité' },
      { key: 'batiment', label: 'Bâtiment' },
      { key: 'equipements', label: 'Équipements' },
    ],
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'A101' },
      { key: 'capacite', label: 'Capacité', type: 'number', required: true },
      { key: 'batiment', label: 'Bâtiment', type: 'text', required: false },
      { key: 'equipements', label: 'Équipements', type: 'textarea', required: false },
    ],
  },
};

const GestionPage = ({ entity }) => {
  const config = ENTITY_CONFIG[entity];
  const notif = useNotif();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadItems();
  }, [entity]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await config.service.getAll();
      setItems(response.data.data || []);
    } catch {
      notif.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (item = null) => {
    if (item) {
      setEditItem(item);
      setFormData({ ...item });
    } else {
      setEditItem(null);
      setFormData({});
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editItem) {
        await config.service.update(editItem.id, formData);
        notif.success('Modification enregistrée');
      } else {
        await config.service.create(formData);
        notif.success('Élément créé avec succès');
      }
      setShowModal(false);
      loadItems();
    } catch (err) {
      notif.error(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmer la suppression ?')) return;
    try {
      await config.service.delete(id);
      notif.success('Élément supprimé');
      loadItems();
    } catch (err) {
      notif.error(err.response?.data?.message || 'Erreur de suppression');
    }
  };

  if (!config) return <p>Entité inconnue</p>;

  if (loading) {
    return <div className="loading-spinner"><Spinner animation="border" variant="primary" /></div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>{config.icon}{config.title} ({items.length})</h4>
        <Button variant="primary" onClick={() => handleOpen()}>
          <FaPlus className="me-1" /> Ajouter
        </Button>
      </div>

      <Card className="stat-card">
        <Card.Body>
          <Table responsive hover size="sm">
            <thead className="table-light">
              <tr>
                <th>#</th>
                {config.columns.map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  {config.columns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(item[col.key]) : (item[col.key] || '-')}
                    </td>
                  ))}
                  <td>
                    <div className="d-flex gap-1">
                      <Button size="sm" variant="outline-primary" onClick={() => handleOpen(item)}>
                        <FaEdit />
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={() => handleDelete(item.id)}>
                        <FaTrash />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {items.length === 0 && (
            <p className="text-muted text-center py-3">Aucun élément trouvé</p>
          )}
        </Card.Body>
      </Card>

      {/* Modal création / modification */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editItem ? 'Modifier' : 'Ajouter'} - {config.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              {config.fields.map(field => (
                <Col md={field.type === 'textarea' ? 12 : 6} key={field.key} className="mb-3">
                  <Form.Group>
                    <Form.Label>{field.label} {field.required && <span className="text-danger">*</span>}</Form.Label>
                    {field.type === 'select' ? (
                      <Form.Select
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        required={field.required}
                      >
                        <option value="">-- Choisir --</option>
                        {field.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    ) : field.type === 'textarea' ? (
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <Form.Control
                        type={field.type}
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        required={field.required}
                        placeholder={field.placeholder}
                      />
                    )}
                  </Form.Group>
                </Col>
              ))}
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
          <Button variant="primary" onClick={handleSave}>
            {editItem ? 'Enregistrer' : 'Créer'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default GestionPage;
