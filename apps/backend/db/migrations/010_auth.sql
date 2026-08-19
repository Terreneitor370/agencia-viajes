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
  -- NULL hasta que se verifica con el mismo desafio OTP de login_otp_challenges
  -- (al registrarse o, si no se completo entonces, en el primer login exitoso).
  email_verified_at   DATETIME      NULL,
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
  -- Soporta el futuro job de purga (WHERE expires_at < NOW()). Sin este indice
  -- esa consulta es table scan completo en cuanto la tabla crece.
  KEY idx_refresh_expires (expires_at),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  -- Autorreferencia: el token que reemplazo a este durante la rotacion. Sin
  -- este FK, la cadena de rotacion puede apuntar a un id que nunca existio.
  CONSTRAINT fk_refresh_replaced_by FOREIGN KEY (replaced_by) REFERENCES refresh_tokens(id) ON DELETE SET NULL
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
  KEY idx_audit_created (created_at),
  -- Mismo patron que search_history.user_id (030_catalog.sql): referencia
  -- opcional que sobrevive al actor. ON DELETE SET NULL, nunca CASCADE: la
  -- bitacora no puede perder el rastro solo porque el usuario se elimino.
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Codigo de un solo uso por correo (RF-A extendido, agosto 2026). Se abre en
-- tres casos: al registrarse (confirmar que el correo es de quien se
-- registro), en el siguiente login si esa verificacion nunca se completo, y
-- al pedir "olvide mi contrasena" (login_otp_challenges.user_id enlaza los
-- tres; el "para que" se infiere en el codigo, no se guarda aqui). Una
-- cuenta ya verificada entra solo con credenciales, el codigo no se vuelve a
-- pedir. El codigo nunca se guarda en claro: va con bcrypt (igual que
-- password_hash), NO sha256 como
-- refresh_tokens. Con solo 1,000,000 de combinaciones posibles un hash
-- rapido se rompe por fuerza bruta fuera de linea en milisegundos.
CREATE TABLE IF NOT EXISTS login_otp_challenges (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  user_id      CHAR(36)     NOT NULL,
  code_hash    VARCHAR(72)  NOT NULL,
  attempts     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at   DATETIME     NOT NULL,
  consumed_at  DATETIME     NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_otp_user (user_id),
  -- Soporta el mismo tipo de job de purga que refresh_tokens.
  KEY idx_otp_expires (expires_at),
  CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
