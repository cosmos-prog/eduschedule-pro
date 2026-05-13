<?php
/**
 * EduSchedule Pro - Configuration de la base de données
 * Connexion PDO à MySQL
 */

// Charger les variables d'environnement depuis .env si disponible
$envFile = __DIR__ . '/../../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

// Fuseau horaire PHP — doit correspondre à l'heure locale (Ouagadougou = UTC+0)
date_default_timezone_set('Africa/Ouagadougou');

// Configuration par défaut
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'eduschedule_pro');
define('DB_USER', $_ENV['DB_USER'] ?? 'root');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');
define('DB_CHARSET', 'utf8mb4');

/**
 * Classe Database - Singleton PDO
 */
class Database {
    private static ?PDO $instance = null;

    /**
     * Obtenir l'instance PDO (singleton)
     */
    public static function getInstance(): PDO {
        if (self::$instance === null) {
            try {
                $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
                // Forcer le fuseau MySQL de la session = UTC+0 (= Ouagadougou)
                // Corrige CURRENT_TIMESTAMP / NOW() pour tous les logs et timestamps
                self::$instance->exec("SET time_zone = '+00:00'");
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Erreur de connexion à la base de données'
                ]);
                exit;
            }
        }
        return self::$instance;
    }
}
