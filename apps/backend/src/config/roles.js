/**
 * MATRIZ DE ROLES Y PERMISOS (RBAC).
 *
 * Fuente unica de verdad para toda la autorizacion del sistema.
 * Regla: deny by default. Si un permiso no esta listado aqui, no existe.
 *
 * Convencion del permiso: <recurso>:<accion>[:<alcance>]
 *   alcance `own`  -> solo sobre recursos cuyo user_id coincide con el del token
 *   alcance `any`  -> sobre recursos de cualquier usuario
 *
 * OJO (OWASP A01): tener el permiso `trip:read:own` NO basta. El repositorio
 * DEBE filtrar por user_id en el WHERE. El permiso autoriza la accion; la
 * consulta autoriza el objeto. Los dos controles son obligatorios.
 */
const PERMISSIONS = {
  // Descubrimiento (APIs externas)
  FLIGHT_SEARCH: 'flight:search',
  STAY_SEARCH: 'stay:search',
  EXPERIENCE_SEARCH: 'experience:search',

  // Viajes e itinerario
  TRIP_CREATE: 'trip:create',
  TRIP_READ_OWN: 'trip:read:own',
  TRIP_READ_ANY: 'trip:read:any',
  TRIP_UPDATE_OWN: 'trip:update:own',
  TRIP_DELETE_OWN: 'trip:delete:own',
  TRIP_DELETE_ANY: 'trip:delete:any',

  // Presupuesto
  BUDGET_READ_OWN: 'budget:read:own',
  BUDGET_UPDATE_OWN: 'budget:update:own',

  // Cuenta propia
  PROFILE_READ_OWN: 'profile:read:own',
  PROFILE_UPDATE_OWN: 'profile:update:own',

  // Administracion
  USER_READ_ANY: 'user:read:any',
  USER_UPDATE_ROLE: 'user:update:role',
  USER_SUSPEND: 'user:suspend',
  AUDIT_READ: 'audit:read',
  METRICS_READ: 'metrics:read',
  CACHE_PURGE: 'cache:purge',
};

const P = PERMISSIONS;

const TRAVELER_PERMISSIONS = [
  P.FLIGHT_SEARCH, P.STAY_SEARCH, P.EXPERIENCE_SEARCH,
  P.TRIP_CREATE, P.TRIP_READ_OWN, P.TRIP_UPDATE_OWN, P.TRIP_DELETE_OWN,
  P.BUDGET_READ_OWN, P.BUDGET_UPDATE_OWN,
  P.PROFILE_READ_OWN, P.PROFILE_UPDATE_OWN,
];

const ROLES = {
  /**
   * TRAVELER: usuario final. Solo puede tocar sus propios recursos.
   * Es el rol que se asigna SIEMPRE en el registro; el rol nunca se acepta
   * desde el body de /register (escalada de privilegios por mass assignment).
   */
  traveler: {
    label: 'Viajero',
    permissions: TRAVELER_PERMISSIONS,
  },
  /**
   * ADMIN: backoffice. Gestiona usuarios, revisa bitacora y salud del sistema.
   * NO hereda permisos `own` de otros usuarios por diseno: para ver un viaje
   * ajeno usa TRIP_READ_ANY, que queda registrado en audit_log.
   * Solo se crea por seed o por otro admin. No hay auto-registro de admin.
   */
  admin: {
    label: 'Administrador',
    permissions: [
      ...TRAVELER_PERMISSIONS,
      P.TRIP_READ_ANY, P.TRIP_DELETE_ANY,
      P.USER_READ_ANY, P.USER_UPDATE_ROLE, P.USER_SUSPEND,
      P.AUDIT_READ, P.METRICS_READ, P.CACHE_PURGE,
    ],
  },
};

/**
 * Visitante no autenticado. No es un rol en base de datos: es la ausencia de
 * sesion. Solo se le permite lectura de descubrimiento, con un rate limit
 * mas estricto, para que la landing funcione sin obligar a registrarse.
 */
const GUEST_PERMISSIONS = [P.FLIGHT_SEARCH, P.STAY_SEARCH, P.EXPERIENCE_SEARCH];

const permissionsFor = (role) => ROLES[role]?.permissions ?? GUEST_PERMISSIONS;
const roleExists = (role) => Object.hasOwn(ROLES, role);

module.exports = { PERMISSIONS, ROLES, GUEST_PERMISSIONS, permissionsFor, roleExists, ROLE_NAMES: Object.keys(ROLES) };
