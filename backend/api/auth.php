<?php
/**
 * EduSchedule Pro - API Authentification
 * POST /api/auth.php?action=login    -> Connexion
 * POST /api/auth.php?action=logout   -> Déconnexion
 * GET  /api/auth.php?action=me       -> Infos utilisateur courant
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        if ($method !== 'POST') { sendError(405, 'Méthode non autorisée'); }
        handleLogin();
        break;

    case 'logout':
        if ($method !== 'POST') { sendError(405, 'Méthode non autorisée'); }
        handleLogout();
        break;

    case 'me':
        if ($method !== 'GET') { sendError(405, 'Méthode non autorisée'); }
        handleMe();
        break;

    default:
        sendError(400, 'Action non reconnue');
}

/**
 * Connexion utilisateur
 */
function handleLogin(): void {
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['email']) || empty($input['password'])) {
        sendError(400, 'Email et mot de passe requis');
    }

    $db = Database::getInstance();
    $stmt = $db->prepare("SELECT * FROM utilisateurs WHERE email = ? AND actif = 1");
    $stmt->execute([$input['email']]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($input['password'], $user['mot_de_passe_hash'])) {
        sendError(401, 'Email ou mot de passe incorrect');
    }

    // Générer le token JWT
    $token = generateJWT([
        'id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'nom' => $user['nom'],
        'prenom' => $user['prenom'],
        'id_lien' => $user['id_lien']
    ]);

    // Logger la connexion
    $stmtLog = $db->prepare("
        INSERT INTO logs_activite (id_utilisateur, action, details_json, ip)
        VALUES (?, 'connexion', ?, ?)
    ");
    $stmtLog->execute([
        $user['id'],
        json_encode(['email' => $user['email']]),
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    echo json_encode([
        'success' => true,
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'nom' => $user['nom'],
            'prenom' => $user['prenom'],
            'id_lien' => $user['id_lien']
        ]
    ]);
}

/**
 * Déconnexion (invalidation côté client)
 */
function handleLogout(): void {
    $user = requireAuth();

    $db = Database::getInstance();
    $stmtLog = $db->prepare("
        INSERT INTO logs_activite (id_utilisateur, action, ip)
        VALUES (?, 'deconnexion', ?)
    ");
    $stmtLog->execute([$user['id'], $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);

    echo json_encode(['success' => true, 'message' => 'Déconnexion réussie']);
}

/**
 * Obtenir les infos de l'utilisateur courant
 */
function handleMe(): void {
    $user = requireAuth();
    echo json_encode(['success' => true, 'user' => $user]);
}

/**
 * Envoyer une erreur JSON
 */
function sendError(int $code, string $message): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}
