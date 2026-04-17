<?php
/**
 * EduSchedule Pro - Modèle CahierTexte
 * Gestion des cahiers de texte numériques
 */

require_once __DIR__ . '/../config/database.php';

class CahierTexte {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Obtenir les cahiers de texte avec filtres
     */
    public function getAll(?int $idCreneau = null, ?int $idClasse = null, ?int $mois = null): array {
        $sql = "
            SELECT ct.*, c.jour, c.heure_debut, c.heure_fin,
                   m.libelle AS matiere_libelle,
                   CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
                   cl.libelle AS classe_libelle,
                   CONCAT(u.prenom, ' ', u.nom) AS delegue_nom
            FROM cahiers_texte ct
            JOIN creneaux c ON ct.id_creneau = c.id
            JOIN matieres m ON c.id_matiere = m.id
            JOIN enseignants e ON c.id_enseignant = e.id
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            JOIN classes cl ON et.id_classe = cl.id
            LEFT JOIN utilisateurs u ON ct.id_delegue = u.id
            WHERE 1=1
        ";
        $params = [];

        if ($idCreneau) {
            $sql .= " AND ct.id_creneau = ?";
            $params[] = $idCreneau;
        }
        if ($idClasse) {
            $sql .= " AND et.id_classe = ?";
            $params[] = $idClasse;
        }
        if ($mois) {
            $sql .= " AND MONTH(et.semaine_debut) = ?";
            $params[] = $mois;
        }

        $sql .= " ORDER BY ct.date_creation DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Obtenir un cahier de texte par ID avec détails complets
     */
    public function getById(int $id): ?array {
        $stmt = $this->db->prepare("
            SELECT ct.*, c.jour, c.heure_debut, c.heure_fin, c.id_enseignant,
                   m.libelle AS matiere_libelle, m.code AS matiere_code,
                   CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
                   cl.libelle AS classe_libelle, cl.code AS classe_code,
                   s.code AS salle_code,
                   CONCAT(u.prenom, ' ', u.nom) AS delegue_nom,
                   et.semaine_debut
            FROM cahiers_texte ct
            JOIN creneaux c ON ct.id_creneau = c.id
            JOIN matieres m ON c.id_matiere = m.id
            JOIN enseignants e ON c.id_enseignant = e.id
            JOIN salles s ON c.id_salle = s.id
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            JOIN classes cl ON et.id_classe = cl.id
            LEFT JOIN utilisateurs u ON ct.id_delegue = u.id
            WHERE ct.id = ?
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch();

        if ($result) {
            // Récupérer les signatures
            $stmtSig = $this->db->prepare("
                SELECT s.*, CONCAT(u.prenom, ' ', u.nom) AS signataire_nom
                FROM signatures s
                JOIN utilisateurs u ON s.id_utilisateur = u.id
                WHERE s.id_cahier = ?
            ");
            $stmtSig->execute([$id]);
            $result['signatures'] = $stmtSig->fetchAll();

            // Récupérer les travaux demandés
            $stmtTrav = $this->db->prepare("SELECT * FROM travaux_demandes WHERE id_cahier = ?");
            $stmtTrav->execute([$id]);
            $result['travaux'] = $stmtTrav->fetchAll();
        }

        return $result ?: null;
    }

    /**
     * Créer un cahier de texte
     */
    public function create(array $data): int {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("
                INSERT INTO cahiers_texte (id_creneau, id_delegue, titre_cours, contenu_json, statut)
                VALUES (?, ?, ?, ?, 'brouillon')
            ");
            $stmt->execute([
                $data['id_creneau'],
                $data['id_delegue'] ?? null,
                $data['titre'] ?? null,
                json_encode($data['contenu_json'] ?? [])
            ]);
            $cahierId = (int) $this->db->lastInsertId();

            // Ajouter les travaux demandés si présents
            if (!empty($data['travaux'])) {
                $stmtTrav = $this->db->prepare("
                    INSERT INTO travaux_demandes (id_cahier, description, date_limite, type)
                    VALUES (?, ?, ?, ?)
                ");
                foreach ($data['travaux'] as $travail) {
                    $stmtTrav->execute([
                        $cahierId,
                        $travail['description'],
                        $travail['date_limite'] ?? null,
                        $travail['type'] ?? 'devoir'
                    ]);
                }
            }

            $this->db->commit();
            return $cahierId;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Modifier un cahier de texte (seulement si statut = brouillon)
     */
    public function update(int $id, array $data): bool {
        $cahier = $this->getById($id);
        if (!$cahier || $cahier['statut'] !== 'brouillon') {
            return false;
        }

        $stmt = $this->db->prepare("
            UPDATE cahiers_texte SET titre_cours = ?, contenu_json = ?
            WHERE id = ? AND statut = 'brouillon'
        ");
        return $stmt->execute([
            $data['titre'] ?? $cahier['titre_cours'],
            json_encode($data['contenu_json'] ?? json_decode($cahier['contenu_json'], true)),
            $id
        ]);
    }

    /**
     * Apposer une signature sur un cahier de texte
     */
    public function signer(int $id, array $data): bool {
        $this->db->beginTransaction();
        try {
            // Enregistrer la signature
            $stmt = $this->db->prepare("
                INSERT INTO signatures (id_cahier, type_signataire, id_utilisateur, signature_base64)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([
                $id,
                $data['type'],
                $data['id_utilisateur'],
                $data['signature_base64']
            ]);

            // Mettre à jour le statut du cahier
            $newStatut = ($data['type'] === 'delegue') ? 'signe_delegue' : 'cloture';
            $stmtUpdate = $this->db->prepare("UPDATE cahiers_texte SET statut = ? WHERE id = ?");
            $stmtUpdate->execute([$newStatut, $id]);

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Clôturer une séance (enseignant)
     */
    public function cloturer(int $id, array $data): bool {
        $stmt = $this->db->prepare("
            UPDATE cahiers_texte SET heure_fin_reelle = ?, statut = 'cloture'
            WHERE id = ?
        ");
        $result = $stmt->execute([$data['heure_fin'] ?? date('H:i:s'), $id]);

        // Ajouter la signature enseignant si fournie
        if ($result && !empty($data['signature_base64'])) {
            $stmtSig = $this->db->prepare("
                INSERT INTO signatures (id_cahier, type_signataire, id_utilisateur, signature_base64)
                VALUES (?, 'enseignant', ?, ?)
            ");
            $stmtSig->execute([$id, $data['id_utilisateur'], $data['signature_base64']]);
        }

        return $result;
    }

    /**
     * Obtenir les cahiers en attente pour un délégué
     */
    public function getEnAttenteByClasse(int $idClasse): array {
        $stmt = $this->db->prepare("
            SELECT c.id AS creneau_id, c.jour, c.heure_debut, c.heure_fin,
                   m.libelle AS matiere_libelle,
                   CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
                   p.statut AS pointage_statut,
                   ct.id AS cahier_id, ct.statut AS cahier_statut
            FROM creneaux c
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            JOIN matieres m ON c.id_matiere = m.id
            JOIN enseignants e ON c.id_enseignant = e.id
            LEFT JOIN pointages p ON p.id_creneau = c.id
            LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
            WHERE et.id_classe = ? AND p.id IS NOT NULL
            AND (ct.id IS NULL OR ct.statut = 'brouillon')
            ORDER BY et.semaine_debut DESC, FIELD(c.jour, 'lundi','mardi','mercredi','jeudi','vendredi','samedi'), c.heure_debut
        ");
        $stmt->execute([$idClasse]);
        return $stmt->fetchAll();
    }
}
