<?php
/**
 * SCRIPT TEMPORAIRE - Identifiants enseignants
 * À SUPPRIMER après usage !
 * Accès : http://localhost/eduschedule-pro/backend/api/_users_debug.php
 */
require_once __DIR__ . '/../config/database.php';

$db = Database::getInstance();

// Tous les utilisateurs
$stmt = $db->query("
    SELECT u.id, u.prenom, u.nom, u.email, u.role, u.id_lien, u.actif
    FROM utilisateurs u
    ORDER BY u.role, u.nom
");
$users = $stmt->fetchAll();

// Hash du mot de passe 'password123' pour référence
$hash_ex = password_hash('password123', PASSWORD_DEFAULT);

header('Content-Type: text/html; charset=utf-8');
echo '<style>body{font-family:monospace;padding:20px;} table{border-collapse:collapse;} td,th{border:1px solid #ccc;padding:6px 12px;} tr:nth-child(even){background:#f5f5f5;} .ens{background:#e8f4e8;} .warn{color:red;font-weight:bold;}</style>';
echo '<h2>EduSchedule Pro — Utilisateurs (DEBUG)</h2>';
echo '<p class="warn">⚠ SUPPRIMER CE FICHIER APRÈS USAGE</p>';
echo '<table><tr><th>ID</th><th>Rôle</th><th>Prénom Nom</th><th>Email (login)</th><th>id_lien</th><th>Actif</th></tr>';

foreach ($users as $u) {
    $cls = $u['role'] === 'enseignant' ? ' class="ens"' : '';
    echo "<tr{$cls}><td>{$u['id']}</td><td><b>{$u['role']}</b></td><td>{$u['prenom']} {$u['nom']}</td><td>{$u['email']}</td><td>{$u['id_lien']}</td><td>".($u['actif']?'✓':'✗')."</td></tr>";
}
echo '</table>';

echo '<br><h3>Test vérification mot de passe</h3>';
$stmt2 = $db->query("SELECT email, mot_de_passe_hash FROM utilisateurs ORDER BY role, nom");
foreach($stmt2->fetchAll() as $u) {
    $tests = ['Azerty123!', 'password123', 'admin123', '123456', 'eduschedule'];
    foreach($tests as $pwd) {
        if(password_verify($pwd, $u['mot_de_passe_hash'])) {
            echo "<p><b>{$u['email']}</b> → mot de passe : <code style='background:#ff0;padding:2px 6px'><b>{$pwd}</b></code></p>";
        }
    }
}
