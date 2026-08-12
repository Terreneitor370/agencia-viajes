# Arquitectura del Sistema — Agencia de Viajes

> Documento de referencia del equipo. Léelo completo antes de crear tu rama.
> Equipo: **Isa**, **Jeshua**, **Kassie** · Plazo: **1 semana** · Modelo de trabajo: **full-stack por módulo**

---

## 1. Decisiones tomadas y por qué

| Decisión | Elección | Justificación |
|---|---|---|
| Stack | Se mantiene React+Vite+Tailwind v3 / Node+Express+MySQL | Ya está montado y funcionando. Cambiarlo a 4 días del inicio cuesta más de lo que ahorra. |
| Autenticación | JWT propio (bcrypt + cookie httpOnly + refresh rotativo) **+** OAuth Google | Permite demostrar manejo de sesiones para la evaluación de seguridad, y Google añade un flujo OAuth real sin dependencia de proveedor de pago. |
| Roles | `traveler` y `admin` (+ invitado no autenticado) | Dos roles bastan para demostrar RBAC completo. Un tercer rol es un módulo extra que no cabe en la semana. |
| API de vuelos | **Duffel** (modo prueba, gratis, sin tarjeta) | **Amadeus cerró su portal self-service el 17/07/2026**; sus llaves están desactivadas. Duffel da alta inmediata y un sandbox estable. |
| Hospedaje + experiencias + geocodificación | **Geoapify** (3 000 créditos/día, sin tarjeta) | Una sola llave cubre tres módulos: menos secretos que gestionar y menos superficie de exposición. |
| Divisas y clima (opcional) | Frankfurter y Open-Meteo | Sin llave, sin registro, sin límite práctico. |
| Validación | Zod en el backend | Un solo lenguaje de esquemas para body, query y params; el mismo esquema documenta el contrato. |

### Ajuste al stack que sí recomiendo revisar

**Ninguno estructural.** El único cambio que vale la pena discutir es añadir **Zod + Helmet + express-rate-limit** al backend (ya incluidos en el andamiaje). Son tres dependencias que cubren, entre las tres, cinco de los diez puntos del OWASP Top 10, y su costo de aprendizaje es de aproximadamente una hora.

Lo que **no** recomiendo, aunque suene tentador con el plazo encima: usar un ORM (Prisma/Sequelize). Escribir SQL parametrizado a mano con `mysql2` es más rápido de aprender que la API de un ORM, y para la materia es mejor que se vea explícitamente la sentencia preparada.

---

## 2. Estructura del monorepo

```
agencia-viajes/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/          ⚠️ COMPARTIDO — env, pool MySQL, matriz de roles
│   │   │   ├── core/            ⚠️ COMPARTIDO — los cuellos de botella del sistema
│   │   │   │   ├── db.js            ← ÚNICO acceso a SQL
│   │   │   │   ├── httpClient.js    ← ÚNICA salida HTTP
│   │   │   │   ├── security/guards.js ← hooks RASP
│   │   │   │   ├── context.js       ← AsyncLocalStorage (base de IAST)
│   │   │   │   ├── logger.js, cache.js, respond.js, ApiError.js
│   │   │   ├── middlewares/     ⚠️ COMPARTIDO — seguridad transversal
│   │   │   ├── modules/         ✅ TU TERRITORIO — una carpeta por módulo
│   │   │   ├── loaders/         auto-registro de rutas
│   │   │   ├── docs/openapi.js  especificación (insumo del DAST)
│   │   │   ├── app.js, server.js
│   │   ├── db/migrations/       un .sql numerado por dueño
│   │   ├── tests/
│   │   └── .env.example
│   └── frontend/
│       └── src/
│           ├── app/             router con auto-descubrimiento
│           ├── core/            ⚠️ COMPARTIDO — cliente HTTP, AuthContext, guards
│           ├── components/ui/   ⚠️ COMPARTIDO — solo primitivas
│           ├── layouts/         ⚠️ COMPARTIDO
│           └── features/        ✅ TU TERRITORIO — una carpeta por módulo
└── docs/
```

