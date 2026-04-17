<?php
/**
 * EduSchedule Pro - API Classes
 * GET    /api/classes.php          -> Liste des classes
 * POST   /api/classes.php          -> Créer une classe (admin)
 * PUT    /api/classes.php?id=X     -> Modifier une classe
 * DELETE /api/classes.php?id=X     -> Supprimer une classe
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        $user = requireAuth();
        $sql = "SELECT * FROM classes WHERE 1=1";
        $params = [];
        if (isset($_GET['annee'])) {
            $sql .= " AND annee_academique = ?";
            $params[] = $_GET['annee'];
        }
        $sql .= " ORDER BY niveau, code";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'POST':
        $user = requireRole(['admin']);
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input['code']) || empty($input['libelle']) || empty($input['niveau'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Code, libellé et niveau requis']);
            exit;
        }
        $stmt = $db->prepare("
            INSERT INTO classes (code, libelle, niveau, annee_academique)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['code'], $input['libelle'], $input['niveau'],
            $input['annee_academique'] ?? '2025-2026'
        ]);
        echo json_encode(['success' => true, 'id' => (int)$db->lastInsertId(), 'message' => 'Classe créée']);
        break;

    case 'PUT':
        $user = requireRole(['admin']);
        if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'ID requis']); exit; }
        $input = json_decode(file_get_contents('php://input'), true);
        $fields = []; $params = [];
        foreach (['code', 'libelle', 'niveau', 'annee_academique'] as $f) {
            if (isset($input[$f])) { $fields[] = "$f = ?"; $params[] = $input[$f]; }
        }
        if (empty($fields)) { echo json_encode(['success' => false, 'message' => 'Aucun champ à modifier']); exit; }
        $params[] = $id;
        $stmt = $db->prepare("UPDATE classes SET " . implode(', ', $fields) . " WHERE id = ?");
        $stmt->execute($params);
        echo json_encode(['success' => true, 'message' => 'Classe modifiée']);
        break;

    case 'DELETE':
        $user = requireRole(['admin']);
        if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'ID requis']); exit; }
        $stmt = $db->prepare("DELETE FROM classes WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Classe supprimée']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}
