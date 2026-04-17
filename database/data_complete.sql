-- ============================================================
-- EduSchedule Pro - Données complètes toutes classes
-- Semaines du 06 et 13 avril 2026
-- À importer APRÈS eduschedule_pro.sql
-- ============================================================

USE eduschedule_pro;
SET FOREIGN_KEY_CHECKS = 0;

-- Nettoyage des données dynamiques (garde la structure et les référentiels)
DELETE FROM cahiers_texte;
DELETE FROM pointages;
DELETE FROM vacation_lignes;
DELETE FROM vacations;
DELETE FROM creneaux;
DELETE FROM emploi_temps;

ALTER TABLE cahiers_texte  AUTO_INCREMENT = 1;
ALTER TABLE pointages      AUTO_INCREMENT = 1;
ALTER TABLE vacation_lignes AUTO_INCREMENT = 1;
ALTER TABLE vacations      AUTO_INCREMENT = 1;
ALTER TABLE creneaux       AUTO_INCREMENT = 1;
ALTER TABLE emploi_temps   AUTO_INCREMENT = 1;

-- ============================================================
-- EMPLOIS DU TEMPS - Semaine du 06 avril 2026 (passée)
-- ============================================================
INSERT INTO emploi_temps (id, id_classe, semaine_debut, statut_publication, cree_par) VALUES
(1, 1, '2026-04-06', 'publie', 1),   -- L1-RST
(2, 2, '2026-04-06', 'publie', 1),   -- L2-RST
(3, 3, '2026-04-06', 'publie', 1),   -- L3-RST
(4, 4, '2026-04-06', 'publie', 1);   -- M1-RST

-- ============================================================
-- EMPLOIS DU TEMPS - Semaine du 13 avril 2026 (en cours)
-- ============================================================
INSERT INTO emploi_temps (id, id_classe, semaine_debut, statut_publication, cree_par) VALUES
(5, 1, '2026-04-13', 'publie', 1),   -- L1-RST
(6, 2, '2026-04-13', 'publie', 1),   -- L2-RST
(7, 3, '2026-04-13', 'brouillon', 1), -- L3-RST
(8, 4, '2026-04-13', 'brouillon', 1); -- M1-RST

-- ============================================================
-- Correspondances
-- SALLES : 1=A101, 2=A102, 3=B201, 4=B202, 5=LAB-INFO, 6=AMPHI-1
-- ENSEIGNANTS : 1=BERE Cédric, 2=OUEDRAOGO Aminata, 3=KABORE Ibrahim
--               4=SANOU Marie-Claire, 5=TRAORE Moussa
--               6=ZONGO Patricia, 7=COMPAORE Jean-Baptiste
-- MATIÈRES : 1=DEV-WEB, 2=BDD, 3=ALGO, 4=RESEAU, 5=SECU
--             6=MATH, 7=SYS-EXP, 8=PROJ
-- ============================================================

-- ============================================================
-- CRÉNEAUX - L1-RST semaine du 06 avril (et_id=1)
-- ============================================================
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES
-- Lundi
(1, 1, 1, 5, 'lundi',    '08:00:00', '10:00:00'),  -- Dev Web - BERE - Labo
(1, 2, 2, 1, 'lundi',    '10:15:00', '12:15:00'),  -- BDD - OUEDRAOGO - A101
(1, 4, 3, 2, 'lundi',    '14:00:00', '16:00:00'),  -- Réseaux - KABORE - A102
-- Mardi
(1, 3, 5, 1, 'mardi',    '08:00:00', '10:00:00'),  -- Algo - TRAORE - A101
(1, 6, 6, 3, 'mardi',    '10:15:00', '12:15:00'),  -- Maths - ZONGO - B201
(1, 8, 1, 3, 'mardi',    '14:00:00', '16:00:00'),  -- Gestion Projet - BERE - B201
-- Mercredi
(1, 5, 4, 1, 'mercredi', '08:00:00', '10:00:00'),  -- Sécu - SANOU - A101
(1, 7, 7, 5, 'mercredi', '10:15:00', '12:15:00'),  -- Sys Exp - COMPAORE - Labo
-- Jeudi
(1, 1, 1, 5, 'jeudi',    '08:00:00', '10:00:00'),  -- Dev Web - BERE - Labo
(1, 2, 2, 1, 'jeudi',    '10:15:00', '12:15:00'),  -- BDD - OUEDRAOGO - A101
(1, 5, 4, 2, 'jeudi',    '14:00:00', '16:00:00'),  -- Sécu - SANOU - A102
-- Vendredi
(1, 2, 2, 1, 'vendredi', '08:00:00', '10:00:00'),  -- BDD - OUEDRAOGO - A101
(1, 4, 3, 3, 'vendredi', '10:15:00', '12:15:00'),  -- Réseaux - KABORE - B201
(1, 3, 5, 1, 'vendredi', '14:00:00', '16:00:00'),  -- Algo - TRAORE - A101
-- Samedi
(1, 6, 6, 3, 'samedi',   '08:00:00', '10:00:00'),  -- Maths - ZONGO - B201
(1, 7, 7, 5, 'samedi',   '10:15:00', '12:15:00');  -- Sys Exp - COMPAORE - Labo

