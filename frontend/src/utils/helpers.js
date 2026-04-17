/**
 * EduSchedule Pro - Fonctions utilitaires
 */

/**
 * Formater une date en français
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString('fr-FR', options);
};

/**
 * Formater une heure (HH:MM)
 */
export const formatTime = (timeStr) => {
  if (!timeStr) return '';
  return timeStr.substring(0, 5);
};

/**
 * Calculer la durée entre deux heures en heures décimales
 */
export const calcDuration = (start, end) => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
};

/**
 * Formater un montant en FCFA
 */
export const formatMontant = (montant) => {
  if (!montant && montant !== 0) return '';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(montant);
};

/**
 * Obtenir le lundi de la semaine pour une date donnée
 */
export const getMondayOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
};

/**
 * Jours de la semaine en français
 */
export const JOURS_SEMAINE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/**
 * Créneaux horaires standards
 */
export const HEURES_COURS = [
  { debut: '08:00', fin: '10:00' },
  { debut: '10:15', fin: '12:15' },
  { debut: '14:00', fin: '16:00' },
  { debut: '16:15', fin: '18:15' },
];

/**
 * Couleurs pour les statuts
 */
export const STATUT_COLORS = {
  valide: 'success',
  retard: 'warning',
  absent: 'danger',
  invalide: 'danger',
  expire: 'secondary',
  brouillon: 'info',
  signe_delegue: 'primary',
  cloture: 'success',
  generee: 'info',
  signee_enseignant: 'primary',
  visee_surveillant: 'warning',
  validee_comptable: 'success',
  publie: 'success',
};

/**
 * Labels des statuts en français
 */
export const STATUT_LABELS = {
  valide: 'Validé',
  retard: 'Retard',
  absent: 'Absent',
  brouillon: 'Brouillon',
  signe_delegue: 'Signé délégué',
  cloture: 'Clôturé',
  generee: 'Générée',
  signee_enseignant: 'Signée enseignant',
  visee_surveillant: 'Visée surveillant',
  validee_comptable: 'Validée comptable',
  publie: 'Publié',
};

/**
 * Noms des mois en français
 */
export const MOIS_FR = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];
