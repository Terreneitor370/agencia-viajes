# Estrategia de Seguridad — Agencia de Viajes

> Security by Design. Cada control está atado a un archivo concreto del repositorio.
> Si vas a modificar algo de `core/` o `middlewares/`, lee primero la sección correspondiente.

---

## 1. El principio que sostiene todo lo demás: puntos únicos de paso

Todo el diseño de seguridad de este backend descansa en una sola idea:

> **Todo el SQL pasa por `core/db.js`. Toda la salida HTTP pasa por `core/httpClient.js`. Toda la respuesta pasa por `core/respond.js`. Todo el error pasa por `middlewares/errorHandler.js`.**

Ningún módulo importa `mysql2` ni llama a `fetch` directamente.

Esto tiene una consecuencia que va mucho más allá del orden: para inspeccionar, registrar o bloquear **cualquier** comportamiento del sistema, basta con instrumentar cuatro archivos. Es exactamente lo que necesita un agente IAST o RASP, y es lo que hace que la sección 4 de este documento sea implementable en horas y no en semanas.

---

## 2. OWASP Top 10 (2021) — control por control

### A01 · Broken Access Control

El riesgo más probable en esta aplicación y el que más puntos vale demostrar.

- Matriz de permisos centralizada en `config/roles.js`, con denegación por defecto.
- La autorización se declara **en la ruta**, no dentro del controlador: `authorize(P.TRIP_READ_OWN)`. Así toda la matriz de acceso del sistema es auditable leyendo únicamente los archivos `*.routes.js`.
- **Anti-IDOR por diseño:** `trips.repository.js` no expone ninguna función que busque un viaje solo por `id`. `findByIdForUser(id, userId)` mete siempre el `user_id` en el `WHERE`. No se puede olvidar el filtro porque no existe la función sin filtro.
- Las llaves primarias son **UUID v4**, no enteros autoincrementales. Con `/trips/1`, `/trips/2`, `/trips/3` un atacante recorre la base entera; con UUID, la enumeración deja de ser viable.
- Un recurso ajeno responde **404, no 403**. Un 403 confirma que el recurso existe, y esa confirmación ya es una fuga de información.
- Los esquemas de entrada no aceptan `user_id`: siempre viene del token.

**Prueba obligatoria:** inicia sesión como `viajero@agencia.local` y pide el viaje `bbbbbbbb-...` (que pertenece a `otro@agencia.local`). Debe responder **404**.

### A02 · Cryptographic Failures

- Contraseñas con **bcrypt, 12 rondas** (`auth.service.js`). Nunca MD5, SHA-1 ni SHA-256 pelón.
- El refresh token se guarda **hasheado con SHA-256** (`auth.tokens.js`). Si alguien roba un respaldo de la base, no obtiene sesiones utilizables.
- Cookies `httpOnly` + `SameSite=Lax` + `Secure` en producción. **Cero tokens en `localStorage`:** cualquier XSS los leería en una línea.
- Todos los secretos en `.env`, validados al arrancar por `config/env.js`. El servidor **no arranca** si falta uno o si un secreto JWT tiene menos de 32 caracteres.

### A03 · Injection

- `pool.execute()` usa sentencias preparadas del lado de MySQL. Los valores nunca tocan la cadena SQL.
- `multipleStatements: false` en el pool: apilar `; DROP TABLE` es imposible aunque se cuele algo. (El script `scripts/migrate.js` lo habilita, pero es una herramienta administrativa que no corre en runtime.)
- Validación con Zod y `.strict()`: lo que no está en el esquema se descarta. Es lista blanca, no lista negra.
- `middlewares/validate.js` **reemplaza** `req.body`/`query`/`params` por la versión validada. El controlador es incapaz de leer datos sin validar.
- `middlewares/sanitize.js` elimina claves de prototipo (`__proto__`, `constructor`, `prototype`) y caracteres de control.
- **XSS:** React escapa por defecto. En este proyecto `dangerouslySetInnerHTML` está prohibido; si alguien lo necesita, se discute en PR. Complementado con CSP vía Helmet.
- Ninguna consulta se arma con concatenación ni con template literals. En `admin.routes.js`, incluso el comodín del `LIKE` se construye en JavaScript (`` `%${q}%` ``) y se pasa como parámetro.

