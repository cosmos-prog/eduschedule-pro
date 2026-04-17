<?php
/**
 * EduSchedule Pro - Modèle Vacation
 * Gestion des fiches de vacation et paiement
 */

require_once __DIR__ . '/../config/database.php';

class Vacation {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Obtenir les fiches de vacation avec filtres
     */
    public function getAll(?int $idEnseignant = null, ?int $mois = null, ?int $annee = null): array {
        $sql = "
            SELECT v.*, CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
                   e.matricule, e.taux_horaire
            FROM vacations v
            JOIN enseignants e ON v.id_enseignant = e.id
            WHERE 1=1
        ";
        $params = [];

        if ($idEnseignant) {
            $sql .= " AND v.id_enseignant = ?";
            $params[] = $idEnseignant;
        }
        if ($mois) {
            $sql .= " AND v.mois = ?";
            $params[] = $mois;
        }
        if ($annee) {
            $sql .= " AND v.annee = ?";
            $params[] = $annee;
        }

        $sql .= " ORDER BY v.annee DESC, v.mois DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Obtenir une fiche de vacation par ID avec détails
     */
    public function getById(int $id): ?array {
        $stmt = $this->db->prepare("
            SELECT v.*, CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
                   e.matricule, e.taux_horaire, e.specialite, e.statut AS enseignant_statut
            FROM vacations v
            JOIN enseignants e ON v.id_enseignant = e.id
            WHERE v.id = ?
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch();

        if ($result) {
            // Lignes de détail
            $stmtLignes = $this->db->prepare("
                SELECT vl.*, c.jour, c.heure_debut, c.heure_fin,
                       m.libelle AS matiere_libelle, cl.libelle AS classe_libelle,
                       et.semaine_debut
                FROM vacation_lignes vl
                JOIN creneaux c ON vl.id_creneau = c.id
                JOIN matieres m ON c.id_matiere = m.id
                JOIN emploi_temps et ON c.id_emploi_temps = et.id
                JOIN classes cl ON et.id_classe = cl.id
                WHERE vl.id_vacation = ?
                ORDER BY et.semaine_debut, FIELD(c.jour, 'lundi','mardi','mercredi','jeudi','vendredi','samedi')
            ");
            $stmtLignes->execute([$id]);
            $result['lignes'] = $stmtLignes->fetchAll();

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
        }

        return $result ?: null;
    }

    /**
     * Générer automatiquement une fiche de vacation pour un enseignant/mois
     */
    public function generer(int $idEnseignant, int $mois, int $annee): int {
        $this->db->beginTransaction();
        try {
            // Récupérer le taux horaire de l'enseignant
            $stmtEns = $this->db->prepare("SELECT taux_horaire FROM enseignants WHERE id = ?");
            $stmtEns->execute([$idEnseignant]);
            $enseignant = $stmtEns->fetch();
            $tauxHoraire = $enseignant['taux_horaire'];

            // Récupérer toutes les séances clôturées du mois
            $stmtSeances = $this->db->prepare("
                SELECT c.id AS creneau_id, ct.heure_fin_reelle, c.heure_debut,
                       TIMESTAMPDIFF(MINUTE,
                           CONCAT(et.semaine_debut, ' ', c.heure_debut),
                           CONCAT(et.semaine_debut, ' ', COALESCE(ct.heure_fin_reelle, c.heure_fin))
                       ) / 60.0 AS duree_heures
                FROM creneaux c
                JOIN emploi_temps et ON c.id_emploi_temps = et.id
                JOIN cahiers_texte ct ON ct.id_creneau = c.id
                JOIN pointages p ON p.id_creneau = c.id
                WHERE c.id_enseignant = ?
                AND ct.statut = 'cloture'
                AND p.statut IN ('valide', 'retard')
                AND MONTH(et.semaine_debut) = ?
                AND YEAR(et.semaine_debut) = ?
            ");
            $stmtSeances->execute([$idEnseignant, $mois, $annee]);
            $seances = $stmtSeances->fetchAll();

            // Calculer les montants
            $montantBrut = 0;
            $lignes = [];
            foreach ($seances as $seance) {
                $duree = max(0, round($seance['duree_heures'], 2));
                $montant = $duree * $tauxHoraire;
                $montantBrut += $montant;
                $lignes[] = [
                    'id_creneau' => $seance['creneau_id'],
                    'duree_heures' => $duree,
                    'taux' => $tauxHoraire,
                    'montant' => $montant
                ];
            }

            $retenues = round($montantBrut * 0.1, 2); // 10% de retenues par défaut
            $montantNet = $montantBrut - $retenues;

            // Créer la fiche de vacation
            $stmtVac = $this->db->prepare("
                INSERT INTO vacations (id_enseignant, mois, annee, montant_brut, montant_net, retenues, statut)
                VALUES (?, ?, ?, ?, ?, ?, 'generee')
                ON DUPLICATE KEY UPDATE montant_brut = ?, montant_net = ?, retenues = ?, statut = 'generee'
            ");
            $stmtVac->execute([
                $idEnseignant, $mois, $annee,
                $montantBrut, $montantNet, $retenues,
                $montantBrut, $montantNet, $retenues
            ]);
            $vacationId = (int) $this->db->lastInsertId();

            // Si c'est un UPDATE, on récupère l'ID existant
            if ($vacationId === 0) {
                $stmtId = $this->db->prepare("SELECT id FROM vacations WHERE id_enseignant = ? AND mois = ? AND annee = ?");
                $stmtId->execute([$idEnseignant, $mois, $annee]);
                $vacationId = (int) $stmtId->fetch()['id'];

                // Supprimer les anciennes lignes
                $this->db->prepare("DELETE FROM vacation_lignes WHERE id_vacation = ?")->execute([$vacationId]);
            }

            // Insérer les lignes de détail
            $stmtLigne = $this->db->prepare("
                INSERT INTO vacation_lignes (id_vacation, id_creneau, duree_heures, taux, montant)
                VALUES (?, ?, ?, ?, ?)
            ");
            foreach ($lignes as $ligne) {
                $stmtLigne->execute([
                    $vacationId, $ligne['id_creneau'],
                    $ligne['duree_heures'], $ligne['taux'], $ligne['montant']
                ]);
            }

            $this->db->commit();
            return $vacationId;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Valider une fiche (enseignant, surveillant ou comptable)
     */
    public function valider(int $id, array $data): bool {
        $this->db->beginTransaction();
        try {
            // Enregistrer la validation
            $stmt = $this->db->prepare("
                INSERT INTO validations (id_vacation, id_validateur, role_validateur, visa_base64, commentaire)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $id, $data['id_validateur'], $data['role_validateur'],
                $data['visa_base64'] ?? null, $data['commentaire'] ?? null
            ]);

            // Mettre à jour le statut
            $statutMap = [
                'enseignant' => 'signee_enseignant',
                'surveillant' => 'visee_surveillant',
                'comptable' => 'validee_comptable'
            ];
            $newStatut = $statutMap[$data['role_validateur']] ?? 'generee';

            $stmtUpdate = $this->db->prepare("UPDATE vacations SET statut = ? WHERE id = ?");
            $stmtUpdate->execute([$newStatut, $id]);

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
