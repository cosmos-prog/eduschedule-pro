<?php
/**
 * EduSchedule Pro - API Emploi du Temps
 * GET    /api/emploi_temps.php                -> Liste des emplois du temps
 * POST   /api/emploi_temps.php                -> Créer un emploi du temps
 * GET    /api/emploi_temps.php?id=X           -> Détail d'un emploi du temps
 * PUT    /api/emploi_temps.php?id=X           -> Modifier un emploi du temps
 * PUT    /api/emploi_temps.php?id=X&action=publier -> Publier
 * DELETE /api/emploi_temps.php?id=X           -> Supprimer
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/Seance.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;
$action = $_GET['action'] ?? null;
$idCreneau = isset($_GET['id_creneau']) ? (int) $_GET['id_creneau'] : null;
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        if ($action === 'creneaux_semaine') {
            getCreneauxSemaine($db);
        } elseif ($action === 'matiere_enseignant_map') {
            getMatiereEnseignantMap($db);
        } elseif ($id) {
            getEmploiTempsDetail($db, $id);
        } else {
            getEmploiTempsList($db);
        }
        break;

    case 'POST':
        if ($action === 'add_creneau') {
            addCreneau($db, $id);
        } elseif ($action === 'dupliquer') {
            if (!$id) { sendError(400, 'ID de l\'emploi du temps requis'); }
            dupliquerEmploiTemps($db, $id);
        } else {
            createEmploiTemps($db);
        }
        break;

    case 'PUT':
        if (!$id) { sendError(400, 'ID requis'); }
        if ($action === 'publier') {
            publierEmploiTemps($db, $id);
        } elseif ($action === 'depublier') {
            depublierEmploiTemps($db, $id);
        } else {
            updateEmploiTemps($db, $id);
        }
        break;

    case 'DELETE':
        if (!$id) { sendError(400, 'ID requis'); }
        if ($idCreneau) {
            deleteCreneau($db, $idCreneau);
        } else {
            deleteEmploiTemps($db, $id);
        }
        break;

    default:
        sendError(405, 'Méthode non autorisée');
}

/**
 * Liste des emplois du temps avec filtres
 */
function getEmploiTempsList(PDO $db): void {
    $user = requireAuth();

    $sql = "
        SELECT et.*, cl.libelle AS classe_libelle, cl.code AS classe_code,
               CONCAT(u.prenom, ' ', u.nom) AS cree_par_nom,
               (SELECT COUNT(*) FROM creneaux WHERE id_emploi_temps = et.id) AS nb_creneaux
        FROM emploi_temps et
        JOIN classes cl ON et.id_classe = cl.id
        LEFT JOIN utilisateurs u ON et.cree_par = u.id
        WHERE 1=1
    ";
    $params = [];

    // Filtres
    if (isset($_GET['id_classe'])) {
        $sql .= " AND et.id_classe = ?";
        $params[] = (int) $_GET['id_classe'];
    }
    if (isset($_GET['semaine'])) {
        $sql .= " AND et.semaine_debut = ?";
        $params[] = $_GET['semaine'];
    }

    // Les étudiants ne voient que les publiés
    if ($user['role'] === 'etudiant') {
        $sql .= " AND et.statut_publication = 'publie'";
    }

    $sql .= " ORDER BY et.semaine_debut DESC, cl.code";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
}

/**
 * Détail d'un emploi du temps avec ses créneaux
 */
