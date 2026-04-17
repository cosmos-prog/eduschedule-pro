<?php
/**
 * EduSchedule Pro - API Cahiers de Texte
 * GET    /api/cahiers.php                       -> Liste des cahiers
 * GET    /api/cahiers.php?id=X                  -> Détail d'un cahier
 * POST   /api/cahiers.php                       -> Créer un cahier
 * PUT    /api/cahiers.php?id=X                  -> Modifier un cahier (brouillon)
 * POST   /api/cahiers.php?id=X&action=signer    -> Apposer une signature
 * POST   /api/cahiers.php?id=X&action=cloturer  -> Clôturer la séance
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/CahierTexte.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;
$action = $_GET['action'] ?? null;

$model = new CahierTexte();

switch ($method) {
    case 'GET':
        $user = requireAuth();
        if ($id) {
            $cahier = $model->getById($id);
            if (!$cahier) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Cahier de texte non trouvé']);
                exit;
            }
            echo json_encode(['success' => true, 'data' => $cahier]);
        } else {
            $idCreneau = isset($_GET['id_creneau']) ? (int) $_GET['id_creneau'] : null;
            $idClasse = isset($_GET['id_classe']) ? (int) $_GET['id_classe'] : null;
            $mois = isset($_GET['mois']) ? (int) $_GET['mois'] : null;
            echo json_encode(['success' => true, 'data' => $model->getAll($idCreneau, $idClasse, $mois)]);
        }
        break;

    case 'POST':
        if ($id && $action === 'signer') {
            handleSigner($model, $id);
        } elseif ($id && $action === 'cloturer') {
            handleCloturer($model, $id);
        } else {
            handleCreate($model);
        }
        break;

    case 'PUT':
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID requis']);
            exit;
        }
        handleUpdate($model, $id);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}

function handleCreate(CahierTexte $model): void {
    $user = requireRole(['delegue', 'admin']);
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['id_creneau'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id_creneau requis']);
        exit;
    }

    $input['id_delegue'] = $user['id'];

    try {
        $newId = $model->create($input);
        echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Cahier de texte créé']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur : ' . $e->getMessage()]);
    }
}

function handleUpdate(CahierTexte $model, int $id): void {
    $user = requireRole(['delegue', 'admin']);
    $input = json_decode(file_get_contents('php://input'), true);

    if ($model->update($id, $input)) {
        echo json_encode(['success' => true, 'message' => 'Cahier de texte modifié']);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Modification impossible (cahier verrouillé ou non trouvé)']);
    }
}

function handleSigner(CahierTexte $model, int $id): void {
    $user = requireRole(['delegue', 'enseignant']);
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['signature_base64'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Signature requise']);
        exit;
    }

    $type = ($user['role'] === 'delegue') ? 'delegue' : 'enseignant';

    try {
        $model->signer($id, [
            'type' => $input['type'] ?? $type,
            'id_utilisateur' => $user['id'],
            'signature_base64' => $input['signature_base64']
        ]);
        echo json_encode(['success' => true, 'message' => 'Signature enregistrée']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur : ' . $e->getMessage()]);
    }
}

function handleCloturer(CahierTexte $model, int $id): void {
    $user = requireRole(['enseignant', 'admin', 'surveillant']);
    $input = json_decode(file_get_contents('php://input'), true);

    try {
        $model->cloturer($id, [
            'heure_fin' => $input['heure_fin'] ?? date('H:i:s'),
            'id_utilisateur' => $user['id'],
            'signature_base64' => $input['signature_base64'] ?? null
        ]);
        echo json_encode(['success' => true, 'message' => 'Séance clôturée avec succès']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur : ' . $e->getMessage()]);
    }
}
