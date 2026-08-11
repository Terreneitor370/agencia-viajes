/**
 * Pruebas de la matriz de control de acceso (OWASP A01).
 *
 * Estas pruebas NO necesitan base de datos: verifican que la matriz de permisos
 * este bien definida. Son la red de seguridad contra el error mas caro posible:
 * que alguien agregue un permiso de admin a la lista del viajero sin notarlo.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ROLES, PERMISSIONS: P, permissionsFor } = require('../../src/config/roles');

test('el viajero NO tiene ningun permiso de alcance "any"', () => {
  const anyScoped = ROLES.traveler.permissions.filter((p) => p.endsWith(':any'));
  assert.deepEqual(anyScoped, [], `El rol viajero no debe tener permisos globales: ${anyScoped}`);
});

test('el viajero NO puede administrar usuarios ni leer la bitacora', () => {
  const prohibidos = [P.USER_READ_ANY, P.USER_UPDATE_ROLE, P.USER_SUSPEND, P.AUDIT_READ, P.CACHE_PURGE];
  for (const permiso of prohibidos) {
    assert.equal(ROLES.traveler.permissions.includes(permiso), false, `viajero no debe tener ${permiso}`);
  }
});

test('el administrador puede leer la bitacora y gestionar roles', () => {
  assert.ok(ROLES.admin.permissions.includes(P.AUDIT_READ));
  assert.ok(ROLES.admin.permissions.includes(P.USER_UPDATE_ROLE));
});

test('un rol inexistente cae a permisos de invitado, nunca a permisos de admin', () => {
  const permisos = permissionsFor('superusuario-inventado');
  assert.equal(permisos.includes(P.USER_READ_ANY), false);
  assert.equal(permisos.includes(P.TRIP_CREATE), false);
});

test('no existen permisos duplicados en ningun rol', () => {
  for (const [nombre, rol] of Object.entries(ROLES)) {
    assert.equal(new Set(rol.permissions).size, rol.permissions.length, `El rol ${nombre} tiene permisos duplicados`);
  }
});
