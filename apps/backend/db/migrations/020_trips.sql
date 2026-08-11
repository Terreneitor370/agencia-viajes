-- =====================================================================
-- 020_trips.sql  |  DUENO: integrante C (Viajes, Experiencias y Presupuesto)
-- =====================================================================
USE agencia_viajes;

CREATE TABLE IF NOT EXISTS trips (
  id                CHAR(36)     NOT NULL PRIMARY KEY,
  user_id           CHAR(36)     NOT NULL,
  title             VARCHAR(120) NOT NULL,
  origin_city       VARCHAR(80)  NOT NULL,
  destination_city  VARCHAR(80)  NOT NULL,
  start_date        DATE         NOT NULL,
  end_date          DATE         NOT NULL,
  travelers         TINYINT UNSIGNED NOT NULL DEFAULT 1,
  currency          ENUM('MXN','USD','EUR') NOT NULL DEFAULT 'MXN',
  budget_limit      DECIMAL(12,2) NULL,
  status            ENUM('draft','planned','archived') NOT NULL DEFAULT 'draft',
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        DATETIME     NULL,
  -- Indice compuesto: TODAS las consultas de viajes filtran por user_id.
  KEY idx_trips_user (user_id, deleted_at, created_at),
  CONSTRAINT fk_trips_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_trips_dates CHECK (end_date > start_date),
  CONSTRAINT chk_trips_travelers CHECK (travelers BETWEEN 1 AND 20)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS trip_items (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  trip_id          CHAR(36)     NOT NULL,
  type             ENUM('flight','stay','experience','other') NOT NULL,
  provider         VARCHAR(40)  NOT NULL,
  external_id      VARCHAR(120) NULL,
  title            VARCHAR(160) NOT NULL,
  -- El dinero se guarda en centavos, como entero. Nunca FLOAT.
  unit_price_cents BIGINT       NOT NULL DEFAULT 0,
  currency         ENUM('MXN','USD','EUR') NOT NULL DEFAULT 'MXN',
  -- Determina como escala el precio con la cantidad de viajeros.
  pricing_mode     ENUM('per_person','per_group','per_night_per_room','per_person_per_day') NOT NULL,
  quantity         SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  estimated        BOOLEAN      NOT NULL DEFAULT FALSE,
  meta             JSON         NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_items_trip (trip_id),
  CONSTRAINT fk_items_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB;
