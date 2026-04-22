<?php
/**
 * Script temporaire - Réinitialise tous les mots de passe à "password"
 * SUPPRIMER CE FICHIER après utilisation !
 */
require_once __DIR__ . '/config/database.php';

$db = Database::getInstance();

$newHash = password_hash('password', PASSWORD_DEFAULT);

$stmt = $db->prepare("UPDATE utilisateurs SET mot_de_passe_hash = ?");
$stmt->execute([$newHash]);

$count = $stmt->rowCount();
echo json_encode([
    'success' => true,
    'message' => "$count mot(s) de passe réinitialisé(s) avec succès.",
    'hash'    => $newHash,
]);
