-- =====================================================================
-- 040_quotes.sql  |  DUENO: Kassie (modulo B)
-- ---------------------------------------------------------------------
-- Cotizaciones de invitado (guardar vuelo/hospedaje SIN iniciar sesion).
-- `guest_token` es la llave de propiedad: quien conoce el token accede a
-- esas cotizaciones (como una lista de deseos por link). Un mismo token
-- agrupa varios elementos. Sin FK a users: no hay sesion.
-- =====================================================================
USE agencia_viajes;

CREATE TABLE IF NOT EXISTS quotes (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  guest_token      CHAR(64)     NOT NULL,
  type             ENUM('flight','stay','experience','other') NOT NULL,
  provider         VARCHAR(40)  NOT NULL,
  external_id      VARCHAR(120) NULL,
  title            VARCHAR(160) NOT NULL,
  unit_price_cents BIGINT       NOT NULL DEFAULT 0,
  currency         ENUM('MXN','USD','EUR') NOT NULL DEFAULT 'MXN',
  pricing_mode     ENUM('per_person','per_group','per_night_per_room','per_person_per_day') NOT NULL,
  quantity         SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  estimated        BOOLEAN      NOT NULL DEFAULT FALSE,
  meta             JSON         NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_quotes_token (guest_token, created_at)
) ENGINE=InnoDB;
