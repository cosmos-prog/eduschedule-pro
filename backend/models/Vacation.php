<?php
/**
 * EduSchedule Pro - Modèle Vacation
 * Fiches de vacation mensuelles avec contrôles de cohérence
 */

require_once __DIR__ . '/../config/database.php';

class Vacation {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Liste des fiches de vacation avec filtres
     */
    public function getAll(?int $idEnseignant = null, ?int $mois = null, ?int $annee = null): array {
        $sql = "
            SELECT v.*,
                   CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
                   e.matricule, e.taux_horaire
            FROM vacations v
            JOIN enseignants e ON v.id_enseignant = e.id
            WHERE 1=1
        ";
        $params = [];

        if ($idEnseignant) { $sql .= " AND v.id_enseignant = ?"; $params[] = $idEnseignant; }
        if ($mois)         { $sql .= " AND v.mois = ?";          $params[] = $mois; }
        if ($annee)        { $sql .= " AND v.annee = ?";         $params[] = $annee; }

        $sql .= " ORDER BY v.annee DESC, v.mois DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Détail complet d'une fiche (avec lignes + validations)
     */
    public function getById(int $id): ?array {
        $stmt = $this->db->prepare("
            SELECT v.*,
                   CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
                   e.matricule, e.taux_horaire, e.specialite,
                   e.statut AS enseignant_statut
            FROM vacations v
            JOIN enseignants e ON v.id_enseignant = e.id
            WHERE v.id = ?
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch();

        if (!$result) return null;

        // Lignes de détail — inclut les heures réelles stockées dans vacation_lignes
        $stmtLignes = $this->db->prepare("
            SELECT vl.*,
                   c.jour, c.heure_debut, c.heure_fin,
                   m.libelle AS matiere_libelle,
                   cl.libelle AS classe_libelle,
                   et.semaine_debut
            FROM vacation_lignes vl
            JOIN creneaux c       ON vl.id_creneau = c.id
            JOIN matieres m       ON c.id_matiere = m.id
            JOIN emploi_temps et  ON c.id_emploi_temps = et.id
            JOIN classes cl       ON et.id_classe = cl.id
            WHERE vl.id_vacation = ?
            ORDER BY et.semaine_debut,
                     FIELD(c.jour,'lundi','mardi','mercredi','jeudi','vendredi','samedi'),
                     c.heure_debut
        ");
        $stmtLignes->execute([$id]);
        $result['lignes'] = $stmtLignes->fetchAll();

        // Décoder alertes_json si présent
        if (!empty($result['alertes_json'])) {
            $result['alertes'] = json_decode($result['alertes_json'], true);
        } else {
            $result['alertes'] = [];
        }

        // Validations
        $stmtVal = $this->db->prepare("
            SELECT val.*, CONCAT(u.prenom, ' ', u.nom) AS validateur_nom
            FROM validations val
            JOIN utilisateurs u ON val.id_validateur = u.id
            WHERE val.id_vacation = ?
            ORDER BY val.date_validation
        ");
        $stmtVal->execute([$id]);
        $result['validations'] = $stmtVal->fetchAll();

        return $result;
    }

    /**
     * Générer automatiquement une fiche de vacation pour un enseignant/mois
     *
     * Contrôles de cohérence :
     *  - Alerte si cahier de texte absent ou non signé par les deux parties
     *  - Alerte si aucun pointage QR-Code enregistré
     *  - Alerte si la durée réelle dépasse la durée planifiée de plus de 30 min
     *
     * @return array  ['id' => int, 'nb_seances' => int, 'alertes' => array]
     */
    public function generer(int $idEnseignant, int $mois, int $annee): array {
        $this->db->beginTransaction();
        try {
            // Taux horaire de l'enseignant
            $stmtEns = $this->db->prepare("SELECT taux_horaire FROM enseignants WHERE id = ?");
            $stmtEns->execute([$idEnseignant]);
            $enseignant = $stmtEns->fetch();
            if (!$enseignant) throw new Exception("Enseignant introuvable (id=$idEnseignant)");
            $tauxHoraire = (float) $enseignant['taux_horaire'];

            // Tous les créneaux de l'enseignant dans le mois, avec données réelles
            $stmtSeances = $this->db->prepare("
                SELECT
                    c.id AS creneau_id,
                    c.heure_debut, c.heure_fin, c.jour,
                    et.semaine_debut,
                    m.libelle AS matiere_libelle,
                    (TIME_TO_SEC(c.heure_fin) - TIME_TO_SEC(c.heure_debut)) / 3600.0 AS duree_planifiee,

                    -- Statut et heure fin réelle du cahier de texte
                    (SELECT ct2.statut
                     FROM cahiers_texte ct2
                     WHERE ct2.id_creneau = c.id
                     ORDER BY ct2.id DESC LIMIT 1) AS cahier_statut,

                    (SELECT ct2.heure_fin_reelle
                     FROM cahiers_texte ct2
                     WHERE ct2.id_creneau = c.id
                     ORDER BY ct2.id DESC LIMIT 1) AS heure_fin_reelle,

                    -- Heure réelle d'arrivée depuis le pointage QR
                    (SELECT p2.heure_pointage_reelle
                     FROM pointages p2
                     WHERE p2.id_creneau = c.id
                       AND p2.statut IN ('valide','retard')
                     ORDER BY p2.id ASC LIMIT 1) AS heure_debut_reelle,

                    (SELECT p2.statut
                     FROM pointages p2
                     WHERE p2.id_creneau = c.id
                       AND p2.statut IN ('valide','retard')
                     ORDER BY p2.id ASC LIMIT 1) AS pointage_statut

                FROM creneaux c
                JOIN emploi_temps et ON c.id_emploi_temps = et.id
                JOIN matieres m      ON c.id_matiere = m.id
                WHERE c.id_enseignant = ?
                  AND MONTH(DATE_ADD(et.semaine_debut, INTERVAL
                      FIELD(c.jour,'lundi','mardi','mercredi','jeudi','vendredi','samedi') - 1 DAY)) = ?
                  AND YEAR(DATE_ADD(et.semaine_debut, INTERVAL
                      FIELD(c.jour,'lundi','mardi','mercredi','jeudi','vendredi','samedi') - 1 DAY)) = ?
                ORDER BY et.semaine_debut,
                         FIELD(c.jour,'lundi','mardi','mercredi','jeudi','vendredi','samedi'),
                         c.heure_debut
            ");
            $stmtSeances->execute([$idEnseignant, $mois, $annee]);
            $seances = $stmtSeances->fetchAll();

            $montantBrut = 0.0;
            $lignes  = [];
            $alertes = [];

            foreach ($seances as $seance) {
                $messages = [];

                // ── Contrôle 1 : cahier signé des deux parties ──────────────
                $cahierOk = !empty($seance['cahier_statut'])
                    && in_array($seance['cahier_statut'], ['signe_enseignant', 'cloture']);
                if (!$cahierOk) {
                    $messages[] = "Cahier de texte " . (empty($seance['cahier_statut']) ? "absent" : "non signé par l'enseignant (statut : " . $seance['cahier_statut'] . ")");
                }

                // ── Contrôle 2 : pointage QR-Code présent ────────────────────
                if (empty($seance['pointage_statut'])) {
                    $messages[] = "Aucun pointage QR-Code enregistré";
                }

                // ── Calcul de la durée réelle ────────────────────────────────
                $dureePlanifiee = (float) $seance['duree_planifiee'];

                if (!empty($seance['heure_fin_reelle']) && !empty($seance['heure_debut_reelle'])) {
                    // Durée basée sur pointage réel → fin réelle
                    $debut = strtotime($seance['heure_debut_reelle']);
                    $fin   = strtotime($seance['heure_fin_reelle']);
                    $duree = max(0, ($fin - $debut) / 3600.0);
                } elseif (!empty($seance['heure_fin_reelle'])) {
                    // Fin réelle seulement → début planifié
                    $debut = strtotime($seance['heure_debut']);
                    $fin   = strtotime($seance['heure_fin_reelle']);
                    $duree = max(0, ($fin - $debut) / 3600.0);
                } else {
                    // Pas de données réelles : durée planifiée
                    $duree = $dureePlanifiee;
                }
                $duree = round($duree, 2);

                // ── Contrôle 3 : durée excessive (> planifiée + 30 min) ──────
                if ($duree > $dureePlanifiee + 0.5) {
                    $messages[] = sprintf(
                        "Durée excessive : %.1fh réelle vs %.1fh planifiée",
                        $duree, $dureePlanifiee
                    );
                }

                $montant      = round($duree * $tauxHoraire, 2);
                $montantBrut += $montant;
                $aAlerte      = !empty($messages);

                if ($aAlerte) {
                    $alertes[] = [
                        'creneau_id' => $seance['creneau_id'],
                        'jour'       => $seance['jour'],
                        'semaine'    => $seance['semaine_debut'],
                        'matiere'    => $seance['matiere_libelle'],
                        'messages'   => $messages,
                    ];
                }

                $lignes[] = [
                    'id_creneau'         => $seance['creneau_id'],
                    'heure_debut_reelle' => !empty($seance['heure_debut_reelle'])
                        ? substr($seance['heure_debut_reelle'], 0, 8) : null,
                    'heure_fin_reelle'   => !empty($seance['heure_fin_reelle'])
                        ? substr($seance['heure_fin_reelle'], 0, 8) : null,
                    'duree_heures'       => $duree,
                    'taux'               => $tauxHoraire,
                    'montant'            => $montant,
                    'alerte'             => $aAlerte ? 1 : 0,
                    'alerte_message'     => $aAlerte ? implode(' ; ', $messages) : null,
                ];
            }

            $retenues   = round($montantBrut * 0.1, 2);
            $montantNet = round($montantBrut - $retenues, 2);
            $nbSeances  = count($lignes);
            $alertesJson = empty($alertes) ? null : json_encode($alertes, JSON_UNESCAPED_UNICODE);

            // Créer ou régénérer la fiche
            $stmtVac = $this->db->prepare("
                INSERT INTO vacations
                    (id_enseignant, mois, annee, nb_seances, montant_brut, montant_net, retenues, statut, alertes_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'generee', ?)
                ON DUPLICATE KEY UPDATE
                    nb_seances   = VALUES(nb_seances),
                    montant_brut = VALUES(montant_brut),
                    montant_net  = VALUES(montant_net),
                    retenues     = VALUES(retenues),
                    statut       = 'generee',
                    alertes_json = VALUES(alertes_json)
            ");
            $stmtVac->execute([
                $idEnseignant, $mois, $annee, $nbSeances,
                round($montantBrut, 2), $montantNet, $retenues, $alertesJson
            ]);
            $vacationId = (int) $this->db->lastInsertId();

            // Récupérer l'ID si UPDATE (lastInsertId = 0)
            if ($vacationId === 0) {
                $stmtId = $this->db->prepare(
                    "SELECT id FROM vacations WHERE id_enseignant = ? AND mois = ? AND annee = ?"
                );
                $stmtId->execute([$idEnseignant, $mois, $annee]);
                $vacationId = (int) $stmtId->fetch()['id'];
            }

            // Supprimer les anciennes lignes et réinsérer
            $this->db->prepare("DELETE FROM vacation_lignes WHERE id_vacation = ?")->execute([$vacationId]);

            $stmtLigne = $this->db->prepare("
                INSERT INTO vacation_lignes
                    (id_vacation, id_creneau, heure_debut_reelle, heure_fin_reelle,
                     duree_heures, taux, montant, alerte, alerte_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            foreach ($lignes as $l) {
                $stmtLigne->execute([
                    $vacationId,
                    $l['id_creneau'],
                    $l['heure_debut_reelle'],
                    $l['heure_fin_reelle'],
                    $l['duree_heures'],
                    $l['taux'],
                    $l['montant'],
                    $l['alerte'],
                    $l['alerte_message'],
                ]);
            }

            $this->db->commit();

            return [
                'id'         => $vacationId,
                'nb_seances' => $nbSeances,
                'alertes'    => $alertes,
            ];

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Vérifier la cohérence avant validation par le surveillant.
     * Retourne les séances problématiques (cahier non clôturé).
     */
    public function verifierCoherence(int $id): array {
        $stmt = $this->db->prepare("
            SELECT c.jour, et.semaine_debut, m.libelle AS matiere,
                   COALESCE(ct.statut, 'absent') AS cahier_statut
            FROM vacation_lignes vl
            JOIN creneaux c      ON vl.id_creneau = c.id
            JOIN matieres m      ON c.id_matiere = m.id
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
            WHERE vl.id_vacation = ?
              AND (ct.id IS NULL OR ct.statut != 'cloture')
        ");
        $stmt->execute([$id]);
        return $stmt->fetchAll();
    }

    /**
     * Valider une fiche (enseignant, surveillant ou comptable)
     */
    public function valider(int $id, array $data): bool {
        // ── Contrôle bloquant pour le surveillant ────────────────────────────
        if ($data['role_validateur'] === 'surveillant') {
            $problemes = $this->verifierCoherence($id);
            if (!empty($problemes)) {
                $details = implode(', ', array_map(
                    fn($p) => ucfirst($p['jour']) . ' – ' . $p['matiere'] . ' (' . $p['cahier_statut'] . ')',
                    $problemes
                ));
                throw new Exception(
                    count($problemes) . " séance(s) non clôturée(s) : " . $details
                );
            }
        }

        $this->db->beginTransaction();
        try {
            // Enregistrer la validation
            $stmt = $this->db->prepare("
                INSERT INTO validations (id_vacation, id_validateur, role_validateur, visa_base64, commentaire)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $id,
                $data['id_validateur'],
                $data['role_validateur'],
                $data['visa_base64'] ?? null,
                $data['commentaire'] ?? null,
            ]);

            // Mettre à jour le statut de la fiche
            $statutMap = [
                'enseignant'  => 'signee_enseignant',
                'surveillant' => 'visee_surveillant',
                'comptable'   => 'validee_comptable',
            ];
            $newStatut = $statutMap[$data['role_validateur']] ?? 'generee';

            $this->db->prepare("UPDATE vacations SET statut = ? WHERE id = ?")
                ->execute([$newStatut, $id]);

            $this->db->commit();
            return true;

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
