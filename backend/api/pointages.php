<?php
/**
 * EduSchedule Pro - API Pointages QR-Code
 * GET  /api/pointages.php?id_creneau=X   -> QR-Code d'un créneau (image PNG)
 * POST /api/pointages.php                -> Scanner/valider un QR-Code
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/Seance.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = Database::getInstance();
$action = $_GET['action'] ?? null;

switch ($method) {
    case 'GET':
        if ($action === 'info') {
            getCreneauInfo($db);   // Prévisualisation token (avant validation)
        } elseif ($action === 'statuts') {
            getStatutsAujourdhui($db); // Statuts des séances du jour (dashboard)
        } else {
            handleGetQR($db);      // Génération QR-Code
        }
        break;
    case 'POST':
        handleScanQR($db);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}

/**
 * Générer ou obtenir le QR-Code d'un créneau
 */
function handleGetQR(PDO $db): void {
    $user = requireRole(['admin', 'surveillant']);
    $idCreneau = isset($_GET['id_creneau']) ? (int) $_GET['id_creneau'] : null;

    if (!$idCreneau) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id_creneau requis']);
        exit;
    }

    $seanceModel = new Seance();
    $creneau = $seanceModel->getById($idCreneau);

    if (!$creneau) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Créneau non trouvé']);
        exit;
    }

    // Générer un token unique et chiffré
    $secret = $_ENV['QR_SECRET'] ?? 'eduschedule_qr_secret_2026';
    $tokenData = json_encode([
        'id_seance' => $idCreneau,
        'timestamp' => time(),
        'nonce' => bin2hex(random_bytes(8))
    ]);
    $token = base64_encode(openssl_encrypt($tokenData, 'AES-256-CBC', $secret, 0, substr(md5($secret), 0, 16)));

    // Fenêtre de validité : heure_debut - 15min → heure_debut + 15min
    $heureDebut = $creneau['heure_debut']; // ex: "08:00:00"
    $dateSeance = date('Y-m-d'); // aujourd'hui
    $debutTimestamp = strtotime("$dateSeance $heureDebut");
    $expire = date('Y-m-d H:i:s', $debutTimestamp + 15 * 60); // +15 min

    // Enregistrer le token
    $seanceModel->updateQRToken($idCreneau, $token, $expire);

    // URL de pointage — utilise l'IP locale pour que les smartphones puissent accéder
    $serverIp = $_SERVER['SERVER_ADDR'] ?? gethostbyname(gethostname());
    // Si localhost, essayer de récupérer la vraie IP locale
    if ($serverIp === '127.0.0.1' || $serverIp === '::1') {
        $serverIp = shell_exec("hostname -I 2>/dev/null") ?? '127.0.0.1';
        $serverIp = trim(explode(' ', $serverIp)[0]);
    }
    $frontPort = $_ENV['FRONT_PORT'] ?? '3000';
    $baseUrl = $_ENV['APP_URL'] ?? "http://{$serverIp}:{$frontPort}";
    $scanUrl = $baseUrl . '/pointage?token=' . urlencode($token);

    // Retourner les données pour génération côté client
    echo json_encode([
        'success' => true,
        'data' => [
            'token' => $token,
            'scan_url' => $scanUrl,
            'expire' => $expire,
            'creneau' => [
                'id' => $creneau['id'],
                'matiere' => $creneau['matiere_libelle'],
                'enseignant' => $creneau['enseignant_nom'],
                'salle' => $creneau['salle_code'],
                'jour' => $creneau['jour'],
                'heure' => $creneau['heure_debut'] . ' - ' . $creneau['heure_fin']
            ]
        ]
    ]);
}

/**
 * Valider le scan d'un QR-Code par un enseignant
 */