-- ============================================================
-- CRÉNEAUX - L2-RST semaine du 06 avril (et_id=2)
-- ============================================================
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES
(2, 1, 1, 5, 'lundi',    '10:15:00', '12:15:00'),  -- Dev Web - BERE - Labo
(2, 4, 3, 3, 'lundi',    '14:00:00', '16:00:00'),  -- Réseaux - KABORE - B201
(2, 5, 4, 2, 'mardi',    '08:00:00', '10:00:00'),  -- Sécu - SANOU - A102
(2, 6, 6, 3, 'mardi',    '10:15:00', '12:15:00'),  -- Maths - ZONGO - B201
(2, 3, 5, 1, 'mercredi', '08:00:00', '10:00:00'),  -- Algo - TRAORE - A101
(2, 7, 7, 5, 'mercredi', '14:00:00', '16:00:00'),  -- Sys Exp - COMPAORE - Labo
(2, 4, 3, 3, 'jeudi',    '08:00:00', '10:00:00'),  -- Réseaux - KABORE - B201
(2, 2, 2, 1, 'jeudi',    '10:15:00', '12:15:00'),  -- BDD - OUEDRAOGO - A101
(2, 2, 2, 1, 'vendredi', '08:00:00', '10:00:00'),  -- BDD - OUEDRAOGO - A101
(2, 8, 1, 3, 'vendredi', '14:00:00', '16:00:00'),  -- Gestion Projet - BERE - B201
(2, 1, 1, 5, 'samedi',   '08:00:00', '10:00:00'),  -- Dev Web - BERE - Labo
(2, 5, 4, 2, 'samedi',   '10:15:00', '12:15:00');  -- Sécu - SANOU - A102

-- ============================================================
-- CRÉNEAUX - L3-RST semaine du 06 avril (et_id=3)
-- ============================================================
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES
(3, 8, 1, 6, 'lundi',    '08:00:00', '10:00:00'),  -- Gestion Projet - BERE - Amphi
(3, 5, 4, 1, 'lundi',    '10:15:00', '12:15:00'),  -- Sécu - SANOU - A101
(3, 4, 3, 3, 'lundi',    '14:00:00', '16:00:00'),  -- Réseaux - KABORE - B201
(3, 7, 7, 5, 'mardi',    '08:00:00', '10:00:00'),  -- Sys Exp - COMPAORE - Labo
(3, 6, 6, 3, 'mardi',    '10:15:00', '12:15:00'),  -- Maths - ZONGO - B201
(3, 1, 1, 5, 'mercredi', '08:00:00', '10:00:00'),  -- Dev Web - BERE - Labo
(3, 2, 2, 1, 'mercredi', '10:15:00', '12:15:00'),  -- BDD - OUEDRAOGO - A101
(3, 3, 5, 1, 'jeudi',    '08:00:00', '10:00:00'),  -- Algo - TRAORE - A101
(3, 8, 1, 6, 'jeudi',    '14:00:00', '16:00:00'),  -- Gestion Projet - BERE - Amphi
(3, 4, 3, 3, 'vendredi', '08:00:00', '10:00:00'),  -- Réseaux - KABORE - B201
(3, 5, 4, 2, 'vendredi', '10:15:00', '12:15:00'),  -- Sécu - SANOU - A102
(3, 6, 6, 3, 'samedi',   '08:00:00', '10:00:00'),  -- Maths - ZONGO - B201
(3, 7, 7, 5, 'samedi',   '10:15:00', '12:15:00');  -- Sys Exp - COMPAORE - Labo

