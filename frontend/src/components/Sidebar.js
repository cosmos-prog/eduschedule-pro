/**
 * EduSchedule Pro - Composant Sidebar (menu latéral)
 * Affiche les liens de navigation selon le rôle de l'utilisateur
 */
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FaTachometerAlt, FaCalendarAlt, FaQrcode, FaBook,
  FaMoneyBillWave, FaChalkboardTeacher, FaSchool,
  FaBookOpen, FaDoorOpen, FaClipboardList, FaChartBar, FaSignOutAlt,
  FaUserCircle
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const roleLabels = {
  admin: 'Administrateur',
  enseignant: 'Enseignant',
  delegue: 'Délégué',
  surveillant: 'Surveillant',
  comptable: 'Comptable',
  etudiant: 'Étudiant',
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, hasRole } = useAuth();

  const getNavItems = () => {
    const items = [];

    if (hasRole(['admin'])) {
      items.push({ to: '/dashboard/admin', icon: <FaTachometerAlt />, label: 'Tableau de bord' });
    } else if (hasRole(['enseignant'])) {
      items.push({ to: '/dashboard/enseignant', icon: <FaTachometerAlt />, label: 'Tableau de bord' });
    } else if (hasRole(['delegue'])) {
      items.push({ to: '/dashboard/delegue', icon: <FaTachometerAlt />, label: 'Tableau de bord' });
    } else if (hasRole(['surveillant', 'comptable'])) {
      items.push({ to: '/dashboard/admin', icon: <FaTachometerAlt />, label: 'Tableau de bord' });
    }

    items.push({ to: '/emploi-temps', icon: <FaCalendarAlt />, label: 'Emploi du temps' });

    if (hasRole(['admin'])) {
      items.push(
        { to: '/classes', icon: <FaSchool />, label: 'Classes' },
        { to: '/matieres', icon: <FaBookOpen />, label: 'Matières' },
        { to: '/enseignants', icon: <FaChalkboardTeacher />, label: 'Enseignants' },
        { to: '/salles', icon: <FaDoorOpen />, label: 'Salles' },
      );
    }

    if (hasRole(['admin', 'surveillant', 'enseignant'])) {
      items.push({ to: '/pointage', icon: <FaQrcode />, label: 'Pointage QR' });
    }

    if (hasRole(['admin', 'delegue', 'enseignant', 'surveillant'])) {
      items.push({ to: '/cahiers', icon: <FaBook />, label: 'Cahiers de texte' });
    }

    if (hasRole(['admin', 'enseignant', 'surveillant', 'comptable'])) {
      items.push({ to: '/vacations', icon: <FaMoneyBillWave />, label: 'Fiches de vacation' });
    }

    if (hasRole(['admin'])) {
      items.push(
        { to: '/rapports', icon: <FaChartBar />, label: 'Rapports' },
        { to: '/logs', icon: <FaClipboardList />, label: "Journal d'activité" },
      );
    }

    return items;
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>

      {/* Header avec logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo-wrap">
          <img
            src="/logo.png"
            alt="ISGE-BF"
            className="sidebar-logo"
            onError={e => {
              e.target.style.display = 'none';
              e.target.parentNode.classList.add('no-logo');
            }}
          />
          <span className="sidebar-logo-fallback">ISGE</span>
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-title">EduSchedule</span>
          <span className="sidebar-brand-sub">ISGE-BF — Gestion académique</span>
        </div>
      </div>

      {/* Info utilisateur */}
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          <FaUserCircle size={36} />
        </div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.prenom} {user?.nom}</div>
          <div className="sidebar-user-role">{roleLabels[user?.role] || user?.role}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {getNavItems().map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            onClick={onClose}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span className="sidebar-link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Déconnexion */}
      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={logout}>
          <FaSignOutAlt className="sidebar-link-icon" />
          <span>Déconnexion</span>
        </button>
      </div>

    </div>
  );
};

export default Sidebar;