### A04 · Insecure Design

- Límites de negocio explícitos en los esquemas: máximo 20 viajeros, 90 noches, 100 conceptos por viaje, 40 resultados por búsqueda. Sin ellos, `?travelers=999999` es un vector de agotamiento de recursos.
- Cuerpo de petición limitado a 100 KB.
- Bloqueo de cuenta a los 5 intentos fallidos, durante 15 minutos.
- Degradación elegante: si un proveedor externo falla, se responde con datos semilla marcados como `degraded: true`. Una demo no puede caerse porque se cayó un tercero.

### A05 · Security Misconfiguration

- Helmet con CSP, `frameAncestors: 'none'` (anti-clickjacking), `Referrer-Policy: no-referrer` y HSTS en producción.
- `x-powered-by` deshabilitado: no regalamos el fingerprint del stack.
- CORS con **lista blanca explícita**. Nunca `origin: true` ni `'*'` junto a `credentials: true` — esa combinación es la puerta abierta clásica.
- `hpp()` contra contaminación de parámetros (`?role=user&role=admin`).
- El manejador central de errores nunca expone stack traces ni mensajes de MySQL al cliente. Solo devuelve un `correlationId`, que es lo único que el usuario necesita para reportar y lo único que nosotros necesitamos para encontrarlo en los logs.

### A06 · Vulnerable and Outdated Components

- `npm run security:audit` (`--audit-level=high`) en cada PR.
- `package-lock.json` versionado; en CI se usa `npm ci`, nunca `npm install`.
- Dependencias deliberadamente pocas y populares. Cada paquete nuevo se justifica en el PR.

### A07 · Identification and Authentication Failures

- Límite de tasa en login/registro: 10 intentos por IP cada 15 minutos.
- Contraseña de **12 caracteres mínimo**, siguiendo NIST SP 800-63B: longitud sobre complejidad artificial, más rechazo de contraseñas obvias.
- **Mensaje de error genérico** («Credenciales inválidas»): no revelamos si falló el correo o la contraseña.
- **Hash señuelo** (`DUMMY_HASH`): si el correo no existe, igual se compara contra un hash de relleno para que el tiempo de respuesta sea idéntico. Sin esto, un atacante enumera cuentas válidas midiendo la latencia.
- **Rotación de refresh tokens con detección de reuso.** Si llega un token ya canjeado, se revoca la familia completa de sesiones: es la señal inequívoca de un token robado.
- Cambiar la contraseña invalida todas las sesiones activas.
- OAuth Google con `state` (anti-CSRF de login) y **PKCE**. El `client_secret` jamás toca el navegador.
- La vinculación con Google se hace por `sub`, **nunca por correo**: un correo puede cambiar de dueño, un `sub` no. Y se exige `email_verified === true`.

### A08 · Software and Data Integrity Failures

- ESLint prohíbe `eval`, `new Function` e `implied eval`.
- Sin CDNs de terceros en el frontend: todo se empaqueta con Vite.
- Rama `main` protegida. Sin auto-merge: **todo PR requiere revisión cruzada.**

### A09 · Security Logging and Monitoring Failures

- Logging estructurado con Pino y **redacción automática** de `authorization`, `cookie`, `password`, `token`, `apiKey` y `client_secret`. Si alguien loguea un objeto de usuario completo por accidente, la contraseña no aparece.
- `logger.security(evento, datos)` emite siempre, sin importar el nivel configurado. Eventos cubiertos: `LOGIN_FAILED`, `AUTHZ_DENIED`, `IDOR_ATTEMPT`, `RATE_LIMIT_EXCEEDED`, `TOKEN_INVALID`, `REFRESH_TOKEN_REUSE`, `SQLI_PATTERN_IN_PARAM`, `EGRESS_HOST_NOT_ALLOWED`, `CORS_ORIGIN_REJECTED`.
- Tabla `audit_log` **append-only por convención**: la aplicación solo hace `INSERT` y `SELECT`, nunca `UPDATE` ni `DELETE`.
- Todo queda ligado a un `correlationId` que viaja desde la petición HTTP hasta la consulta SQL y la llamada al proveedor externo.

