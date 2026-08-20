-- =====================================================================
-- 040_payments.sql  |  DUENO: Kassie (modulo B - pagos)
-- =====================================================================
USE agencia_viajes;

CREATE TABLE IF NOT EXISTS orders (
  id                    CHAR(36)     NOT NULL PRIMARY KEY,
  user_id               CHAR(36)     NOT NULL,
  trip_id               CHAR(36)     NOT NULL,
  stripe_session_id     VARCHAR(255) NULL,
  stripe_payment_intent VARCHAR(255) NULL,
  status                ENUM('pending','paid','failed','cancelled','refunded') NOT NULL DEFAULT 'pending',
  total_cents           BIGINT       NOT NULL DEFAULT 0,
  currency              ENUM('MXN','USD','EUR') NOT NULL DEFAULT 'MXN',
  item_count            SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_orders_user (user_id, created_at),
  KEY idx_orders_trip (trip_id),
  KEY idx_orders_stripe_session (stripe_session_id),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  order_id        CHAR(36)     NOT NULL,
  trip_item_id    CHAR(36)     NOT NULL,
  title           VARCHAR(160) NOT NULL,
  unit_price_cents BIGINT      NOT NULL DEFAULT 0,
  quantity        SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  subtotal_cents  BIGINT       NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_order_items_order (order_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_trip_item FOREIGN KEY (trip_item_id) REFERENCES trip_items(id) ON DELETE CASCADE
) ENGINE=InnoDB;
