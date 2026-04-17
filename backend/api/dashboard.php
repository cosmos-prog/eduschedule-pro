<?php
/**
 * EduSchedule Pro - API Dashboard / Statistiques
 * GET /api/dashboard.php?role=admin     -> Stats admin
 * GET /api/dashboard.php?role=enseignant -> Stats enseignant
 * GET /api/dashboard.php?role=delegue   -> Stats délégué
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$user = requireAuth();
$db = Database::getInstance();
$role = $_GET['role'] ?? $user['role'];
$periode = $_GET['periode'] ?? 'semaine'; // semaine, mois, annee

switch ($role) {
    case 'admin':
        requireRole(['admin', 'surveillant', 'comptable']);
        echo json_encode(['success' => true, 'data' => getAdminStats($db, $periode)]);
        break;

    case 'enseignant':
        echo json_encode(['success' => true, 'data' => getEnseignantStats($db, $user)]);
        break;

    case 'delegue':
        echo json_encode(['success' => true, 'data' => getDelegueStats($db, $user)]);
        break;

    case 'surveillant':
        requireRole(['surveillant', 'admin', 'comptable']);
        echo json_encode(['success' => true, 'data' => getSurveillantStats($db)]);
        break;

    default:
        echo json_encode(['success' => true, 'data' => []]);
}

/**
 * Statistiques pour l'administrateur
 */