-- ============================================================
-- CRÉNEAUX - M1-RST semaine du 06 avril (et_id=4)
-- ============================================================
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES
(4, 5, 4, 6, 'lundi',    '08:00:00', '10:00:00'),  -- Sécu - SANOU - Amphi
(4, 4, 3, 6, 'lundi',    '10:15:00', '12:15:00'),  -- Réseaux - KABORE - Amphi
(4, 8, 1, 6, 'lundi',    '14:00:00', '16:00:00'),  -- Gestion Projet - BERE - Amphi
(4, 7, 7, 5, 'mardi',    '08:00:00', '10:00:00'),  -- Sys Exp - COMPAORE - Labo
(4, 6, 6, 3, 'mardi',    '10:15:00', '12:15:00'),  -- Maths - ZONGO - B201
(4, 5, 4, 6, 'mercredi', '08:00:00', '10:00:00'),  -- Sécu - SANOU - Amphi
(4, 8, 1, 6, 'mercredi', '10:15:00', '12:15:00'),  -- Gestion Projet - BERE - Amphi
(4, 4, 3, 3, 'jeudi',    '08:00:00', '10:00:00'),  -- Réseaux - KABORE - B201
(4, 7, 7, 5, 'jeudi',    '10:15:00', '12:15:00'),  -- Sys Exp - COMPAORE - Labo
(4, 4, 3, 3, 'vendredi', '08:00:00', '10:00:00'),  -- Réseaux - KABORE - B201
(4, 5, 4, 6, 'vendredi', '14:00:00', '16:00:00'),  -- Sécu - SANOU - Amphi
(4, 6, 6, 3, 'samedi',   '08:00:00', '10:00:00'),  -- Maths - ZONGO - B201
(4, 8, 1, 6, 'samedi',   '10:15:00', '12:15:00');  -- Gestion Projet - BERE - Amphi

-- ============================================================
-- CRÉNEAUX - L1-RST semaine du 13 avril (et_id=5)
-- ============================================================
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES
(5, 1, 1, 5, 'lundi',    '08:00:00', '10:00:00'),
(5, 2, 2, 1, 'lundi',    '10:15:00', '12:15:00'),
(5, 4, 3, 2, 'lundi',    '14:00:00', '16:00:00'),
(5, 3, 5, 1, 'mardi',    '08:00:00', '10:00:00'),
(5, 6, 6, 3, 'mardi',    '10:15:00', '12:15:00'),
(5, 8, 1, 3, 'mardi',    '14:00:00', '16:00:00'),
(5, 5, 4, 1, 'mercredi', '08:00:00', '10:00:00'),
(5, 7, 7, 5, 'mercredi', '10:15:00', '12:15:00'),
(5, 1, 1, 5, 'jeudi',    '08:00:00', '10:00:00'),
(5, 2, 2, 1, 'jeudi',    '10:15:00', '12:15:00'),
(5, 5, 4, 2, 'jeudi',    '14:00:00', '16:00:00'),
(5, 2, 2, 1, 'vendredi', '08:00:00', '10:00:00'),
(5, 4, 3, 3, 'vendredi', '10:15:00', '12:15:00'),
(5, 3, 5, 1, 'vendredi', '14:00:00', '16:00:00'),
(5, 6, 6, 3, 'samedi',   '08:00:00', '10:00:00'),
(5, 7, 7, 5, 'samedi',   '10:15:00', '12:15:00');