### La regla que evita los conflictos de merge

**Nadie edita archivos fuera de `modules/<lo-tuyo>/` y `features/<lo-tuyo>/`.**

Esto es posible gracias a dos piezas del andamiaje:

- **Backend — `loaders/routes.loader.js`.** Recorre `src/modules/` y monta cualquier `<nombre>/<nombre>.routes.js` que encuentre. No existe un `routes/index.js` central donde los tres escribirían `app.use(...)` en líneas contiguas — que es, con diferencia, la causa número uno de conflictos en este tipo de proyecto.
- **Frontend — `app/router.jsx`.** Usa `import.meta.glob('../features/*/routes.jsx')`. Mismo principio: agregar una pantalla es crear un archivo, nunca modificar uno compartido.

Consecuencia práctica: **agregar funcionalidad = crear archivos nuevos. Cero archivos tocados en común. Cero conflictos.**

### Los archivos que sí son compartidos

`core/`, `middlewares/`, `config/`, `layouts/`, `components/ui/`, `package.json`, `tailwind.config.js`.

Se congelan al terminar el Día 0. Después de eso, cambiarlos requiere un PR pequeño, aparte, con etiqueta `core`, aprobado por los tres. Si necesitas algo de `core` a media semana, es señal de que hay que hablarlo en la reunión diaria, no de que hay que editarlo en silencio dentro de tu PR de feature.

---

## 3. Módulos (asignación full-stack)

Cada persona construye backend **y** frontend de su módulo, de punta a punta.

### Módulo A — Identidad, Acceso y Administración · **Isa**

**Backend:** `modules/auth/`, `modules/users/`, `modules/admin/` · **Frontend:** `features/auth/`, `features/admin/` · **Migración:** `010_auth.sql`

- Registro y login con bcrypt (12 rondas)
- Sesión con cookie httpOnly + refresh token rotativo con detección de reuso
- OAuth Google (Authorization Code + PKCE, intercambio en el servidor)
- Middleware RBAC y matriz de permisos
- Panel de administración: usuarios, cambio de rol, bitácora de auditoría

> **Carga extra y compensación:** este módulo entrega el andamiaje del que dependen los otros dos, así que Isa arranca antes y termina antes (fin del Día 3). A partir del Día 4 asume el rol de revisora de seguridad de los PRs de Kassie y Jeshua, y ejecuta el escaneo DAST.

### Módulo B — Descubrimiento: Vuelos y Hospedaje · **Kassie**

**Backend:** `modules/flights/`, `modules/stays/` · **Frontend:** `features/flights/`, `features/stays/` · **Migración:** `030_catalog.sql`

- Adaptador de Duffel (vuelos) y de Geoapify Places (hospedaje)
- Normalización al contrato interno común
- Caché, degradación elegante con datos semilla, límite de tasa por usuario
- Buscador, filtros y tarjetas de resultado

### Módulo C — Viajes, Experiencias y Presupuesto · **Jeshua**

**Backend:** `modules/trips/`, `modules/experiences/`, `modules/budget/` · **Frontend:** `features/trips/`, `features/experiences/`, `features/budget/` · **Migración:** `020_trips.sql`

- CRUD de viaje e itinerario con control de propiedad (anti-IDOR)
- Experiencias vía Geoapify por categorías de interés
- **Motor de presupuesto dinámico** (`budget.engine.js`): funciones puras, dinero en centavos enteros, cuatro modos de escalamiento por concepto
- Wizard de viaje, itinerario y panel de presupuesto reactivo

---

## 4. Cómo se acoplan los módulos sin acoplarse

Los tres módulos se necesitan (B produce sugerencias que C guarda en un viaje, y ambos dependen de la sesión que emite A), pero **ninguno importa código de otro**. Se comunican por dos vías:

**1. Contrato HTTP.** El módulo B nunca llama a una función de C. Renderiza un botón «Agregar al viaje» que hace `POST /api/v1/trips/:id/items`.

