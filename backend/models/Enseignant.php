<?php
/**
 * EduSchedule Pro - Modèle Enseignant
 * Gestion des données enseignants
 */

require_once __DIR__ . '/../config/database.php';

class Enseignant {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Obtenir tous les enseignants avec filtres optionnels
     */
    public function getAll(?string $specialite = null, ?string $statut = null): array {
        $sql = "SELECT * FROM enseignants WHERE 1=1";
        $params = [];

        if ($specialite) {
            $sql .= " AND specialite LIKE ?";
            $params[] = "%$specialite%";
        }
        if ($statut) {
            $sql .= " AND statut = ?";
            $params[] = $statut;
        }

        $sql .= " ORDER BY nom, prenom";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Obtenir un enseignant par son ID
     */
    public function getById(int $id): ?array {
        $stmt = $this->db->prepare("SELECT * FROM enseignants WHERE id = ?");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Créer un enseignant
     */
    public function create(array $data): int {
        $stmt = $this->db->prepare("
            INSERT INTO enseignants (matricule, nom, prenom, email, telephone, specialite, statut, taux_horaire)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['matricule'] ?? $this->generateMatricule(),
            $data['nom'], $data['prenom'], $data['email'],
            $data['telephone'] ?? null, $data['specialite'] ?? null,
            $data['statut'] ?? 'vacataire', $data['taux_horaire'] ?? 5000.00
        ]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Modifier un enseignant
     */
    public function update(int $id, array $data): bool {
        $fields = [];
        $params = [];

        foreach (['nom', 'prenom', 'email', 'telephone', 'specialite', 'statut', 'taux_horaire'] as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($fields)) return false;

        $params[] = $id;
        $sql = "UPDATE enseignants SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    /**
     * Supprimer un enseignant
     */
    public function delete(int $id): bool {
        $stmt = $this->db->prepare("DELETE FROM enseignants WHERE id = ?");
        return $stmt->execute([$id]);
    }

    /**
     * Générer un matricule automatique
     */
    private function generateMatricule(): string {
        $stmt = $this->db->query("SELECT MAX(id) as max_id FROM enseignants");
        $result = $stmt->fetch();
        $next = ($result['max_id'] ?? 0) + 1;
        return 'ENS' . str_pad($next, 3, '0', STR_PAD_LEFT);
    }
}
