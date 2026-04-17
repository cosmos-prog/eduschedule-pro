<?php
/**
 * EduSchedule Pro - API Matières
 * GET    /api/matieres.php          -> Liste des matières
 * POST   /api/matieres.php          -> Créer une matière (admin)
 * PUT    /api/matieres.php?id=X     -> Modifier
 * DELETE /api/matieres.php?id=X     -> Supprimer
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
        $stmt = $db->query("SELECT * FROM matieres ORDER BY libelle");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'POST':
        requireRole(['admin']);
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input['code']) || empty($input['libelle'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Code et libellé requis']);
            exit;
        }
        $stmt = $db->prepare("INSERT INTO matieres (code, libelle, volume_horaire_total, coefficient) VALUES (?,?,?,?)");
        $stmt->execute([$input['code'], $input['libelle'], $input['volume_horaire_total'] ?? 0, $input['coefficient'] ?? 1.0]);
        echo json_encode(['success' => true, 'id' => (int) $db->lastInsertId(), 'message' => 'Matière créée']);
        break;

    case 'PUT':
        requireRole(['admin']);
        if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'ID requis']); exit; }
        $input = json_decode(file_get_contents('php://input'), true);
        $fields = []; $params = [];
        foreach (['code', 'libelle', 'volume_horaire_total', 'coefficient'] as $f) {
            if (isset($input[$f])) { $fields[] = "$f = ?"; $params[] = $input[$f]; }
        }
        $params[] = $id;
        $stmt = $db->prepare("UPDATE matieres SET " . implode(', ', $fields) . " WHERE id = ?");
        $stmt->execute($params);
        echo json_encode(['success' => true, 'message' => 'Matière modifiée']);
        break;

    case 'DELETE':
        requireRole(['admin']);
        if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'ID requis']); exit; }
        $stmt = $db->prepare("DELETE FROM matieres WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Matière supprimée']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}
