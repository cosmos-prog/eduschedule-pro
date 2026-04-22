/**
 * EduSchedule Pro - Service API (Axios)
 * Configuration centralisée des appels HTTP vers le backend PHP
 */
import axios from 'axios';

// URL de base du backend PHP
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eduschedule-pro/backend';

// Instance Axios configurée
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Intercepteur : ajouter le token JWT à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('eduschedule_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur : gérer les erreurs de réponse
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const isLogout = error.config?.url?.includes('action=logout');
      // Token expiré ou invalide -> déconnexion (sauf si c'est déjà la requête de logout)
      if (error.response.status === 401 && !isLogout) {
        sessionStorage.removeItem('eduschedule_token');
        sessionStorage.removeItem('eduschedule_user');
        window.location.href = '/login';
        return Promise.resolve(); // ne pas propager l'erreur
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================
// SERVICES API
// ============================================================

// --- Authentification ---
export const authService = {
  login: (email, password) => api.post('/api/auth.php?action=login', { email, password }),
  logout: () => api.post('/api/auth.php?action=logout'),
  me: () => api.get('/api/auth.php?action=me'),
};

// --- Classes ---
export const classesService = {
  getAll: (annee) => api.get('/api/classes.php', { params: { annee } }),
  create: (data) => api.post('/api/classes.php', data),
  update: (id, data) => api.put(`/api/classes.php?id=${id}`, data),
  delete: (id) => api.delete(`/api/classes.php?id=${id}`),
};

// --- Matières ---
export const matieresService = {
  getAll: () => api.get('/api/matieres.php'),
  create: (data) => api.post('/api/matieres.php', data),
  update: (id, data) => api.put(`/api/matieres.php?id=${id}`, data),
  delete: (id) => api.delete(`/api/matieres.php?id=${id}`),
};

// --- Enseignants ---
export const enseignantsService = {
  getAll: (params) => api.get('/api/enseignants.php', { params }),
  getById: (id) => api.get(`/api/enseignants.php?id=${id}`),
  create: (data) => api.post('/api/enseignants.php', data),
  update: (id, data) => api.put(`/api/enseignants.php?id=${id}`, data),
  delete: (id) => api.delete(`/api/enseignants.php?id=${id}`),
};

// --- Salles ---
export const sallesService = {
  getAll: () => api.get('/api/salles.php'),
  create: (data) => api.post('/api/salles.php', data),
  update: (id, data) => api.put(`/api/salles.php?id=${id}`, data),
  delete: (id) => api.delete(`/api/salles.php?id=${id}`),
};

// --- Emploi du temps ---
export const emploiTempsService = {
  getAll: (params) => api.get('/api/emploi_temps.php', { params }),
  getById: (id) => api.get(`/api/emploi_temps.php?id=${id}`),
  create: (data) => api.post('/api/emploi_temps.php', data),
  update: (id, data) => api.put(`/api/emploi_temps.php?id=${id}`, data),
  publier: (id) => api.put(`/api/emploi_temps.php?id=${id}&action=publier`),
  depublier: (id) => api.put(`/api/emploi_temps.php?id=${id}&action=depublier`),
  delete: (id) => api.delete(`/api/emploi_temps.php?id=${id}`),
  // Gestion des créneaux individuels
  addCreneau: (idEmploiTemps, data) =>
    api.post(`/api/emploi_temps.php?id=${idEmploiTemps}&action=add_creneau`, data),
  deleteCreneau: (idCreneau) =>
    api.delete(`/api/emploi_temps.php?id_creneau=${idCreneau}`),
  dupliquer: (id, data) =>
    api.post(`/api/emploi_temps.php?id=${id}&action=dupliquer`, data || {}),
  getCreneauxSemaine: (params) =>
    api.get('/api/emploi_temps.php?action=creneaux_semaine', { params }),
  getMatiereEnseignantMap: () =>
    api.get('/api/emploi_temps.php?action=matiere_enseignant_map'),
};

// --- Pointages QR-Code ---
export const pointagesService = {
  getQR: (idCreneau) => api.get(`/api/pointages.php?id_creneau=${idCreneau}`),
  getInfo: (token) => api.get(`/api/pointages.php?action=info&token=${encodeURIComponent(token)}`),
  getStatutsAujourdhui: () => api.get('/api/pointages.php?action=statuts'),
  getAlertes: () => api.get('/api/pointages.php?action=alertes'),
  scan: (tokenQr) => api.post('/api/pointages.php', { token_qr: tokenQr }),
};

// --- Cahiers de texte ---
export const cahiersService = {
  getAll: (params) => api.get('/api/cahiers.php', { params }),
  getById: (id) => api.get(`/api/cahiers.php?id=${id}`),
  create: (data) => api.post('/api/cahiers.php', data),
  update: (id, data) => api.put(`/api/cahiers.php?id=${id}`, data),
  signer: (id, data) => api.post(`/api/cahiers.php?id=${id}&action=signer`, data),
  cloturer: (id, data) => api.post(`/api/cahiers.php?id=${id}&action=cloturer`, data),
};

// --- Vacations ---
export const vacationsService = {
  getAll: (params) => api.get('/api/vacations.php', { params }),
  getById: (id) => api.get(`/api/vacations.php?id=${id}`),
  generer: (data) => api.post('/api/vacations.php?action=generer', data),
  signer: (id, data) => api.post(`/api/vacations.php?id=${id}&action=signer`, data),
  valider: (id, data) => api.post(`/api/vacations.php?id=${id}&action=valider`, data),
  approuver: (id, data) => api.post(`/api/vacations.php?id=${id}&action=approuver`, data),
  getPDF: (id) => api.get(`/api/vacations.php?id=${id}&action=pdf`),
};

// --- Dashboard ---
export const dashboardService = {
  getStats: (role, periode) => api.get('/api/dashboard.php', { params: { role, periode } }),
};

// --- Logs ---
export const logsService = {
  getAll: (params) => api.get('/api/logs.php', { params }),
};

// --- Jours Fériés ---
export const joursferiesService = {
  getAll: (annee) => api.get('/api/jours_feries.php', { params: { annee } }),
  create: (data) => api.post('/api/jours_feries.php', data),
  update: (id, data) => api.put(`/api/jours_feries.php?id=${id}`, data),
  delete: (id) => api.delete(`/api/jours_feries.php?id=${id}`),
};

export default api;