-- ============================================================
-- CRÉNEAUX - L2-RST semaine du 13 avril (et_id=6)
-- ============================================================
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES
(6, 1, 1, 5, 'lundi',    '10:15:00', '12:15:00'),
(6, 4, 3, 3, 'lundi',    '14:00:00', '16:00:00'),
(6, 5, 4, 2, 'mardi',    '08:00:00', '10:00:00'),
(6, 6, 6, 3, 'mardi',    '10:15:00', '12:15:00'),
(6, 3, 5, 1, 'mercredi', '08:00:00', '10:00:00'),
(6, 7, 7, 5, 'mercredi', '14:00:00', '16:00:00'),
(6, 4, 3, 3, 'jeudi',    '08:00:00', '10:00:00'),
(6, 2, 2, 1, 'jeudi',    '10:15:00', '12:15:00'),
(6, 2, 2, 1, 'vendredi', '08:00:00', '10:00:00'),
(6, 8, 1, 3, 'vendredi', '14:00:00', '16:00:00'),
(6, 1, 1, 5, 'samedi',   '08:00:00', '10:00:00'),
(6, 5, 4, 2, 'samedi',   '10:15:00', '12:15:00');

-- ============================================================
-- CRÉNEAUX - L3-RST semaine du 13 avril (et_id=7)
-- ============================================================
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES
(7, 8, 1, 6, 'lundi',    '08:00:00', '10:00:00'),
(7, 5, 4, 1, 'lundi',    '10:15:00', '12:15:00'),
(7, 4, 3, 3, 'lundi',    '14:00:00', '16:00:00'),
(7, 7, 7, 5, 'mardi',    '08:00:00', '10:00:00'),
(7, 6, 6, 3, 'mardi',    '10:15:00', '12:15:00'),
(7, 1, 1, 5, 'mercredi', '08:00:00', '10:00:00'),
(7, 2, 2, 1, 'mercredi', '10:15:00', '12:15:00'),
(7, 3, 5, 1, 'jeudi',    '08:00:00', '10:00:00'),
(7, 8, 1, 6, 'jeudi',    '14:00:00', '16:00:00'),
(7, 4, 3, 3, 'vendredi', '08:00:00', '10:00:00'),
(7, 5, 4, 2, 'vendredi', '10:15:00', '12:15:00'),
(7, 6, 6, 3, 'samedi',   '08:00:00', '10:00:00'),
(7, 7, 7, 5, 'samedi',   '10:15:00', '12:15:00');

-- ============================================================
-- CRÉNEAUX - M1-RST semaine du 13 avril (et_id=8)
-- ============================================================
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES
(8, 5, 4, 6, 'lundi',    '08:00:00', '10:00:00'),
(8, 4, 3, 6, 'lundi',    '10:15:00', '12:15:00'),
(8, 8, 1, 6, 'lundi',    '14:00:00', '16:00:00'),
(8, 7, 7, 5, 'mardi',    '08:00:00', '10:00:00'),
(8, 6, 6, 3, 'mardi',    '10:15:00', '12:15:00'),
(8, 5, 4, 6, 'mercredi', '08:00:00', '10:00:00'),
(8, 8, 1, 6, 'mercredi', '10:15:00', '12:15:00'),
(8, 4, 3, 3, 'jeudi',    '08:00:00', '10:00:00'),
(8, 7, 7, 5, 'jeudi',    '10:15:00', '12:15:00'),
(8, 4, 3, 3, 'vendredi', '08:00:00', '10:00:00'),
(8, 5, 4, 6, 'vendredi', '14:00:00', '16:00:00'),
(8, 6, 6, 3, 'samedi',   '08:00:00', '10:00:00'),
(8, 8, 1, 6, 'samedi',   '10:15:00', '12:15:00');

-- ============================================================
-- POINTAGES de démonstration (semaine du 6 avril)
-- ============================================================
INSERT INTO pointages (id_creneau, heure_pointage_reelle, ip_source, statut)
SELECT c.id,
  CASE FLOOR(RAND()*4)
    WHEN 0 THEN ADDTIME(c.heure_debut, '00:12:00')
    WHEN 1 THEN ADDTIME(c.heure_debut, '00:05:00')
    ELSE c.heure_debut
  END,
  CONCAT('192.168.1.', FLOOR(100 + RAND()*50)),
  CASE FLOOR(RAND()*5)
    WHEN 0 THEN 'retard'
    ELSE 'valide'
  END
