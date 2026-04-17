-- ============================================================
-- EduSchedule Pro - Emploi du temps semaine du 13 avril 2026
-- À importer après eduschedule_pro.sql
-- ============================================================

USE eduschedule_pro;
SET FOREIGN_KEY_CHECKS = 0;

-- Emploi du temps pour la semaine du 13 avril 2026
INSERT INTO emploi_temps (id_classe, semaine_debut, statut_publication, cree_par) VALUES
(1, '2026-04-13', 'publie', 1),   -- L1-RST  -> id = 4
(2, '2026-04-13', 'publie', 1),   -- L2-RST  -> id = 5
(3, '2026-04-13', 'brouillon', 1); -- L3-RST -> id = 6

-- Créneaux L1-RST semaine du 13 avril (reprend le même planning)
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES
-- Lundi 13
(4, 1, 1, 5, 'lundi', '08:00:00', '10:00:00'),   -- Dev Web - BERE - Labo
(4, 2, 2, 1, 'lundi', '10:15:00', '12:15:00'),   -- BDD - OUEDRAOGO - A101
(4, 4, 3, 2, 'lundi', '14:00:00', '16:00:00'),   -- Réseaux - KABORE - A102
-- Mardi 14
(4, 3, 5, 1, 'mardi', '08:00:00', '10:00:00'),   -- Algo - TRAORE - A101
(4, 6, 6, 3, 'mardi', '10:15:00', '12:15:00'),   -- Maths - ZONGO - B201
(4, 5, 4, 2, 'mardi', '14:00:00', '16:00:00'),   -- Sécu - SANOU - A102
-- Mercredi 15
(4, 5, 4, 1, 'mercredi', '08:00:00', '10:00:00'),  -- Sécu - SANOU - A101
(4, 7, 7, 5, 'mercredi', '10:15:00', '12:15:00'),  -- Sys Exp - COMPAORE - Labo
-- Jeudi 16
(4, 1, 1, 5, 'jeudi', '08:00:00', '10:00:00'),   -- Dev Web - BERE - Labo
(4, 2, 2, 1, 'jeudi', '10:15:00', '12:15:00'),   -- BDD - OUEDRAOGO - A101
(4, 4, 3, 2, 'jeudi', '14:00:00', '16:00:00'),   -- Réseaux - KABORE - A102
-- Vendredi 17
(4, 2, 2, 1, 'vendredi', '08:00:00', '10:00:00'),  -- BDD - OUEDRAOGO - A101
(4, 8, 1, 3, 'vendredi', '10:15:00', '12:15:00'),  -- Gestion Projet - BERE - B201
-- Samedi 18
(4, 3, 5, 1, 'samedi', '08:00:00', '10:00:00'),  -- Algo - TRAORE - A101
(4, 6, 6, 3, 'samedi', '10:15:00', '12:15:00');  -- Maths - ZONGO - B201

-- Créneaux L2-RST semaine du 13 avril
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES
(5, 1, 1, 5, 'lundi', '10:15:00', '12:15:00'),   -- Dev Web
(5, 5, 4, 2, 'mardi', '08:00:00', '10:00:00'),   -- Sécu
(5, 3, 5, 1, 'mercredi', '08:00:00', '10:00:00'), -- Algo
(5, 3, 5, 1, 'mercredi', '14:00:00', '16:00:00'), -- Algo (suite)
(5, 4, 3, 3, 'jeudi', '08:00:00', '10:00:00'),   -- Réseaux
(5, 4, 3, 3, 'jeudi', '14:00:00', '16:00:00'),   -- Réseaux (suite)
(5, 2, 2, 1, 'vendredi', '08:00:00', '10:00:00'), -- BDD
(5, 2, 2, 1, 'vendredi', '14:00:00', '16:00:00'), -- BDD (suite)
(5, 7, 7, 5, 'samedi', '08:00:00', '10:00:00');  -- Sys Exp

SET FOREIGN_KEY_CHECKS = 1;
