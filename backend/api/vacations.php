<?php
/**
 * EduSchedule Pro - API Vacations (Fiches de paiement)
 * GET  /api/vacations.php                          -> Liste des fiches
 * GET  /api/vacations.php?id=X                     -> Détail d'une fiche
 * POST /api/vacations.php?action=generer           -> Générer une fiche
 * POST /api/vacations.php?id=X&action=valider      -> Valider (surveillant)
 * POST /api/vacations.php?id=X&action=approuver    -> Approuver (comptable)
 * GET  /api/vacations.php?id=X&action=pdf          -> Télécharger PDF
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/Vacation.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;
$action = $_GET['action'] ?? null;

$model = new Vacation();

switch ($method) {
    case 'GET':
        $user = requireAuth();
        if ($id && $action === 'pdf') {
            handleExportPDF($model, $id);
        } elseif ($id) {
            $vacation = $model->getById($id);
            if (!$vacation) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Fiche de vacation non trouvée']);
                exit;
            }
            echo json_encode(['success' => true, 'data' => $vacation]);
        } else {
            $idEnseignant = isset($_GET['id_enseignant']) ? (int) $_GET['id_enseignant'] : null;
            $mois = isset($_GET['mois']) ? (int) $_GET['mois'] : null;
            $annee = isset($_GET['annee']) ? (int) $_GET['annee'] : null;

            // Si c'est un enseignant, il ne voit que ses fiches
            if ($user['role'] === 'enseignant') {
                $idEnseignant = $user['id_lien'];
            }

            echo json_encode(['success' => true, 'data' => $model->getAll($idEnseignant, $mois, $annee)]);
        }
        break;

    case 'POST':
        if ($action === 'generer') {
            handleGenerer($model);
        } elseif ($id && $action === 'valider') {
            handleValider($model, $id, 'surveillant');
        } elseif ($id && $action === 'approuver') {
            handleValider($model, $id, 'comptable');
        } elseif ($id && $action === 'signer') {
            handleValider($model, $id, 'enseignant');
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Action requise']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}

function handleGenerer(Vacation $model): void {
    $user = requireRole(['admin', 'comptable']);
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['id_enseignant']) || empty($input['mois']) || empty($input['annee'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id_enseignant, mois et annee requis']);
        exit;
    }

    try {
        $result = $model->generer(
            (int) $input['id_enseignant'],
            (int) $input['mois'],
            (int) $input['annee']
        );

        $nbAlertes = count($result['alertes']);
        $message = $nbAlertes > 0
            ? "Fiche générée avec {$nbAlertes} alerte(s) de cohérence à vérifier"
            : 'Fiche de vacation générée avec succès';

        echo json_encode([
            'success'    => true,
            'id'         => $result['id'],
            'nb_seances' => $result['nb_seances'],
            'alertes'    => $result['alertes'],
            'message'    => $message,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur : ' . $e->getMessage()]);
    }
}

function handleValider(Vacation $model, int $id, string $roleValidateur): void {
    $allowedRoles = [
        'enseignant' => ['enseignant'],
        'surveillant' => ['surveillant', 'admin'],
        'comptable' => ['comptable', 'admin']
    ];

    $user = requireRole($allowedRoles[$roleValidateur]);
    $input = json_decode(file_get_contents('php://input'), true);

    // ── Vérification : l'enseignant ne peut signer QUE sa propre fiche ──
    if ($roleValidateur === 'enseignant') {
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT id_enseignant FROM vacations WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Fiche de vacation introuvable']);
            exit;
        }

        if ((int)$row['id_enseignant'] !== (int)$user['id_lien']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Accès refusé : cette fiche ne vous appartient pas']);
            exit;
        }
    }

    try {
        $model->valider($id, [
            'id_validateur' => $user['id'],
            'role_validateur' => $roleValidateur,
            'visa_base64' => $input['visa_base64'] ?? null,
            'commentaire' => $input['commentaire'] ?? null
        ]);
        echo json_encode(['success' => true, 'message' => 'Validation enregistrée']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur : ' . $e->getMessage()]);
    }
}

function handleExportPDF(Vacation $model, int $id): void {
    $user = requireAuth();
    $vacation = $model->getById($id);

    if (!$vacation) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Fiche non trouvée']);
        exit;
    }

    // Retourner les données formatées pour génération PDF côté client
    echo json_encode([
        'success' => true,
        'data' => $vacation,
        'message' => 'Données prêtes pour export PDF'
    ]);
}
