<?php
/**
 * EduSchedule Pro - API Salles
 * GET    /api/salles.php          -> Liste des salles
 * POST   /api/salles.php          -> Créer une salle (admin)
 * PUT    /api/salles.php?id=X     -> Modifier
 * DELETE /api/salles.php?id=X     -> Supprimer
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        requireAuth();
        $stmt = $db->query("SELECT * FROM salles ORDER BY batiment, code");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'POST':
        requireRole(['admin']);
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input['code'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Code requis']);
            exit;
        }
        $stmt = $db->prepare("INSERT INTO salles (code, capacite, equipements, batiment) VALUES (?,?,?,?)");
        $stmt->execute([$input['code'], $input['capacite'] ?? 30, $input['equipements'] ?? null, $input['batiment'] ?? null]);
        echo json_encode(['success' => true, 'id' => (int)$db->lastInsertId(), 'message' => 'Salle créée']);
        break;

    case 'PUT':
        requireRole(['admin']);
        if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'ID requis']); exit; }
        $input = json_decode(file_get_contents('php://input'), true);
        $fields = []; $params = [];
        foreach (['code', 'capacite', 'equipements', 'batiment'] as $f) {
            if (isset($input[$f])) { $fields[] = "$f = ?"; $params[] = $input[$f]; }
        }
        $params[] = $id;
        $stmt = $db->prepare("UPDATE salles SET " . implode(', ', $fields) . " WHERE id = ?");
        $stmt->execute($params);
        echo json_encode(['success' => true, 'message' => 'Salle modifiée']);
        break;

    case 'DELETE':
        requireRole(['admin']);
        if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'ID requis']); exit; }
        $stmt = $db->prepare("DELETE FROM salles WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Salle supprimée']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}
