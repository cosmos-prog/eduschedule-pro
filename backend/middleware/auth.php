<?php
/**
 * EduSchedule Pro - Middleware d'authentification JWT
 * Vérifie et décode les tokens JWT pour sécuriser les routes
 */

// Clé secrète JWT (à définir dans .env en production)
define('JWT_SECRET', $_ENV['JWT_SECRET'] ?? 'eduschedule_pro_secret_key_2026');
define('JWT_EXPIRATION', 86400); // 24 heures en secondes

/**
 * Encoder en Base64 URL-safe
 */
function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Décoder du Base64 URL-safe
 */
function base64UrlDecode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}

/**
 * Générer un token JWT
 */
function generateJWT(array $payload): string {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);

    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_EXPIRATION;
    $payloadJson = json_encode($payload);

    $headerEncoded = base64UrlEncode($header);
    $payloadEncoded = base64UrlEncode($payloadJson);

    $signature = hash_hmac('sha256', "$headerEncoded.$payloadEncoded", JWT_SECRET, true);
    $signatureEncoded = base64UrlEncode($signature);

    return "$headerEncoded.$payloadEncoded.$signatureEncoded";
}

/**
 * Vérifier et décoder un token JWT
 * @return array|null Les données du payload ou null si invalide
 */
function verifyJWT(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$headerEncoded, $payloadEncoded, $signatureEncoded] = $parts;

    // Vérifier la signature
    $expectedSignature = base64UrlEncode(
        hash_hmac('sha256', "$headerEncoded.$payloadEncoded", JWT_SECRET, true)
    );

    if (!hash_equals($expectedSignature, $signatureEncoded)) return null;

    // Décoder le payload
    $payload = json_decode(base64UrlDecode($payloadEncoded), true);
    if (!$payload) return null;

    // Vérifier l'expiration
    if (isset($payload['exp']) && $payload['exp'] < time()) return null;

    return $payload;
}

/**
 * Middleware : exiger l'authentification
 * Extrait le token du header Authorization: Bearer {token}
 * @return array Les données de l'utilisateur authentifié
 */
function requireAuth(): array {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token d\'authentification requis']);
        exit;
    }

    $token = $matches[1];
    $payload = verifyJWT($token);

    if (!$payload) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token invalide ou expiré']);
        exit;
    }

    return $payload;
}

/**
 * Middleware : exiger un rôle spécifique
 * @param array $allowedRoles Liste des rôles autorisés
 * @return array Les données de l'utilisateur authentifié
 */
function requireRole(array $allowedRoles): array {
    $user = requireAuth();

    if (!in_array($user['role'], $allowedRoles)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès interdit pour votre rôle']);
        exit;
    }

    return $user;
}