function handleScanQR(PDO $db): void {
    $user = requireRole(['enseignant']);
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['token_qr'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Token QR requis']);
        exit;
    }

    $token = $input['token_qr'];

    // Déchiffrer le token
    $secret = $_ENV['QR_SECRET'] ?? 'eduschedule_qr_secret_2026';
    $decrypted = openssl_decrypt(base64_decode($token), 'AES-256-CBC', $secret, 0, substr(md5($secret), 0, 16));

    if (!$decrypted) {
        logPointage($db, null, $token, 'invalide');
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'QR-Code invalide']);
        exit;
    }

    $tokenData = json_decode($decrypted, true);
    $idCreneau = $tokenData['id_seance'] ?? null;

    if (!$idCreneau) {
        logPointage($db, null, $token, 'invalide');
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Données QR-Code corrompues']);
        exit;
    }

    // Vérifier que le créneau existe
    $stmt = $db->prepare("SELECT * FROM creneaux WHERE id = ? AND qr_token = ?");
    $stmt->execute([$idCreneau, $token]);
    $creneau = $stmt->fetch();

    if (!$creneau) {
        logPointage($db, $idCreneau, $token, 'invalide');
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'QR-Code déjà utilisé ou invalide']);
        exit;
    }

    // Vérifier la fenêtre ±15 min autour de l'heure prévue
    $now = new DateTime();
    $heureDebutObj = new DateTime(date('Y-m-d') . ' ' . $creneau['heure_debut']);
    $diff = $now->getTimestamp() - $heureDebutObj->getTimestamp(); // secondes depuis heure prévue

    // Trop tôt : plus de 15 min avant le début
    if ($diff < -900) {
        logPointage($db, $idCreneau, $token, 'invalide');
        $minutesAvant = abs(round($diff / 60));
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "QR-Code pas encore actif. La séance commence dans {$minutesAvant} min."
        ]);
        exit;
    }

    // Trop tard : plus de 15 min après le début (QR expiré)
    if ($diff > 900) {
        logPointage($db, $idCreneau, $token, 'expire');
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'QR-Code expiré. La fenêtre de pointage (±15 min) est dépassée.'
        ]);
        exit;
    }

    // Vérifier que c'est le bon enseignant
    if ($creneau['id_enseignant'] != $user['id_lien']) {
        logPointage($db, $idCreneau, $token, 'invalide');
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Ce créneau n\'est pas attribué à votre compte']);
        exit;
    }

    // Déterminer le statut : retard si > 0 sec après l'heure prévue
    $statut = ($diff > 0) ? 'retard' : 'valide';

    // Enregistrer le pointage
    $stmtPointage = $db->prepare("
        INSERT INTO pointages (id_creneau, heure_pointage_reelle, ip_source, token_utilise, statut)
        VALUES (?, NOW(), ?, ?, ?)
    ");
    $stmtPointage->execute([
        $idCreneau,
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
        $token,
        $statut
    ]);

    // Invalider le token (usage unique)
    $db->prepare("UPDATE creneaux SET qr_token = NULL WHERE id = ?")->execute([$idCreneau]);

    // Alerte au surveillant si retard > 30 min (normalement QR expiré, mais garde-fou)
    if ($diff > 1800) {
        $minutesRetard = round($diff / 60);
        $stmtAlerte = $db->prepare("
            INSERT INTO logs_activite (id_utilisateur, action, details_json, ip)
            VALUES (?, 'alerte_retard_surveillant', ?, ?)
        ");
        $stmtAlerte->execute([
            $user['id'],
            json_encode([
                'id_creneau'     => $idCreneau,
                'id_enseignant'  => $user['id_lien'],
                'retard_minutes' => $minutesRetard,
                'message'        => "Retard de {$minutesRetard} minutes signalé"
            ]),
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);
    }

    // Logger
    $stmtLog = $db->prepare("
        INSERT INTO logs_activite (id_utilisateur, action, details_json, ip)
        VALUES (?, 'pointage_qr', ?, ?)
    ");
    $stmtLog->execute([
        $user['id'],
        json_encode(['id_creneau' => $idCreneau, 'statut' => $statut]),
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    ]);

    // Obtenir les infos du créneau pour la réponse
    $seanceModel = new Seance();
    $creneauInfo = $seanceModel->getById($idCreneau);

    echo json_encode([
        'success' => true,
        'message' => $statut === 'retard'
            ? 'Pointage enregistré avec retard de ' . round($diff / 60) . ' minutes'
            : 'Pointage validé avec succès',
        'data' => [
            'statut' => $statut,
            'heure_pointage' => date('H:i:s'),
            'retard_minutes' => max(0, round($diff / 60)),
            'creneau' => $creneauInfo
        ]
    ]);
}

/**
 * Prévisualiser les infos d'une séance depuis son token (avant validation)
 * Requiert une authentification enseignant
 */
function getCreneauInfo(PDO $db): void {
    $user = requireRole(['enseignant']);
    $token = $_GET['token'] ?? null;

    if (!$token) { sendError(400, 'Token requis'); }

    $secret = $_ENV['QR_SECRET'] ?? 'eduschedule_qr_secret_2026';
    $decrypted = openssl_decrypt(base64_decode($token), 'AES-256-CBC', $secret, 0, substr(md5($secret), 0, 16));

    if (!$decrypted) { sendError(400, 'QR-Code invalide ou corrompu'); }

    $tokenData = json_decode($decrypted, true);
    $idCreneau = $tokenData['id_seance'] ?? null;

    if (!$idCreneau) { sendError(400, 'Token corrompu'); }

    $stmt = $db->prepare("
        SELECT c.*, m.libelle AS matiere_libelle, m.code AS matiere_code,
               CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
               s.code AS salle_code, s.libelle AS salle_libelle, s.batiment,
               cl.libelle AS classe_libelle, cl.code AS classe_code,
               c.qr_token, c.qr_expire
        FROM creneaux c
        JOIN matieres m ON c.id_matiere = m.id
        JOIN enseignants e ON c.id_enseignant = e.id
        JOIN salles s ON c.id_salle = s.id
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN classes cl ON et.id_classe = cl.id
        WHERE c.id = ? AND c.qr_token = ?
    ");
    $stmt->execute([$idCreneau, $token]);
    $creneau = $stmt->fetch();

    if (!$creneau) {
        sendError(404, 'QR-Code déjà utilisé ou invalide');
    }

    // Calculer l'état de la fenêtre horaire
    $now = time();
    $heureDebut = strtotime(date('Y-m-d') . ' ' . $creneau['heure_debut']);
    $diff = $now - $heureDebut; // secondes depuis heure prévue

    $statut_fenetre = 'valide';
    $message_fenetre = 'Pointage possible maintenant';
    if ($diff < -900) {
        $statut_fenetre = 'trop_tot';
        $message_fenetre = 'Séance pas encore commencée (' . abs(round($diff / 60)) . ' min restantes)';
    } elseif ($diff > 900) {
        $statut_fenetre = 'expire';
        $message_fenetre = 'Fenêtre de pointage expirée';
    } elseif ($diff > 0) {
        $statut_fenetre = 'retard';
        $message_fenetre = 'Retard de ' . round($diff / 60) . ' min';
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'id_creneau'      => $idCreneau,
            'matiere'         => $creneau['matiere_libelle'],
            'matiere_code'    => $creneau['matiere_code'],
            'enseignant'      => $creneau['enseignant_nom'],
            'salle'           => $creneau['salle_code'] . ' – ' . $creneau['salle_libelle'],
            'batiment'        => $creneau['batiment'],
            'classe'          => $creneau['classe_libelle'],
            'jour'            => $creneau['jour'],
            'heure_debut'     => substr($creneau['heure_debut'], 0, 5),
            'heure_fin'       => substr($creneau['heure_fin'], 0, 5),
            'statut_fenetre'  => $statut_fenetre,
            'message_fenetre' => $message_fenetre,
            'expire'          => $creneau['qr_expire'],
            'est_mon_creneau' => ($creneau['id_enseignant'] == $user['id_lien']),
        ]
    ]);
}

/**
 * Statuts des séances du jour pour le dashboard surveillant/admin
 */
function getStatutsAujourdhui(PDO $db): void {
    $user = requireRole(['admin', 'surveillant']);
    $aujourdhui = strtolower(date('l', strtotime('today')));
    // Convertir le jour en français
    $jours = [
        'monday'=>'lundi','tuesday'=>'mardi','wednesday'=>'mercredi',
        'thursday'=>'jeudi','friday'=>'vendredi','saturday'=>'samedi','sunday'=>'dimanche'
    ];
    $jourFr = $jours[$aujourdhui] ?? $aujourdhui;
    $semaine = date('Y-m-d', strtotime('monday this week'));

    $stmt = $db->prepare("
        SELECT c.id, c.jour, c.heure_debut, c.heure_fin,
               m.libelle AS matiere, cl.libelle AS classe,
               s.code AS salle,
               CONCAT(e.prenom, ' ', e.nom) AS enseignant,
               p.statut AS statut_pointage, p.heure_pointage_reelle
        FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id AND et.statut_publication = 'publie'
            AND et.semaine_debut = ?
        JOIN matieres m ON c.id_matiere = m.id
        JOIN classes cl ON et.id_classe = cl.id
        JOIN salles s ON c.id_salle = s.id
        JOIN enseignants e ON c.id_enseignant = e.id
        LEFT JOIN pointages p ON p.id_creneau = c.id
            AND DATE(p.heure_pointage_reelle) = CURDATE()
        WHERE c.jour = ?
        ORDER BY c.heure_debut
    ");
    $stmt->execute([$semaine, $jourFr]);
    $seances = $stmt->fetchAll();

    $now = time();
    $result = [];
    foreach ($seances as $s) {
        $heureDebut = strtotime(date('Y-m-d') . ' ' . $s['heure_debut']);
        $diff = $now - $heureDebut;

        if ($s['statut_pointage'] === 'valide') {
            $statut_visuel = 'en_cours';
            $couleur = 'success';
        } elseif ($s['statut_pointage'] === 'retard') {
            $statut_visuel = 'retard';
            $couleur = 'warning';
        } elseif ($diff > 1800) { // >30 min sans pointage
            $statut_visuel = 'absent';
            $couleur = 'danger';
        } elseif ($diff > 0) { // commencé mais pas encore pointé
            $statut_visuel = 'en_attente';
            $couleur = 'secondary';
        } else {
            $statut_visuel = 'planifie';
            $couleur = 'light';
        }

        $result[] = array_merge($s, [
            'statut_visuel' => $statut_visuel,
            'couleur'       => $couleur,
            'heure_debut'   => substr($s['heure_debut'], 0, 5),
            'heure_fin'     => substr($s['heure_fin'], 0, 5),
        ]);
    }

    echo json_encode(['success' => true, 'data' => $result]);
}

/**
 * Logger une tentative de pointage
 */
function logPointage(PDO $db, ?int $idCreneau, string $token, string $statut): void {
    $stmt = $db->prepare("
        INSERT INTO pointages (id_creneau, heure_pointage_reelle, ip_source, token_utilise, statut)
        VALUES (?, NOW(), ?, ?, ?)
    ");
    // Ne logger que si on a un créneau valide
    if ($idCreneau) {
        $stmt->execute([$idCreneau, $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1', $token, $statut]);
    }
}