function getEmploiTempsDetail(PDO $db, int $id): void {
    $user = requireAuth();

    $stmt = $db->prepare("
        SELECT et.*, cl.libelle AS classe_libelle, cl.code AS classe_code
        FROM emploi_temps et
        JOIN classes cl ON et.id_classe = cl.id
        WHERE et.id = ?
    ");
    $stmt->execute([$id]);
    $emploiTemps = $stmt->fetch();

    if (!$emploiTemps) { sendError(404, 'Emploi du temps non trouvé'); }

    // Récupérer les créneaux
    $seanceModel = new Seance();
    $creneaux = $seanceModel->getByEmploiTemps($id);

    $emploiTemps['creneaux'] = $creneaux;
    echo json_encode(['success' => true, 'data' => $emploiTemps]);
}

/**
 * Créer un emploi du temps
 */
function createEmploiTemps(PDO $db): void {
    $user = requireRole(['admin']);
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['id_classe']) || empty($input['semaine_debut'])) {
        sendError(400, 'Classe et semaine de début requises');
    }

    $db->beginTransaction();
    try {
        $stmt = $db->prepare("
            INSERT INTO emploi_temps (id_classe, semaine_debut, cree_par)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$input['id_classe'], $input['semaine_debut'], $user['id']]);
        $emploiTempsId = (int) $db->lastInsertId();

        // Créer les créneaux si fournis
        if (!empty($input['creneaux'])) {
            $seanceModel = new Seance();
            foreach ($input['creneaux'] as $creneau) {
                $creneau['id_emploi_temps'] = $emploiTempsId;

                // Vérifier les conflits
                $conflits = $seanceModel->detectConflits($creneau);
                if (!empty($conflits)) {
                    $db->rollBack();
                    echo json_encode([
                        'success' => false,
                        'message' => 'Conflits détectés',
                        'conflits' => $conflits
                    ]);
                    return;
                }

                $seanceModel->create($creneau);
            }
        }

        // Logger
        logAction($db, $user['id'], 'creation_emploi_temps', ['id' => $emploiTempsId]);

        $db->commit();
        echo json_encode([
            'success' => true,
            'message' => 'Emploi du temps créé avec succès',
            'id' => $emploiTempsId
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        sendError(500, 'Erreur lors de la création : ' . $e->getMessage());
    }
}

/**
 * Publier un emploi du temps
 */
function publierEmploiTemps(PDO $db, int $id): void {
    $user = requireRole(['admin']);

    $stmt = $db->prepare("UPDATE emploi_temps SET statut_publication = 'publie' WHERE id = ?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) { sendError(404, 'Emploi du temps non trouvé'); }

    logAction($db, $user['id'], 'publication_emploi_temps', ['id' => $id]);

    echo json_encode(['success' => true, 'message' => 'Emploi du temps publié']);
}

/**
 * Modifier un emploi du temps (ajouter/modifier des créneaux)
 */
function updateEmploiTemps(PDO $db, int $id): void {
    $user = requireRole(['admin']);
    $input = json_decode(file_get_contents('php://input'), true);

    if (!empty($input['creneaux'])) {
        $seanceModel = new Seance();
        foreach ($input['creneaux'] as $creneau) {
            $creneau['id_emploi_temps'] = $id;
            if (isset($creneau['id'])) {
                $seanceModel->update($creneau['id'], $creneau);
            } else {
                $conflits = $seanceModel->detectConflits($creneau);
                if (!empty($conflits)) {
                    echo json_encode(['success' => false, 'conflits' => $conflits]);
                    return;
                }
                $seanceModel->create($creneau);
            }
        }
    }

    echo json_encode(['success' => true, 'message' => 'Emploi du temps mis à jour']);
}

/**
 * Supprimer un emploi du temps
 */
function deleteEmploiTemps(PDO $db, int $id): void {
    $user = requireRole(['admin']);
    $stmt = $db->prepare("DELETE FROM emploi_temps WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode(['success' => true, 'message' => 'Emploi du temps supprimé']);
}

/**
 * Ajouter un créneau à un emploi du temps
 */
function addCreneau(PDO $db, int $idEmploiTemps): void {
    $user = requireRole(['admin']);
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['jour']) || empty($input['heure_debut']) || empty($input['heure_fin'])
        || empty($input['id_matiere']) || empty($input['id_enseignant']) || empty($input['id_salle'])) {
        sendError(400, 'Tous les champs sont requis (jour, heure_debut, heure_fin, id_matiere, id_enseignant, id_salle)');
    }

    $input['id_emploi_temps'] = $idEmploiTemps;

    $seanceModel = new Seance();
    $conflits = $seanceModel->detectConflits($input);
    if (!empty($conflits)) {
        echo json_encode([
            'success' => false,
            'message' => 'Conflit détecté avec un créneau existant',
            'conflits' => $conflits
        ]);
        return;
    }

    $id = $seanceModel->create($input);
    logAction($db, $user['id'], 'ajout_creneau', ['id_emploi_temps' => $idEmploiTemps, 'id_creneau' => $id]);
    echo json_encode(['success' => true, 'id' => $id, 'message' => 'Créneau ajouté avec succès']);
}

/**
 * Supprimer un créneau individuel
 */
function deleteCreneau(PDO $db, int $idCreneau): void {
    $user = requireRole(['admin']);
    $seanceModel = new Seance();
    $seanceModel->delete($idCreneau);
    logAction($db, $user['id'], 'suppression_creneau', ['id_creneau' => $idCreneau]);
    echo json_encode(['success' => true, 'message' => 'Créneau supprimé avec succès']);
}

