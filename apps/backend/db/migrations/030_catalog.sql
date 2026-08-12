-- =====================================================================
-- 030_catalog.sql  |  DUENO: Kassie (modulo B)
-- =====================================================================
USE agencia_viajes;

-- Cache persistente de respuestas de proveedores externos.
-- Existe por una razon muy concreta: la cuota gratuita de Geoapify son 3000
-- creditos al dia y somos 3 personas desarrollando contra la misma clave.
-- Sin cache, la cuota se agota antes del mediodia.
CREATE TABLE IF NOT EXISTS external_cache (
  cache_key   CHAR(64)     NOT NULL PRIMARY KEY,  -- SHA-256 de provider + parametros
  provider    VARCHAR(40)  NOT NULL,
  payload     JSON         NOT NULL,
  expires_at  DATETIME     NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_cache_expires (expires_at)
) ENGINE=InnoDB;

-- Busquedas recientes del usuario (para sugerencias y para la pantalla de inicio).
CREATE TABLE IF NOT EXISTS search_history (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id      CHAR(36)     NULL,
  search_type  ENUM('flight','stay','experience') NOT NULL,
  params       JSON         NOT NULL,
  results_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_history_user (user_id, created_at),
  CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