### A10 · Server-Side Request Forgery

Especialmente relevante aquí, porque consumimos cuatro APIs de terceros.

- **Lista blanca de hosts de salida** en `core/security/guards.js`. Un host fuera de la lista se rechaza aunque el código lo pida.
- Ninguna URL de proveedor se construye con input del usuario. Los parámetros entran por `URLSearchParams`, nunca concatenados en el path.
- `redirect: 'error'` en todas las llamadas salientes: seguir una redirección es el vector clásico de SSRF.
- HTTPS obligatorio, timeout de 8 s con `AbortController`, y reintentos acotados.
- La respuesta del tercero se valida con Zod **antes de usarse**. No se confía en la forma de lo que devuelve un proveedor externo.

---

## 3. Consumo seguro de APIs externas

### Regla número uno: las llaves nunca salen del backend

**Vite inyecta en el bundle toda variable que empiece con `VITE_`.** Cualquiera puede leerlas abriendo las herramientas de desarrollo. Por lo tanto:

| ❌ Nunca | ✅ Siempre |
|---|---|
| `VITE_GEOAPIFY_KEY` en `apps/frontend/.env` | `GEOAPIFY_API_KEY` en `apps/backend/.env` |
| El navegador llama a `api.geoapify.com` | El navegador llama a `/api/v1/stays/search` y el backend hace de proxy |

Ese proxy no es solo protección de la llave: es también donde se aplican nuestro límite de tasa, la caché y la validación de la respuesta.

### Proveedores y estado actual (agosto 2026)

| Uso | Proveedor | Plan gratuito | Nota |
|---|---|---|---|
| Vuelos | **Duffel** (modo prueba) | Sandbox gratuito, sin tarjeta | Datos de la aerolínea ficticia «Duffel Airways»: precios y horarios **no son reales**. Perfecto para desarrollo, hay que decirlo en la demo. |
| Hospedaje | **Geoapify Places** | 3 000 créditos/día, sin tarjeta | Devuelve puntos de interés, **no tarifas**. Los precios son estimaciones nuestras. |
| Experiencias | **Geoapify Places** | misma llave | Categorías mapeadas por lista blanca. |
| Geocodificación | **Geoapify Geocoding** | misma llave | Caché de 24 h: las ciudades no se mueven. |
| Divisas | **Frankfurter** (BCE) | sin llave | Opcional, para presupuesto multi-moneda. |
| Clima | **Open-Meteo** | sin llave | Opcional. |

> **Nota importante:** Amadeus decomisionó su portal self-service el **17 de julio de 2026** y desactivó las llaves existentes. Si encuentras un tutorial que lo use, está desactualizado.

### Honestidad con los precios estimados

Geoapify no entrega tarifas. `budget.engine.js` las estima por categoría y marca cada monto con `estimated: true`. **La interfaz debe mostrar esa etiqueta.** Presentar un número inventado como si fuera un precio firme es un problema de producto, no solo de código, y en una demo evaluada se nota.

### Protección de la cuota

Tres personas desarrollando contra la misma llave de Geoapify agotan 3 000 créditos antes de comer. Por eso el caché en `core/cache.js` (1 h para lugares, 24 h para geocodificación) y el `externalApiLimiter` de 60 peticiones por usuario cada 15 minutos.

---

## 4. Preparación para DAST, IAST y RASP

Esta sección es lo que diferencia «una app con validaciones» de «una app diseñada para ser auditada».

### DAST — escaneo dinámico (OWASP ZAP)

El obstáculo real al escanear una SPA de React es que el spider de ZAP no encuentra nada: no hay enlaces HTML, todo se construye con JavaScript. La solución es darle a ZAP el mapa de la API directamente.

