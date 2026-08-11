-- =====================================================================
-- 000_core.sql  |  DUENO: acordado el dia 0, NADIE lo edita despues.
-- Base de datos y convenciones comunes.
-- =====================================================================
CREATE DATABASE IF NOT EXISTS agencia_viajes
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE agencia_viajes;

-- Convenciones para todas las tablas del proyecto:
--   * Llave primaria CHAR(36) con UUID v4 generado en la aplicacion.
--     Motivo de seguridad: los IDs autoincrementales son enumerables. Con
--     /api/v1/trips/1, /trips/2, /trips/3 un atacante recorre la base entera.
--     Con UUID el ataque por enumeracion deja de ser viable.
--   * Nombres de columna en snake_case.
--   * created_at / updated_at en toda tabla de negocio.
--   * Borrado logico (deleted_at) donde el dato tenga valor historico.