/**
 * Dépublier un emploi du temps (repasser en brouillon)
 */
function depublierEmploiTemps(PDO $db, int $id): void {
    $user = requireRole(['admin']);
    $stmt = $db->prepare("UPDATE emploi_temps SET statut_publication = 'brouillon' WHERE id = ?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) { sendError(404, 'Emploi du temps non trouvé'); }

    logAction($db, $user['id'], 'depublication_emploi_temps', ['id' => $id]);
    echo json_encode(['success' => true, 'message' => 'Emploi du temps repassé en brouillon']);
}

/**
 * Logger une action
 */
function logAction(PDO $db, int $userId, string $action, array $details = []): void {
    $stmt = $db->prepare("
        INSERT INTO logs_activite (id_utilisateur, action, details_json, ip)
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([$userId, $action, json_encode($details), $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);
}

/**
 * Vue créneaux par enseignant ou par salle pour une semaine donnée
 * GET ?action=creneaux_semaine&semaine=YYYY-MM-DD&id_enseignant=X  (ou id_salle=X)
 */
function getCreneauxSemaine(PDO $db): void {
    $user = requireAuth();
    $semaine      = $_GET['semaine']       ?? null;
    $idEnseignant = isset($_GET['id_enseignant']) ? (int) $_GET['id_enseignant'] : null;
    $idSalle      = isset($_GET['id_salle'])      ? (int) $_GET['id_salle']      : null;

    if (!$semaine || (!$idEnseignant && !$idSalle)) {
        sendError(400, 'Paramètres requis : semaine + (id_enseignant ou id_salle)');
    }

    $sql = "
        SELECT c.id, c.jour, c.heure_debut, c.heure_fin,
               m.libelle AS matiere_libelle, m.code AS matiere_code,
               CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
               s.code AS salle_code,
               cl.libelle AS classe_libelle, cl.code AS classe_code,
               et.id AS id_emploi_temps, et.semaine_debut, et.statut_publication
        FROM creneaux c
        JOIN matieres m      ON c.id_matiere    = m.id
        JOIN enseignants e   ON c.id_enseignant = e.id
        JOIN salles s        ON c.id_salle      = s.id
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN classes cl      ON et.id_classe    = cl.id
        WHERE et.semaine_debut = ?
    ";
    // L'admin voit aussi les brouillons ; les autres rôles ne voient que les ET publiés
    if (($user['role'] ?? '') !== 'admin') {
        $sql .= " AND et.statut_publication = 'publie'";
    }
    $params = [$semaine];

    if ($idEnseignant) {
        $sql .= " AND c.id_enseignant = ?";
        $params[] = $idEnseignant;
    } else {
        $sql .= " AND c.id_salle = ?";
        $params[] = $idSalle;
    }
    $sql .= " ORDER BY FIELD(c.jour,'lundi','mardi','mercredi','jeudi','vendredi','samedi'), c.heure_debut";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
}

/**
 * Retourne la correspondance matière → enseignant principal,
 * déduite de l'historique des créneaux (enseignant le plus fréquent par matière).
 * GET ?action=matiere_enseignant_map
 */
function getMatiereEnseignantMap(PDO $db): void {
    requireAuth();
    $sql = "
        SELECT t.id_matiere, t.id_enseignant
        FROM (
            SELECT c.id_matiere, c.id_enseignant, COUNT(*) AS nb,
                   ROW_NUMBER() OVER (PARTITION BY c.id_matiere ORDER BY COUNT(*) DESC, MAX(c.id) DESC) AS rn
            FROM creneaux c
            GROUP BY c.id_matiere, c.id_enseignant
        ) t
        WHERE t.rn = 1
    ";
    try {
        $stmt = $db->query($sql);
        $rows = $stmt->fetchAll();
    } catch (Throwable $e) {
        // Fallback pour MySQL < 8 (pas de window function) : agrégation manuelle
        $stmt = $db->query("SELECT id_matiere, id_enseignant, COUNT(*) AS nb FROM creneaux GROUP BY id_matiere, id_enseignant ORDER BY id_matiere, nb DESC");
        $best = [];
        foreach ($stmt->fetchAll() as $r) {
            $m = (int)$r['id_matiere'];
            if (!isset($best[$m])) {
                $best[$m] = (int)$r['id_enseignant'];
            }
        }
        $rows = [];
        foreach ($best as $m => $e) {
            $rows[] = ['id_matiere' => $m, 'id_enseignant' => $e];
        }
    }
    $map = [];
    foreach ($rows as $r) {
        $map[(int)$r['id_matiere']] = (int)$r['id_enseignant'];
    }
    echo json_encode(['success' => true, 'data' => $map]);
}

/**
 * Dupliquer un emploi du temps vers une semaine cible (défaut : semaine suivante)
 * POST ?id=X&action=dupliquer   body: { semaine_cible?: "YYYY-MM-DD" }
 */
function dupliquerEmploiTemps(PDO $db, int $id): void {
    $user  = requireRole(['admin']);
    $input = json_decode(file_get_contents('php://input'), true) ?: [];

    // Source ET
    $stmt = $db->prepare("SELECT * FROM emploi_temps WHERE id = ?");
    $stmt->execute([$id]);
    $source = $stmt->fetch();
    if (!$source) { sendError(404, 'Emploi du temps source non trouvé'); }

    // Semaine cible
    $targetSemaine = $input['semaine_cible'] ?? null;
    if (!$targetSemaine) {
        $dt = new DateTime($source['semaine_debut']);
        $dt->modify('+7 days');
        $targetSemaine = $dt->format('Y-m-d');
    }

    // Vérifier doublons
    $chk = $db->prepare("SELECT id FROM emploi_temps WHERE id_classe = ? AND semaine_debut = ?");
    $chk->execute([$source['id_classe'], $targetSemaine]);
    if ($chk->fetch()) {
        sendError(409, 'Un emploi du temps existe déjà pour cette classe cette semaine-là');
    }

    // Créneaux source
    $src = $db->prepare("SELECT * FROM creneaux WHERE id_emploi_temps = ?");
    $src->execute([$id]);
    $sourceCreneaux = $src->fetchAll();

    // Transaction
    $db->beginTransaction();
    try {
        // Créer le nouvel ET en brouillon
        $ins = $db->prepare("
            INSERT INTO emploi_temps (id_classe, semaine_debut, cree_par, statut_publication)
            VALUES (?, ?, ?, 'brouillon')
        ");
        $ins->execute([$source['id_classe'], $targetSemaine, $user['id']]);
        $newId = (int) $db->lastInsertId();

        // Requête de détection de conflits dans la semaine cible
        $conflitStmt = $db->prepare("
            SELECT c.id FROM creneaux c
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            WHERE et.semaine_debut = ?
              AND c.jour = ?
              AND c.heure_debut < ?
              AND c.heure_fin > ?
              AND (c.id_enseignant = ? OR c.id_salle = ?)
        ");

        $insCreneauStmt = $db->prepare("
            INSERT INTO creneaux (id_emploi_temps, jour, heure_debut, heure_fin, id_matiere, id_enseignant, id_salle)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        $nbCopies  = 0;
        $nbSkipped = 0;
        $skipped   = [];

        foreach ($sourceCreneaux as $cr) {
            $conflitStmt->execute([
                $targetSemaine,
                $cr['jour'],
                $cr['heure_fin'],
                $cr['heure_debut'],
                $cr['id_enseignant'],
                $cr['id_salle'],
            ]);
            if ($conflitStmt->fetch()) {
                $nbSkipped++;
                $skipped[] = ucfirst($cr['jour']) . ' ' . substr($cr['heure_debut'], 0, 5);
            } else {
                $insCreneauStmt->execute([
                    $newId, $cr['jour'], $cr['heure_debut'], $cr['heure_fin'],
                    $cr['id_matiere'], $cr['id_enseignant'], $cr['id_salle'],
                ]);
                $nbCopies++;
            }
        }

        logAction($db, $user['id'], 'duplication_emploi_temps', [
            'source_id' => $id, 'new_id' => $newId,
            'semaine_cible' => $targetSemaine,
        ]);

        $db->commit();

        echo json_encode([
            'success'        => true,
            'new_id'         => $newId,
            'semaine_cible'  => $targetSemaine,
            'nb_creneaux'    => $nbCopies,
            'nb_skipped'     => $nbSkipped,
            'skipped'        => $skipped,
            'message'        => "{$nbCopies} créneau(x) copié(s)"
                . ($nbSkipped > 0 ? ", {$nbSkipped} ignoré(s) (conflit)" : ''),
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        sendError(500, 'Erreur lors de la duplication : ' . $e->getMessage());
    }
}

function sendError(int $code, string $message): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}
