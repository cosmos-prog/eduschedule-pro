<?php
/**
 * EduSchedule Pro - API Enseignants
 * GET    /api/enseignants.php              -> Liste des enseignants
 * GET    /api/enseignants.php?id=X         -> Détail d'un enseignant
 * POST   /api/enseignants.php              -> Créer un enseignant (admin)
 * PUT    /api/enseignants.php?id=X         -> Modifier un enseignant
 * DELETE /api/enseignants.php?id=X         -> Supprimer un enseignant
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/Enseignant.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;

$model = new Enseignant();

switch ($method) {
    case 'GET':
        $user = requireAuth();
        if ($id) {
            $enseignant = $model->getById($id);
            if (!$enseignant) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Enseignant non trouvé']);
                exit;
            }
            echo json_encode(['success' => true, 'data' => $enseignant]);
        } else {
            $specialite = $_GET['specialite'] ?? null;
            $statut = $_GET['statut'] ?? null;
            echo json_encode(['success' => true, 'data' => $model->getAll($specialite, $statut)]);
        }
        break;

    case 'POST':
        $user = requireRole(['admin']);
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input['nom']) || empty($input['prenom']) || empty($input['email'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nom, prénom et email requis']);
            exit;
        }
        try {
            $newId = $model->create($input);
            echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Enseignant créé']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erreur : ' . $e->getMessage()]);
        }
        break;

    case 'PUT':
        $user = requireRole(['admin']);
        if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'ID requis']); exit; }
        $input = json_decode(file_get_contents('php://input'), true);
        $model->update($id, $input);
        echo json_encode(['success' => true, 'message' => 'Enseignant modifié']);
        break;

    case 'DELETE':
        $user = requireRole(['admin']);
        if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'ID requis']); exit; }
        $model->delete($id);
        echo json_encode(['success' => true, 'message' => 'Enseignant supprimé']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}
