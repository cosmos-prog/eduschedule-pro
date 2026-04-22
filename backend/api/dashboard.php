<?php
/**
 * EduSchedule Pro - API Dashboard / Statistiques
 * GET /api/dashboard.php?role=admin      -> Stats admin
 * GET /api/dashboard.php?role=enseignant -> Stats enseignant
 * GET /api/dashboard.php?role=delegue    -> Stats délégué
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

try {
    $user    = requireAuth();
    $db      = Database::getInstance();
    $role    = $_GET['role']    ?? $user['role'];
    $periode = $_GET['periode'] ?? 'semaine';

    switch ($role) {
        case 'admin':
        case 'surveillant':
        case 'comptable':
            requireRole(['admin', 'surveillant', 'comptable']);
            echo json_encode(['success' => true, 'data' => getAdminStats($db)]);
            break;

        case 'enseignant':
            echo json_encode(['success' => true, 'data' => getEnseignantStats($db, $user)]);
            break;

        case 'delegue':
            echo json_encode(['success' => true, 'data' => getDelegueStats($db, $user)]);
            break;

        default:
            echo json_encode(['success' => true, 'data' => []]);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'file'    => $e->getFile(),
        'line'    => $e->getLine(),
    ]);
}

/* ══════════════════════════════════════════════════════════════
   ADMIN / SURVEILLANT / COMPTABLE
══════════════════════════════════════════════════════════════ */
function getAdminStats(PDO $db): array {
    $stats = [];

    // Jour actuel en français
    $jourFr = ['monday'=>'lundi','tuesday'=>'mardi','wednesday'=>'mercredi',
               'thursday'=>'jeudi','friday'=>'vendredi','saturday'=>'samedi'];
    $jourActuel = $jourFr[strtolower(date('l'))] ?? 'lundi';

    // ── 1. Séances du jour ──────────────────────────────────────────
    $stmt = $db->prepare("
        SELECT COUNT(*) AS total FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        WHERE c.jour = ? AND et.statut_publication = 'publie'
          AND et.semaine_debut = DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
    ");
    $stmt->execute([$jourActuel]);
    $stats['seances_jour'] = (int) $stmt->fetch()['total'];

    // ── 2. Taux de présence (semaine courante) ──────────────────────
    $stmt2 = $db->query("
        SELECT COUNT(DISTINCT c.id) AS total,
               COUNT(DISTINCT p.id_creneau) AS pointes
        FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        LEFT JOIN pointages p ON p.id_creneau = c.id AND p.statut IN ('valide','retard')
        WHERE et.semaine_debut = DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
          AND et.statut_publication = 'publie'
    ");
    $presence = $stmt2->fetch();
    $stats['taux_presence'] = $presence['total'] > 0
        ? round(($presence['pointes'] / $presence['total']) * 100, 1) : 0;

    // ── 3. Retards cette semaine ────────────────────────────────────
    $stmt3 = $db->query("
        SELECT COUNT(*) AS total FROM pointages p
        JOIN creneaux c ON p.id_creneau = c.id
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        WHERE p.statut = 'retard'
          AND et.semaine_debut = DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
    ");
    $stats['retards_semaine'] = (int) $stmt3->fetch()['total'];

    // ── 4. Séances non pointées (passées aujourd'hui) ───────────────
    $stmt4 = $db->prepare("
        SELECT COUNT(*) AS total FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        LEFT JOIN pointages p ON p.id_creneau = c.id AND p.statut IN ('valide','retard')
        WHERE c.jour = ? AND et.statut_publication = 'publie'
          AND et.semaine_debut = DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
          AND c.heure_fin <= CURTIME()
          AND p.id IS NULL
    ");
    $stmt4->execute([$jourActuel]);
    $stats['seances_non_pointees'] = (int) $stmt4->fetch()['total'];

    // ── 5. Cahiers non signés (en attente) ─────────────────────────
    $stmt5 = $db->query("SELECT COUNT(*) AS total FROM cahiers_texte WHERE statut IN ('brouillon','signe_delegue')");
    $stats['cahiers_non_signes'] = (int) $stmt5->fetch()['total'];

    // ── 6. Heures planifiées vs réalisées par classe (semaine) ──────
    $stmt6 = $db->query("
        SELECT cl.libelle AS classe,
               ROUND(SUM(TIME_TO_SEC(c.heure_fin) - TIME_TO_SEC(c.heure_debut)) / 3600, 1) AS heures_planifiees,
               ROUND(SUM(CASE WHEN p.statut IN ('valide','retard')
                   THEN (TIME_TO_SEC(c.heure_fin) - TIME_TO_SEC(c.heure_debut)) / 3600
                   ELSE 0 END), 1) AS heures_realisees
        FROM classes cl
        JOIN emploi_temps et ON et.id_classe = cl.id
        JOIN creneaux c ON c.id_emploi_temps = et.id
        LEFT JOIN pointages p ON p.id_creneau = c.id
        WHERE et.semaine_debut = DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
        GROUP BY cl.id, cl.libelle
        ORDER BY cl.libelle
    ");
    $stats['heures_par_classe'] = $stmt6->fetchAll();

    // ── 7. Avancement des programmes par matière × classe ──────────
    $stmt7 = $db->query("
        SELECT m.libelle AS matiere, cl.libelle AS classe, cl.code AS classe_code,
               COUNT(c.id) AS total_seances,
               COUNT(CASE WHEN ct.statut = 'cloture' THEN 1 END) AS seances_cloturees,
               ROUND(
                   COUNT(CASE WHEN ct.statut = 'cloture' THEN 1 END) * 100.0
                   / NULLIF(COUNT(c.id), 0), 0
               ) AS avancement_pct
        FROM creneaux c
        JOIN matieres m      ON c.id_matiere = m.id
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN classes cl      ON et.id_classe = cl.id
        LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
        WHERE et.statut_publication = 'publie'
        GROUP BY m.id, cl.id
        ORDER BY cl.libelle, avancement_pct DESC
    ");
    $stats['avancement_programmes'] = $stmt7->fetchAll();

    // ── 8. Alertes temps réel : séances passées aujourd'hui non pointées ──
    $stmt8 = $db->prepare("
        SELECT c.heure_debut, c.heure_fin,
               m.libelle AS matiere_libelle, cl.libelle AS classe_libelle,
               CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom, s.code AS salle_code
        FROM creneaux c
        JOIN matieres m    ON c.id_matiere = m.id
        JOIN enseignants e ON c.id_enseignant = e.id
        JOIN salles s      ON c.id_salle = s.id
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN classes cl    ON et.id_classe = cl.id
        LEFT JOIN pointages p ON p.id_creneau = c.id AND p.statut IN ('valide','retard')
        WHERE c.jour = ? AND et.statut_publication = 'publie'
          AND et.semaine_debut = DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
          AND c.heure_fin <= CURTIME()
          AND p.id IS NULL
        ORDER BY c.heure_debut
    ");
    $stmt8->execute([$jourActuel]);
    $stats['alertes_non_pointees'] = $stmt8->fetchAll();

    // ── 9. Cahiers en attente avec détails ─────────────────────────
    $stmt9 = $db->query("
        SELECT ct.id, ct.statut,
               m.libelle AS matiere_libelle, cl.libelle AS classe_libelle,
               CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
               c.jour, c.heure_debut, et.semaine_debut
        FROM cahiers_texte ct
        JOIN creneaux c      ON ct.id_creneau = c.id
        JOIN matieres m      ON c.id_matiere = m.id
        JOIN enseignants e   ON c.id_enseignant = e.id
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN classes cl      ON et.id_classe = cl.id
        WHERE ct.statut IN ('brouillon', 'signe_delegue')
        ORDER BY et.semaine_debut DESC, c.heure_debut DESC
        LIMIT 10
    ");
    $stats['cahiers_en_attente'] = $stmt9->fetchAll();

    // ── 10. Totaux généraux ────────────────────────────────────────
    $stats['nb_enseignants'] = (int) $db->query("SELECT COUNT(*) FROM enseignants")->fetchColumn();
    $stats['nb_classes']     = (int) $db->query("SELECT COUNT(*) FROM classes")->fetchColumn();
    $stats['nb_matieres']    = (int) $db->query("SELECT COUNT(*) FROM matieres")->fetchColumn();

    return $stats;
}

/* ══════════════════════════════════════════════════════════════
   ENSEIGNANT
══════════════════════════════════════════════════════════════ */
function getEnseignantStats(PDO $db, array $user): array {
    $idEnseignant = $user['id_lien'];
    $stats = [];

    // Séances de la semaine courante avec dates
    $stmt = $db->prepare("
        SELECT c.id, c.jour, c.heure_debut, c.heure_fin,
               m.libelle AS matiere_libelle, s.code AS salle_code,
               cl.libelle AS classe_libelle, et.semaine_debut,
               p.statut AS pointage_statut, p.heure_pointage_reelle,
               ct.statut AS cahier_statut
        FROM creneaux c
        JOIN matieres m      ON c.id_matiere = m.id
        JOIN salles s        ON c.id_salle = s.id
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN classes cl      ON et.id_classe = cl.id
        LEFT JOIN pointages p    ON p.id_creneau = c.id AND p.statut IN ('valide','retard')
        LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
        WHERE c.id_enseignant = ?
          AND et.semaine_debut = DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
        ORDER BY FIELD(c.jour,'lundi','mardi','mercredi','jeudi','vendredi','samedi'), c.heure_debut
    ");
    $stmt->execute([$idEnseignant]);
    $stats['seances_semaine'] = $stmt->fetchAll();

    // Fiches de vacation (6 dernières)
    $stmt2 = $db->prepare("
        SELECT v.id, v.mois, v.annee, v.montant_brut, v.montant_net, v.statut, v.nb_seances
        FROM vacations v
        WHERE v.id_enseignant = ?
        ORDER BY v.annee DESC, v.mois DESC
        LIMIT 6
    ");
    $stmt2->execute([$idEnseignant]);
    $stats['vacations'] = $stmt2->fetchAll();

    // Historique mensuel des 6 derniers mois
    $stmt3 = $db->prepare("
        SELECT MONTH(et.semaine_debut) AS mois, YEAR(et.semaine_debut) AS annee,
               COUNT(c.id) AS nb_seances,
               SUM(CASE WHEN p.statut IN ('valide','retard') THEN 1 ELSE 0 END) AS nb_pointees,
               SUM(CASE WHEN ct.statut = 'cloture' THEN 1 ELSE 0 END) AS nb_cloturees,
               ROUND(SUM(TIME_TO_SEC(c.heure_fin) - TIME_TO_SEC(c.heure_debut)) / 3600, 1) AS heures_planifiees
        FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        LEFT JOIN pointages p    ON p.id_creneau = c.id AND p.statut IN ('valide','retard')
        LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
        WHERE c.id_enseignant = ?
          AND et.semaine_debut <= CURDATE()
        GROUP BY YEAR(et.semaine_debut), MONTH(et.semaine_debut)
        ORDER BY annee DESC, mois DESC
        LIMIT 6
    ");
    $stmt3->execute([$idEnseignant]);
    $stats['historique_mensuel'] = $stmt3->fetchAll();

    return $stats;
}

/* ══════════════════════════════════════════════════════════════
   DÉLÉGUÉ
══════════════════════════════════════════════════════════════ */
function getDelegueStats(PDO $db, array $user): array {
    $idClasse = $user['id_lien'];
    $stats = [];

    // Emploi du temps de la semaine courante
    $stmt = $db->prepare("
        SELECT c.id AS creneau_id, c.jour, c.heure_debut, c.heure_fin,
               m.libelle AS matiere_libelle,
               CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
               s.code AS salle_code, et.semaine_debut,
               p.statut AS pointage_statut,
               ct.id AS cahier_id, ct.statut AS cahier_statut
        FROM creneaux c
        JOIN matieres m      ON c.id_matiere = m.id
        JOIN enseignants e   ON c.id_enseignant = e.id
        JOIN salles s        ON c.id_salle = s.id
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        LEFT JOIN pointages p    ON p.id_creneau = c.id AND p.statut IN ('valide','retard')
        LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
        WHERE et.id_classe = ? AND et.statut_publication = 'publie'
          AND et.semaine_debut = DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
        ORDER BY FIELD(c.jour,'lundi','mardi','mercredi','jeudi','vendredi','samedi'), c.heure_debut
    ");
    $stmt->execute([$idClasse]);
    $stats['emploi_temps'] = $stmt->fetchAll();

    // Cahiers à remplir (séances pointées sans cahier complet)
    $stmt2 = $db->prepare("
        SELECT c.id AS creneau_id, c.jour, c.heure_debut, c.heure_fin,
               m.libelle AS matiere_libelle,
               CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
               et.semaine_debut,
               p.statut AS pointage_statut,
               ct.id AS cahier_id, ct.statut AS cahier_statut
        FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN matieres m      ON c.id_matiere = m.id
        JOIN enseignants e   ON c.id_enseignant = e.id
        JOIN pointages p     ON p.id_creneau = c.id AND p.statut IN ('valide','retard')
        LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
        WHERE et.id_classe = ?
          AND (ct.id IS NULL OR ct.statut = 'brouillon')
        ORDER BY et.semaine_debut DESC,
                 FIELD(c.jour,'lundi','mardi','mercredi','jeudi','vendredi','samedi')
        LIMIT 20
    ");
    $stmt2->execute([$idClasse]);
    $stats['cahiers_a_remplir'] = $stmt2->fetchAll();

    // Historique des cahiers signés/clôturés
    $stmt3 = $db->prepare("
        SELECT ct.id, ct.statut, ct.titre_cours, ct.date_creation,
               m.libelle AS matiere_libelle,
               CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
               c.jour, c.heure_debut, c.heure_fin,
               et.semaine_debut
        FROM cahiers_texte ct
        JOIN creneaux c      ON ct.id_creneau = c.id
        JOIN matieres m      ON c.id_matiere = m.id
        JOIN enseignants e   ON c.id_enseignant = e.id
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        WHERE et.id_classe = ?
          AND ct.statut IN ('signe_delegue','signe_enseignant','cloture')
        ORDER BY et.semaine_debut DESC, c.heure_debut DESC
        LIMIT 20
    ");
    $stmt3->execute([$idClasse]);
    $stats['cahiers_signes'] = $stmt3->fetchAll();

    return $stats;
}