**2. Un contrato de datos congelado — `TripItem`.** Definido en `trips.schema.js` el Día 0:

```js
{
  type: 'flight' | 'stay' | 'experience' | 'other',
  provider: string,
  externalId: string | null,
  title: string,
  unitPriceCents: integer,      // dinero SIEMPRE en centavos enteros
  currency: 'MXN' | 'USD' | 'EUR',
  pricingMode: 'per_person' | 'per_group' | 'per_night_per_room' | 'per_person_per_day',
  quantity: integer,
  estimated: boolean
}
```

`pricingMode` es la pieza clave del presupuesto dinámico: es lo que le dice al motor cómo escala cada concepto cuando cambia el número de viajeros. Un vuelo se multiplica por viajero; un tour privado no se multiplica; un hotel se multiplica por noches y por habitaciones.

**Este contrato queda congelado tras el Día 0.** Cambiarlo requiere acuerdo de los tres.

---

## 5. Roles y permisos

| | Invitado | `traveler` | `admin` |
|---|:---:|:---:|:---:|
| Buscar vuelos, hospedaje, experiencias | ✅ (límite bajo) | ✅ | ✅ |
| Crear y editar sus propios viajes | ❌ | ✅ | ✅ |
| Ver el viaje de **otro** usuario | ❌ | ❌ | ✅ (queda en bitácora) |
| Simular presupuesto | ❌ | ✅ | ✅ |
| Editar su perfil | ❌ | ✅ | ✅ |
| Listar usuarios / cambiar roles / suspender | ❌ | ❌ | ✅ |
| Leer la bitácora de auditoría | ❌ | ❌ | ✅ |
| Purgar caché de proveedores | ❌ | ❌ | ✅ |

Cuatro reglas de diseño:

1. **Denegar por defecto.** Si un permiso no está en `config/roles.js`, no existe.
2. **El rol lo asigna el servidor.** El esquema de registro no tiene campo `role`. Es `.strict()`, así que enviar `{"role":"admin"}` no eleva privilegios: el campo se rechaza.
3. **El permiso autoriza la acción; la consulta autoriza el objeto.** Tener `trip:read:own` no basta — el repositorio filtra siempre por `user_id` en el `WHERE`. Por eso `trips.repository.js` no tiene ninguna función que busque un viaje solo por su `id`: esa ausencia hace imposible olvidar el filtro.
4. **Un admin no se degrada a sí mismo** y cambiar un rol revoca las sesiones activas de ese usuario (su token viejo aún lleva el rol anterior).
5. **En el frontend, ocultar un botón no es seguridad.** `AuthContext` es experiencia de usuario. La única autorización real vive en `middlewares/authorize.js`.

---

## 6. Plan de la semana

| Día | Qué pasa | Rama |
|---|---|---|
| **0** (2–3 h, los tres juntos) | Merge del andamiaje. Definir el contrato `TripItem`. Cada quien genera su `.env`, corre migraciones y confirma que `npm run dev` arranca. | `chore/foundation` → `develop` |
| **1–2** | A: auth completo. B: adaptadores + buscador. C: CRUD de viajes + motor de presupuesto. | `feature/<módulo>` |
| **3** | Primer merge a `develop` de los tres. **Aquí se descubren los desacuerdos de contrato — por eso es a mitad de semana y no al final.** | PR cruzado |
| **4** | Integración: pantallas que consumen datos reales de otros módulos. | `feature/<módulo>` |
| **5** | Panel de admin, bitácora, pulido de interfaz. Escaneo ZAP + `npm audit`. | `feature/*` + `chore/security` |
| **6** | Corrección de hallazgos, datos semilla para la demo, README. | `fix/*` |
| **7** | Congelamiento. Solo se aceptan PRs `fix:`. Ensayo de la demo. | `release/v1` |

**Regla diaria innegociable:** cada quien corre `git checkout develop && git pull && git checkout feature/lo-suyo && git merge develop` **todos los días**, aunque no haya terminado nada. Un merge diario de cinco minutos evita un merge de dos horas el Día 6.
