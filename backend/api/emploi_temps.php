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
        if ($id) {
            getEmploiTempsDetail($db, $id);
        } else {
            getEmploiTempsList($db);
        }
        break;

    case 'POST':
        if ($action === 'add_creneau') {
            addCreneau($db, $id);
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

function sendError(int $code, string $message): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}