function getAdminStats(PDO $db, string $periode): array {
    $stats = [];

    // Séances du jour
    $jour = strtolower(date('l'));
    $jourFr = ['monday'=>'lundi','tuesday'=>'mardi','wednesday'=>'mercredi',
               'thursday'=>'jeudi','friday'=>'vendredi','saturday'=>'samedi'];
    $jourActuel = $jourFr[$jour] ?? 'lundi';

    $stmt = $db->prepare("
        SELECT COUNT(*) as total FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        WHERE c.jour = ? AND et.statut_publication = 'publie'
        AND et.semaine_debut = DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
    ");
    $stmt->execute([$jourActuel]);
    $stats['seances_jour'] = (int) $stmt->fetch()['total'];

    // Taux de présence (pointages valides vs total créneaux de la semaine)
    $stmt2 = $db->prepare("
        SELECT
            (SELECT COUNT(*) FROM pointages p JOIN creneaux c ON p.id_creneau = c.id
             JOIN emploi_temps et ON c.id_emploi_temps = et.id
             WHERE p.statut IN ('valide','retard')
             AND et.semaine_debut >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) as pointes,
            (SELECT COUNT(*) FROM creneaux c
             JOIN emploi_temps et ON c.id_emploi_temps = et.id
             WHERE et.semaine_debut >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) as total
    ");
    $stmt2->execute();
    $presence = $stmt2->fetch();
    $stats['taux_presence'] = $presence['total'] > 0
        ? round(($presence['pointes'] / $presence['total']) * 100, 1)
        : 0;

    // Alertes : séances non pointées, cahiers non signés
    $stmt3 = $db->query("
        SELECT COUNT(*) as total FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        LEFT JOIN pointages p ON p.id_creneau = c.id
        WHERE p.id IS NULL AND et.statut_publication = 'publie'
        AND et.semaine_debut >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    ");
    $stats['seances_non_pointees'] = (int) $stmt3->fetch()['total'];

    $stmt4 = $db->query("
        SELECT COUNT(*) as total FROM cahiers_texte
        WHERE statut = 'brouillon' OR statut = 'signe_delegue'
    ");
    $stats['cahiers_non_signes'] = (int) $stmt4->fetch()['total'];

    // Heures planifiées vs réalisées par classe
    $stmt5 = $db->query("
        SELECT cl.libelle AS classe,
               COUNT(c.id) * 2 AS heures_planifiees,
               COUNT(p.id) * 2 AS heures_realisees
        FROM classes cl
        JOIN emploi_temps et ON et.id_classe = cl.id
        JOIN creneaux c ON c.id_emploi_temps = et.id
        LEFT JOIN pointages p ON p.id_creneau = c.id AND p.statut IN ('valide','retard')
        WHERE et.semaine_debut >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY cl.id, cl.libelle
    ");
    $stats['heures_par_classe'] = $stmt5->fetchAll();

    // Retards
    $stmt6 = $db->query("
        SELECT COUNT(*) as total FROM pointages WHERE statut = 'retard'
        AND date_creation >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    ");
    $stats['retards_semaine'] = (int) $stmt6->fetch()['total'];

    // Nombre total d'enseignants, classes, matières
    $stats['nb_enseignants'] = (int) $db->query("SELECT COUNT(*) FROM enseignants")->fetchColumn();
    $stats['nb_classes'] = (int) $db->query("SELECT COUNT(*) FROM classes")->fetchColumn();
    $stats['nb_matieres'] = (int) $db->query("SELECT COUNT(*) FROM matieres")->fetchColumn();

    return $stats;
}

/**
 * Statistiques pour un enseignant
 */
function getEnseignantStats(PDO $db, array $user): array {
    $idEnseignant = $user['id_lien'];
    $stats = [];

    // Séances de la semaine
    $stmt = $db->prepare("
        SELECT c.*, m.libelle AS matiere_libelle, s.code AS salle_code,
               cl.libelle AS classe_libelle, c.jour, c.heure_debut, c.heure_fin,
               p.statut AS pointage_statut, ct.statut AS cahier_statut
        FROM creneaux c
        JOIN matieres m ON c.id_matiere = m.id
        JOIN salles s ON c.id_salle = s.id
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN classes cl ON et.id_classe = cl.id
        LEFT JOIN pointages p ON p.id_creneau = c.id
        LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
        WHERE c.id_enseignant = ?
        AND et.semaine_debut >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
        ORDER BY FIELD(c.jour, 'lundi','mardi','mercredi','jeudi','vendredi','samedi'), c.heure_debut
    ");
    $stmt->execute([$idEnseignant]);
    $stats['seances_semaine'] = $stmt->fetchAll();

    // Fiches de vacation
    $stmt2 = $db->prepare("
        SELECT v.*, CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom
        FROM vacations v JOIN enseignants e ON v.id_enseignant = e.id
        WHERE v.id_enseignant = ?
        ORDER BY v.annee DESC, v.mois DESC LIMIT 6
    ");
    $stmt2->execute([$idEnseignant]);
    $stats['vacations'] = $stmt2->fetchAll();

    // Historique mensuel
    $stmt3 = $db->prepare("
        SELECT MONTH(et.semaine_debut) AS mois, YEAR(et.semaine_debut) AS annee,
               COUNT(c.id) AS nb_seances,
               SUM(CASE WHEN p.statut IN ('valide','retard') THEN 1 ELSE 0 END) AS nb_pointees
        FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        LEFT JOIN pointages p ON p.id_creneau = c.id
        WHERE c.id_enseignant = ?
        GROUP BY YEAR(et.semaine_debut), MONTH(et.semaine_debut)
        ORDER BY annee DESC, mois DESC LIMIT 6
    ");
    $stmt3->execute([$idEnseignant]);
    $stats['historique_mensuel'] = $stmt3->fetchAll();

    return $stats;
}

/**
 * Statistiques pour un délégué
 */
function getDelegueStats(PDO $db, array $user): array {
    $idClasse = $user['id_lien'];
    $stats = [];

    // Emploi du temps de la classe
    $stmt = $db->prepare("
        SELECT c.*, m.libelle AS matiere_libelle,
               CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
               s.code AS salle_code, p.statut AS pointage_statut,
               ct.id AS cahier_id, ct.statut AS cahier_statut
        FROM creneaux c
        JOIN matieres m ON c.id_matiere = m.id
        JOIN enseignants e ON c.id_enseignant = e.id
        JOIN salles s ON c.id_salle = s.id
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        LEFT JOIN pointages p ON p.id_creneau = c.id
        LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
        WHERE et.id_classe = ? AND et.statut_publication = 'publie'
        AND et.semaine_debut >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
        ORDER BY FIELD(c.jour, 'lundi','mardi','mercredi','jeudi','vendredi','samedi'), c.heure_debut
    ");
    $stmt->execute([$idClasse]);
    $stats['emploi_temps'] = $stmt->fetchAll();

    // Cahiers à remplir
    $stmt2 = $db->prepare("
        SELECT c.id AS creneau_id, c.jour, c.heure_debut, c.heure_fin,
               m.libelle AS matiere_libelle, CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
               ct.id AS cahier_id, ct.statut AS cahier_statut
        FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN matieres m ON c.id_matiere = m.id
        JOIN enseignants e ON c.id_enseignant = e.id
        JOIN pointages p ON p.id_creneau = c.id AND p.statut IN ('valide','retard')
        LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
        WHERE et.id_classe = ?
        AND (ct.id IS NULL OR ct.statut = 'brouillon')
        ORDER BY et.semaine_debut DESC
        LIMIT 20
    ");
    $stmt2->execute([$idClasse]);
    $stats['cahiers_a_remplir'] = $stmt2->fetchAll();

    // Historique des cahiers signés
    $stmt3 = $db->prepare("
        SELECT ct.*, m.libelle AS matiere_libelle,
               CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom
        FROM cahiers_texte ct
        JOIN creneaux c ON ct.id_creneau = c.id
        JOIN matieres m ON c.id_matiere = m.id
        JOIN enseignants e ON c.id_enseignant = e.id
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        WHERE et.id_classe = ? AND ct.statut IN ('signe_delegue', 'cloture')
        ORDER BY ct.date_creation DESC LIMIT 20
    ");
    $stmt3->execute([$idClasse]);
    $stats['cahiers_signes'] = $stmt3->fetchAll();

    return $stats;
}

/**
 * Statistiques pour le surveillant
 */
function getSurveillantStats(PDO $db): array {
    $stats = [];

    // Fiches en attente de visa
    $stmt = $db->query("
        SELECT v.*, CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom
        FROM vacations v JOIN enseignants e ON v.id_enseignant = e.id
        WHERE v.statut = 'signee_enseignant'
        ORDER BY v.annee, v.mois
    ");
    $stats['fiches_a_viser'] = $stmt->fetchAll();

    // Alertes de cohérence
    $stmt2 = $db->query("
        SELECT ct.id, ct.titre_cours, ct.statut,
               c.jour, c.heure_debut, c.heure_fin,
               m.libelle AS matiere_libelle,
               CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
               cl.libelle AS classe_libelle,
               p.statut AS pointage_statut
        FROM cahiers_texte ct
        JOIN creneaux c ON ct.id_creneau = c.id
        JOIN matieres m ON c.id_matiere = m.id
        JOIN enseignants e ON c.id_enseignant = e.id
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN classes cl ON et.id_classe = cl.id
        LEFT JOIN pointages p ON p.id_creneau = c.id
        WHERE ct.statut != 'cloture' OR p.statut = 'retard'
        ORDER BY ct.date_creation DESC LIMIT 20
    ");
    $stats['alertes'] = $stmt2->fetchAll();

    return $stats;
}
