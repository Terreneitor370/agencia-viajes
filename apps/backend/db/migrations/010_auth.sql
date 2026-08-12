-- =====================================================================
-- 010_auth.sql  |  DUENO: Isa (modulo A)
-- Solo esta persona modifica este archivo.
-- =====================================================================
USE agencia_viajes;

CREATE TABLE IF NOT EXISTS users (
  id                  CHAR(36)      NOT NULL PRIMARY KEY,
  name                VARCHAR(80)   NOT NULL,
  email               VARCHAR(160)  NOT NULL,
  -- NULL cuando el usuario solo entra con Google (no tiene contrasena local).
  password_hash       VARCHAR(72)   NULL,
  -- Identificador estable de Google. Se vincula por `sub`, NUNCA por correo:
  -- el correo puede cambiar de dueno, el sub no.
  google_sub          VARCHAR(64)   NULL,
  role                ENUM('traveler','admin') NOT NULL DEFAULT 'traveler',
  status              ENUM('active','suspended') NOT NULL DEFAULT 'active',
  home_city           VARCHAR(80)   NULL,
  preferred_currency  ENUM('MXN','USD','EUR') NOT NULL DEFAULT 'MXN',
  avatar_url          VARCHAR(255)  NULL,
  failed_attempts     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until        DATETIME      NULL,
  password_changed_at DATETIME      NULL,
  last_login_at       DATETIME      NULL,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_google_sub (google_sub)
) ENGINE=InnoDB;

-- Refresh tokens. Se guarda el SHA-256, nunca el token en claro:
-- si alguien roba un respaldo de la base, no obtiene sesiones utilizables.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  user_id     CHAR(36)     NOT NULL,
  token_hash  CHAR(64)     NOT NULL,
  -- Todas las rotaciones de una misma sesion comparten family_id. Si se detecta
  -- reuso de un token ya canjeado, se revoca la familia completa.
  family_id   CHAR(36)     NOT NULL,
  expires_at  DATETIME     NOT NULL,
  used_at     DATETIME     NULL,
  revoked_at  DATETIME     NULL,
  replaced_by CHAR(36)     NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_refresh_hash (token_hash),
  KEY idx_refresh_user (user_id),
  KEY idx_refresh_family (family_id),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Bitacora de auditoria (OWASP A09). Append-only por convencion: la aplicacion
-- solo hace INSERT y SELECT. Nunca UPDATE ni DELETE.
CREATE TABLE IF NOT EXISTS audit_log (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_id       CHAR(36)     NULL,
  action         VARCHAR(64)  NOT NULL,
  entity         VARCHAR(40)  NULL,
  entity_id      VARCHAR(64)  NULL,
  ip             VARCHAR(45)  NULL,
  user_agent     VARCHAR(255) NULL,
  correlation_id CHAR(36)     NULL,
  meta           JSON         NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_actor (actor_id),
  KEY idx_audit_action (action),
  KEY idx_audit_created (created_at)
) ENGINE=InnoDB;