Por eso el backend expone `GET /api/v1/openapi.json`, ensamblado en `docs/openapi.js` a partir del `openapiPaths` que cada módulo exporta desde su propio archivo de rutas.

```bash
npm run dev                 # levanta el backend en :3000
npm run security:dast       # ZAP importa el OpenAPI y ataca cada endpoint
```

Lo que ya está preparado para que el escaneo sea útil:

- **Rutas versionadas** (`/api/v1/`): la superficie es estable y enumerable.
- **`GET /api/v1/health`**: ZAP verifica que el objetivo está vivo antes de empezar.
- **Formato de respuesta y de error uniforme**: las reglas de ZAP afirman sobre una sola forma.
- **`NODE_ENV=test` sube los límites de tasa a 100 000**, para que el escáner no se auto-bloquee a los treinta segundos.
- **Datos semilla deterministas** con tres usuarios, incluido uno cuyo único propósito es probar el control de acceso entre cuentas.
- El OpenAPI **no se expone en producción**: no regalamos el mapa de la API.

### IAST — análisis interactivo

Un enfoque IAST necesita seguir un dato desde que entra hasta que llega a un *sink* peligroso. La infraestructura para eso ya está:

- **`core/context.js`** abre un `AsyncLocalStorage` con un `correlationId` en el primer middleware. Ese identificador viaja por toda la cadena asíncrona sin necesidad de pasarlo como argumento.
- Como **todo el SQL pasa por `core/db.js`** y **toda la salida por `core/httpClient.js`**, hay exactamente dos *sinks* que instrumentar, y ambos ya reciben el contexto.
- Resultado práctico: con el `X-Correlation-Id` de una respuesta puedes reconstruir la petición completa — qué se validó, qué consulta se ejecutó, a qué proveedor se llamó, cuánto tardó cada paso.

### RASP — autoprotección en ejecución

`core/security/guards.js` es una capa RASP ligera, pero funcional y didáctica:

| Hook | Se dispara en | Qué detecta |
|---|---|---|
| `preQuery(sql, params)` | cada consulta, desde `core/db.js` | Firmas de inyección SQL en los **parámetros**, e indicios de interpolación en la sentencia |
| `preEgress(url)` | cada llamada saliente, desde `core/httpClient.js` | Hosts fuera de la lista blanca, protocolo inseguro |

Se controla con una sola variable de entorno:

```
SECURITY_ENFORCE=block     # corta la petición (recomendado)
SECURITY_ENFORCE=monitor   # solo registra — úsalo si algo bloquea de más durante la demo
```

Este archivo es también el punto de sustitución natural si más adelante quieren integrar un agente comercial (Contrast, Datadog ASM). La aplicación no tendría que cambiar: solo este archivo.

**Nota honesta sobre el alcance:** esto es una demostración del *patrón* RASP, no un producto RASP. Un agente real instrumenta el runtime de Node completo. Lo que aquí se demuestra es la propiedad arquitectónica que hace viable ese agente — los puntos únicos de paso — y eso es precisamente lo que se evalúa en un diseño.

---

## 5. Checklist de revisión de PR

Ningún PR se aprueba sin verificar los cinco puntos. El autor **no puede** aprobar el suyo.

- [ ] Cero `console.log` (ESLint lo bloquea). Se usa `core/logger`.
- [ ] Toda ruta nueva declara `authenticate` y `authorize(...)` — o justifica en la descripción del PR por qué es pública.
- [ ] Toda entrada tiene un esquema Zod `.strict()`.
- [ ] Cero SQL concatenado. Cero `SELECT *`. Toda consulta sobre datos de usuario filtra por `user_id`.
- [ ] Ningún secreto en el código, en el frontend ni en el historial de Git.
- [ ] `npm run lint` y `npm test` pasan en verde.

## 6. Si se filtra un secreto

Borrar el commit **no basta**: el historial de Git queda en cada clon. El procedimiento es:

1. **Rotar la llave inmediatamente** en el panel del proveedor (Duffel, Geoapify, Google).
2. Avisar al equipo en el chat del grupo.
3. Limpiar el historial (`git filter-repo`) solo después de haber rotado, no antes.
