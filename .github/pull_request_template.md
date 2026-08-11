## Qué hace este PR

<!-- Una o dos frases -->

## Módulo

- [ ] A · Identidad, Acceso y Administración
- [ ] B · Descubrimiento (vuelos y hospedaje)
- [ ] C · Viajes, Experiencias y Presupuesto
- [ ] `core` / configuración compartida ⚠️ requiere aprobación de los tres

## Checklist de seguridad

- [ ] Cero `console.log` — se usa `core/logger`
- [ ] Toda ruta nueva declara `authenticate` y `authorize(...)`, o abajo explico por qué es pública
- [ ] Toda entrada tiene esquema Zod `.strict()`
- [ ] Cero SQL concatenado, cero `SELECT *`, filtro por `user_id` en datos de usuario
- [ ] Ningún secreto en el código ni en el frontend
- [ ] `npm run lint` y `npm test` pasan

## Endpoints públicos (si los hay) y por qué

<!-- ej. GET /flights/search: la landing debe funcionar sin registro. Protegido con optionalAuth + externalApiLimiter. -->

## Cómo probarlo

1.
2.
