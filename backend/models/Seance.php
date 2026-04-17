<?php
/**
 * EduSchedule Pro - Modèle Seance (Créneau)
 * Gestion des créneaux de l'emploi du temps
 */

require_once __DIR__ . '/../config/database.php';

class Seance {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Obtenir tous les créneaux d'un emploi du temps
     */
    public function getByEmploiTemps(int $idEmploiTemps): array {
        $stmt = $this->db->prepare("
            SELECT c.*, m.libelle AS matiere_libelle, m.code AS matiere_code,
                   CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
                   s.code AS salle_code, s.batiment
            FROM creneaux c
            JOIN matieres m ON c.id_matiere = m.id
            JOIN enseignants e ON c.id_enseignant = e.id
            JOIN salles s ON c.id_salle = s.id
            WHERE c.id_emploi_temps = ?
            ORDER BY FIELD(c.jour, 'lundi','mardi','mercredi','jeudi','vendredi','samedi'), c.heure_debut
        ");
        $stmt->execute([$idEmploiTemps]);
        return $stmt->fetchAll();
    }

    /**
     * Créer un nouveau créneau
     */
    public function create(array $data): int {
        $stmt = $this->db->prepare("
            INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['id_emploi_temps'],
            $data['id_matiere'],
            $data['id_enseignant'],
            $data['id_salle'],
            $data['jour'],
            $data['heure_debut'],
            $data['heure_fin']
        ]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Modifier un créneau
     */
    public function update(int $id, array $data): bool {
        $stmt = $this->db->prepare("
            UPDATE creneaux SET id_matiere = ?, id_enseignant = ?, id_salle = ?,
                   jour = ?, heure_debut = ?, heure_fin = ?
            WHERE id = ?
        ");
        return $stmt->execute([
            $data['id_matiere'], $data['id_enseignant'], $data['id_salle'],
            $data['jour'], $data['heure_debut'], $data['heure_fin'], $id
        ]);
    }

    /**
     * Supprimer un créneau
     */
    public function delete(int $id): bool {
        $stmt = $this->db->prepare("DELETE FROM creneaux WHERE id = ?");
        return $stmt->execute([$id]);
    }

    /**
     * Obtenir un créneau par son ID avec toutes les infos
     */
    public function getById(int $id): ?array {
        $stmt = $this->db->prepare("
            SELECT c.*, m.libelle AS matiere_libelle, m.code AS matiere_code,
                   CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom, e.id AS enseignant_id,
                   s.code AS salle_code, s.batiment,
                   cl.libelle AS classe_libelle, cl.code AS classe_code,
                   et.semaine_debut
            FROM creneaux c
            JOIN matieres m ON c.id_matiere = m.id
            JOIN enseignants e ON c.id_enseignant = e.id
            JOIN salles s ON c.id_salle = s.id
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            JOIN classes cl ON et.id_classe = cl.id
            WHERE c.id = ?
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Détecter les conflits (enseignant déjà occupé, salle déjà prise)
     */
    public function detectConflits(array $data, ?int $excludeId = null): array {
        $conflits = [];

        // Conflit enseignant
        $sql = "
            SELECT c.*, m.libelle AS matiere_libelle
            FROM creneaux c
            JOIN matieres m ON c.id_matiere = m.id
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            WHERE c.id_enseignant = ? AND c.jour = ?
            AND et.semaine_debut = (SELECT semaine_debut FROM emploi_temps WHERE id = ?)
            AND ((c.heure_debut < ? AND c.heure_fin > ?) OR (c.heure_debut < ? AND c.heure_fin > ?))
        ";
        $params = [
            $data['id_enseignant'], $data['jour'], $data['id_emploi_temps'],
            $data['heure_fin'], $data['heure_debut'],
            $data['heure_fin'], $data['heure_debut']
        ];

        if ($excludeId) {
            $sql .= " AND c.id != ?";
            $params[] = $excludeId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll();
        if (!empty($results)) {
            $conflits[] = ['type' => 'enseignant', 'message' => 'Enseignant déjà occupé sur ce créneau', 'details' => $results];
        }

        // Conflit salle
        $sql2 = "
            SELECT c.*, s.code AS salle_code
            FROM creneaux c
            JOIN salles s ON c.id_salle = s.id
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            WHERE c.id_salle = ? AND c.jour = ?
            AND et.semaine_debut = (SELECT semaine_debut FROM emploi_temps WHERE id = ?)
            AND ((c.heure_debut < ? AND c.heure_fin > ?) OR (c.heure_debut < ? AND c.heure_fin > ?))
        ";
        $params2 = [
            $data['id_salle'], $data['jour'], $data['id_emploi_temps'],
            $data['heure_fin'], $data['heure_debut'],
            $data['heure_fin'], $data['heure_debut']
        ];

        if ($excludeId) {
            $sql2 .= " AND c.id != ?";
            $params2[] = $excludeId;
        }

        $stmt2 = $this->db->prepare($sql2);
        $stmt2->execute($params2);
        $results2 = $stmt2->fetchAll();
        if (!empty($results2)) {
            $conflits[] = ['type' => 'salle', 'message' => 'Salle déjà occupée sur ce créneau', 'details' => $results2];
        }

        return $conflits;
    }

    /**
     * Mettre à jour le QR token d'un créneau
     */
    public function updateQRToken(int $id, string $token, string $expire): bool {
        $stmt = $this->db->prepare("UPDATE creneaux SET qr_token = ?, qr_expire = ? WHERE id = ?");
        return $stmt->execute([$token, $expire, $id]);
    }
}
