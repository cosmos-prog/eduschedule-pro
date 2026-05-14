-- ============================================================
-- EduSchedule Pro – Jours fériés Burkina Faso 2025 & 2026
-- 11 jours chômés et payés officiels
-- ============================================================

-- Supprimer les doublons éventuels avant insertion
DELETE FROM jours_feries WHERE YEAR(date_ferie) IN (2025, 2026);

INSERT INTO jours_feries (date_ferie, libelle, recurrent) VALUES

-- ── 2025 ──────────────────────────────────────────────────
('2025-01-01', 'Jour de l\'An',                                           1),
('2025-03-08', 'Journée internationale des droits de la femme',           1),
('2025-03-30', 'Fin du Ramadan (Aïd el-Fitr)',                            0),
('2025-05-01', 'Fête du Travail',                                         1),
('2025-05-15', 'Journée des coutumes et traditions',                      1),
('2025-05-29', 'Ascension',                                               0),
('2025-06-06', 'Tabaski (Aïd el-Adha)',                                   0),
('2025-08-15', 'Assomption',                                              1),
('2025-09-04', 'Mouloud (Naissance du Prophète)',                         0),
('2025-12-11', 'Fête nationale',                                          1),
('2025-12-25', 'Noël',                                                    1),

-- ── 2026 ──────────────────────────────────────────────────
('2026-01-01', 'Jour de l\'An',                                           1),
('2026-03-08', 'Journée internationale des droits de la femme',           1),
('2026-03-20', 'Fin du Ramadan (Aïd el-Fitr)',                            0),
('2026-05-01', 'Fête du Travail',                                         1),
('2026-05-14', 'Ascension',                                               0),
('2026-05-15', 'Journée des coutumes et traditions',                      1),
('2026-05-27', 'Tabaski (Aïd el-Adha)',                                   0),
('2026-08-15', 'Assomption',                                              1),
('2026-08-25', 'Mouloud (Naissance du Prophète)',                         0),
('2026-12-11', 'Fête nationale',                                          1),
('2026-12-25', 'Noël',                                                    1);
