/**
 * EduSchedule Pro - Composant Navbar (barre de navigation supérieure)
 */
import React from 'react';
import { Navbar as BsNavbar, Container, Dropdown, Badge } from 'react-bootstrap';
import { FaBars, FaBell, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useNotif } from '../context/NotifContext';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { notifications } = useNotif();
  const unreadCount = notifications.length;

  return (
    <BsNavbar className="top-navbar" variant="dark" expand="lg" sticky="top">
      <Container fluid>
        {/* Bouton menu mobile */}
        <button
          className="btn btn-link text-white d-md-none me-2"
          onClick={onToggleSidebar}
          aria-label="Menu"
        >
          <FaBars size={20} />
        </button>

        <BsNavbar.Brand className="d-md-none">
          <strong style={{ color: '#e67e22' }}>EduSchedule</strong> Pro
        </BsNavbar.Brand>

        <div className="ms-auto d-flex align-items-center gap-3">
          {/* Notifications */}
          <Dropdown align="end">
            <Dropdown.Toggle variant="link" className="text-white position-relative p-0 border-0">
              <FaBell size={18} />
              {unreadCount > 0 && (
                <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle" style={{ fontSize: '0.65rem' }}>
                  {unreadCount}
                </Badge>
              )}
            </Dropdown.Toggle>
            <Dropdown.Menu style={{ minWidth: '300px' }}>
              <Dropdown.Header>Notifications</Dropdown.Header>
              {notifications.length === 0 ? (
                <Dropdown.ItemText className="text-muted text-center py-3">
                  Aucune notification
                </Dropdown.ItemText>
              ) : (
                notifications.slice(0, 5).map(notif => (
                  <Dropdown.Item key={notif.id} className={`border-start border-3 border-${notif.type}`}>
                    <small>{notif.message}</small>
                  </Dropdown.Item>
                ))
              )}
            </Dropdown.Menu>
          </Dropdown>

          {/* Menu utilisateur */}
          <Dropdown align="end">
            <Dropdown.Toggle variant="link" className="text-white d-flex align-items-center gap-2 text-decoration-none p-0 border-0">
              <div className="bg-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                <FaUser size={14} color="#1a5276" />
              </div>
              <span className="d-none d-lg-inline">
                {user?.prenom} {user?.nom}
              </span>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Header>
                {user?.prenom} {user?.nom}
                <br />
                <small className="text-muted text-capitalize">{user?.role}</small>
              </Dropdown.Header>
              <Dropdown.Divider />
              <Dropdown.Item onClick={logout} className="text-danger">
                <FaSignOutAlt className="me-2" /> Déconnexion
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </Container>
    </BsNavbar>
  );
};

export default Navbar;
