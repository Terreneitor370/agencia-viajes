-- =====================================================================
-- Datos semilla para desarrollo y para el escaneo DAST.
--
-- OJO: estas credenciales son EXCLUSIVAS de desarrollo local. Nunca deben
-- existir en un entorno accesible desde internet.
--   admin@agencia.local   / Admin.Demo.2026!
--   viajero@agencia.local / Viajero.Demo.2026!
--   otro@agencia.local    / Otro.Demo.2026!
-- Genera tus propios hashes con:  node -e "console.log(require('bcryptjs').hashSync('TuClave',12))"
-- =====================================================================
USE agencia_viajes;

INSERT IGNORE INTO users (id, name, email, password_hash, role, status) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Administrador Demo', 'admin@agencia.local',
   '$2a$12$yBV9ot79c7N5QTXe6ngLDO34.NAexAPHpsJ8fP9YYyiNxZY4fAmzW', 'admin', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'Viajero Demo', 'viajero@agencia.local',
   '$2a$12$YaHk9a8Eei1ZDIGn8wLkce/h/5qYTY4RLWLRPB5dJ4L9SIfEzedoi', 'traveler', 'active');

-- Segundo viajero: existe para poder PROBAR el control de acceso.
-- El caso de prueba obligatorio es: iniciar sesion como "viajero" e intentar
-- leer el viaje de "otro". La respuesta correcta es 404, no 403 ni 200.
INSERT IGNORE INTO users (id, name, email, password_hash, role, status) VALUES
  ('33333333-3333-4333-8333-333333333333', 'Otro Viajero', 'otro@agencia.local',
   '$2a$12$bk/s26C/YWuvuf326DeiLO3/irBIezYghpkW1xFv38pLrvjqCh7mS', 'traveler', 'active');

INSERT IGNORE INTO trips (id, user_id, title, origin_city, destination_city, start_date, end_date, travelers, currency, budget_limit) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222',
   'Cancun con amigos', 'Ciudad de Mexico', 'Cancun', '2026-09-12', '2026-09-17', 4, 'MXN', 60000.00),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '33333333-3333-4333-8333-333333333333',
   'Viaje privado de otro usuario', 'Guadalajara', 'Oaxaca', '2026-10-01', '2026-10-05', 2, 'MXN', 25000.00);
