<?php
/**
 * EduSchedule Pro - API Logs d'activité
 * GET /api/logs.php -> Journal d'activité (admin uniquement)
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$user = requireRole(['admin']);
$db = Database::getInstance();

$sql = "
    SELECT l.*, CONCAT(u.prenom, ' ', u.nom) AS utilisateur_nom, u.role
    FROM logs_activite l
    LEFT JOIN utilisateurs u ON l.id_utilisateur = u.id
    WHERE 1=1
";
$params = [];

if (isset($_GET['action'])) {
    $sql .= " AND l.action LIKE ?";
    $params[] = '%' . $_GET['action'] . '%';
}
if (isset($_GET['date_debut'])) {
    $sql .= " AND l.date_heure >= ?";
    $params[] = $_GET['date_debut'];
}
if (isset($_GET['date_fin'])) {
    $sql .= " AND l.date_heure <= ?";
    $params[] = $_GET['date_fin'] . ' 23:59:59';
}

$sql .= " ORDER BY l.date_heure DESC LIMIT 200";
$stmt = $db->prepare($sql);
$stmt->execute($params);

echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