FROM creneaux c
JOIN emploi_temps et ON c.id_emploi_temps = et.id
WHERE et.semaine_debut = '2026-04-06';

-- ============================================================
-- CAHIERS DE TEXTE de démonstration (semaine du 6 avril)
-- ============================================================
INSERT INTO cahiers_texte (id_creneau, id_delegue, titre_cours, contenu_json, heure_fin_reelle, statut)
SELECT
  p.id_creneau,
  7, -- délégué L1-RST
  CONCAT('Cours - ', m.libelle),
  JSON_OBJECT(
    'points_vus', JSON_ARRAY(CONCAT('Introduction à ', m.libelle), 'Concepts fondamentaux', 'Exercices pratiques'),
    'niveau_avancement', 'Chapitre 2',
    'observations', 'Bonne participation'
  ),
  ADDTIME(c.heure_fin, '-00:05:00'),
  ELT(FLOOR(1 + RAND()*3), 'cloture', 'signe_delegue', 'brouillon')
FROM pointages p
JOIN creneaux c ON p.id_creneau = c.id
JOIN emploi_temps et ON c.id_emploi_temps = et.id
JOIN matieres m ON c.id_matiere = m.id
WHERE et.semaine_debut = '2026-04-06' AND et.id_classe = 1
LIMIT 10;

-- ============================================================
-- VACATIONS de démonstration (mars 2026)
-- ============================================================
INSERT INTO vacations (id_enseignant, mois, annee, montant_brut, montant_net, retenues, statut) VALUES
(1, 3, 2026, 150000.00, 127500.00, 22500.00, 'validee_comptable'),
(2, 3, 2026,  80000.00,  68000.00, 12000.00, 'visee_surveillant'),
(3, 3, 2026,  60000.00,  51000.00,  9000.00, 'signee_enseignant'),
(4, 3, 2026,  75000.00,  63750.00, 11250.00, 'validee_comptable'),
(5, 3, 2026,  55000.00,  46750.00,  8250.00, 'generee'),
(1, 4, 2026,  90000.00,  76500.00, 13500.00, 'generee'),
(2, 4, 2026,  40000.00,  34000.00,  6000.00, 'generee');

-- ============================================================
-- LOGS D'ACTIVITÉ
-- ============================================================
INSERT INTO logs_activite (id_utilisateur, action, details_json, ip) VALUES
(1, 'connexion',              '{"email":"admin@eduschedule.pro"}',   '127.0.0.1'),
(1, 'creation_emploi_temps',  '{"classe":"L1-RST","semaine":"2026-04-06"}', '127.0.0.1'),
(1, 'creation_emploi_temps',  '{"classe":"L2-RST","semaine":"2026-04-06"}', '127.0.0.1'),
(1, 'creation_emploi_temps',  '{"classe":"L1-RST","semaine":"2026-04-13"}', '127.0.0.1'),
(1, 'creation_emploi_temps',  '{"classe":"L2-RST","semaine":"2026-04-13"}', '127.0.0.1'),
(1, 'publication_emploi_temps','{"id_emploi_temps":1}',              '127.0.0.1'),
(1, 'publication_emploi_temps','{"id_emploi_temps":5}',              '127.0.0.1'),
(2, 'connexion',              '{"email":"cedric.bere@isge.edu"}',    '192.168.1.10'),
(7, 'connexion',              '{"email":"delegue.l1@isge.edu"}',     '192.168.1.20'),
(7, 'saisie_cahier_texte',    '{"id_cahier":1}',                     '192.168.1.20'),
(9, 'connexion',              '{"email":"surveillant@isge.edu"}',    '192.168.1.30'),
(10,'connexion',              '{"email":"comptable@isge.edu"}',      '192.168.1.31');

SET FOREIGN_KEY_CHECKS = 1;

-- Vérification finale
SELECT et.id, cl.code AS classe, et.semaine_debut, et.statut_publication,
       COUNT(c.id) AS nb_creneaux
FROM emploi_temps et
JOIN classes cl ON et.id_classe = cl.id
LEFT JOIN creneaux c ON c.id_emploi_temps = et.id
GROUP BY et.id, cl.code, et.semaine_debut, et.statut_publication
ORDER BY et.semaine_debut, cl.code;
