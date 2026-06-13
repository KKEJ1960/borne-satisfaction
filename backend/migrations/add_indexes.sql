-- Migration : ajout d'index de performance sur la table avis
-- À exécuter une seule fois sur une base existante (setup.sql les inclut déjà)
-- Usage : mysql -u hotel_app -p hotel_satisfaction < backend/migrations/add_indexes.sql

USE hotel_satisfaction;

-- Ignore les erreurs si l'index existe déjà (idempotent)
DROP PROCEDURE IF EXISTS add_index_if_not_exists;

DELIMITER $$
CREATE PROCEDURE add_index_if_not_exists(
  IN tbl VARCHAR(64),
  IN idx VARCHAR(64),
  IN col VARCHAR(64)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = tbl
      AND INDEX_NAME   = idx
  ) THEN
    SET @sql = CONCAT('CREATE INDEX ', idx, ' ON ', tbl, '(', col, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$
DELIMITER ;

CALL add_index_if_not_exists('avis', 'idx_avis_date',        'date');
CALL add_index_if_not_exists('avis', 'idx_avis_archived',    'archived');
CALL add_index_if_not_exists('avis', 'idx_avis_departement', 'departement');
CALL add_index_if_not_exists('avis', 'idx_avis_client_id',   'client_id');

DROP PROCEDURE IF EXISTS add_index_if_not_exists;

SELECT 'Index ajoutés avec succès.' AS status;
