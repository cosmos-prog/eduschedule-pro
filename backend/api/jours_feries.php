<?php
/**
 * EduSchedule Pro - API Jours Fériés
 * GET    /api/jours_feries.php            -> Liste (filtre ?annee=2026)
 * POST   /api/jours_feries.php            -> Créer
 * PUT    /api/jours_feries.php?id=X       -> Modifier
 * DELETE /api/jours_feries.php?id=X       -> Supprimer
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;
$db     = Database::getInstance();

switch ($method) {
    case 'GET':
        requireAuth();
        $annee  = isset($_GET['annee']) ? (int) $_GET['annee'] : null;
        $sql    = "SELECT * FROM jours_feries WHERE 1=1";
        $params = [];
        if ($annee) {
            $sql    .= " AND YEAR(date_ferie) = ?";
            $params[] = $annee;
        }
        $sql .= " ORDER BY date_ferie ASC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'POST':
        $user  = requireRole(['admin']);
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input['date_ferie']) || empty($input['libelle'])) {
            sendError(400, 'date_ferie et libelle sont requis');
        }
        try {
            $stmt = $db->prepare("
                INSERT INTO jours_feries (date_ferie, libelle, recurrent)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([
                $input['date_ferie'],
                trim($input['libelle']),
                (int) ($input['recurrent'] ?? 0),
            ]);
            echo json_encode([
                'success' => true,
                'id'      => (int) $db->lastInsertId(),
                'message' => 'Jour férié ajouté',
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                sendError(409, 'Un jour férié existe déjà à cette date');
            }
            sendError(500, 'Erreur : ' . $e->getMessage());
        }
        break;

    case 'PUT':
        $user  = requireRole(['admin']);
        if (!$id) { sendError(400, 'ID requis'); }
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input['date_ferie']) || empty($input['libelle'])) {
            sendError(400, 'date_ferie et libelle sont requis');
        }
        try {
            $stmt = $db->prepare("
                UPDATE jours_feries
                SET date_ferie = ?, libelle = ?, recurrent = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $input['date_ferie'],
                trim($input['libelle']),
                (int) ($input['recurrent'] ?? 0),
                $id,
            ]);
            if ($stmt->rowCount() === 0) { sendError(404, 'Jour férié non trouvé'); }
            echo json_encode(['success' => true, 'message' => 'Jour férié modifié']);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                sendError(409, 'Un jour férié existe déjà à cette date');
            }
            sendError(500, 'Erreur : ' . $e->getMessage());
        }
        break;

    case 'DELETE':
        requireRole(['admin']);
        if (!$id) { sendError(400, 'ID requis'); }
        $stmt = $db->prepare("DELETE FROM jours_feries WHERE id = ?");
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) { sendError(404, 'Jour férié non trouvé'); }
        echo json_encode(['success' => true, 'message' => 'Jour férié supprimé']);
        break;

    default:
        sendError(405, 'Méthode non autorisée');
}

function sendError(int $code, string $message): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}
