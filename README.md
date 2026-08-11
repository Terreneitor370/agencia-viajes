# Agencia de Viajes

Aplicación web de sugerencias y planeación de viajes: vuelos, hospedaje, experiencias y presupuesto dinámico según la cantidad de viajeros.

**Monorepo** con npm workspaces · React + Vite + Tailwind v3 · Node + Express + MySQL

## Documentación

| Documento | Para qué |
|---|---|
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) | Estructura, módulos por integrante, roles y permisos, plan de la semana |
| [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md) | OWASP Top 10 control por control, consumo seguro de APIs, DAST / IAST / RASP |
| [`docs/FLUJO-DE-TRABAJO.md`](docs/FLUJO-DE-TRABAJO.md) | Ramas, commits, PRs y cómo no chocar en los merges |

## Puesta en marcha

```bash
git clone <url-del-repositorio>
cd agencia-viajes
git checkout develop
npm install                       # solo en la raíz: npm enlaza ambos workspaces
```

### 1. Variables de entorno

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Genera los dos secretos JWT (deben ser distintos entre sí):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Y consigue las llaves gratuitas (ninguna pide tarjeta):

- **Duffel** — vuelos, modo prueba → https://app.duffel.com → *Developers > Access tokens* (el token empieza con `duffel_test_`)
- **Geoapify** — hospedaje, experiencias y geocodificación, 3 000 créditos/día → https://myprojects.geoapify.com
- **Google OAuth** — opcional → https://console.cloud.google.com/apis/credentials, tipo «Aplicación web», URI de redirección `http://localhost:3000/api/v1/auth/google/callback`

> Las llaves van **únicamente** en `apps/backend/.env`. Vite publica en el bundle toda variable que empiece con `VITE_`; una llave ahí es una llave regalada.

### 2. Base de datos

```bash
npm run db:migrate     # crea el esquema
npm run db:seed        # + usuarios y viajes de prueba
```

Antes de sembrar, genera los hashes de las contraseñas demo y pégalos en `apps/backend/db/seeds/001_admin_and_demo.sql`:

```bash
node -e "console.log(require('bcryptjs').hashSync('Admin.Demo.2026!',12))"
```

### 3. Arrancar

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000/api/v1
- Salud: http://localhost:3000/api/v1/health
- OpenAPI (objetivo del DAST): http://localhost:3000/api/v1/openapi.json

## Comandos

```bash
npm run dev               # backend + frontend en paralelo
npm run lint              # ESLint en ambos workspaces
npm test                  # pruebas del backend (presupuesto + control de acceso)
npm run build             # build de producción del frontend
npm run db:migrate        # aplica migraciones
npm run db:seed           # migraciones + datos de prueba
npm run security:audit    # auditoría de dependencias
npm run security:dast     # escaneo OWASP ZAP contra el OpenAPI (requiere Docker)
```

## Estado de los módulos

| Módulo | Backend | Frontend |
|---|---|---|
| A · Identidad, Acceso y Administración | esqueleto con lógica de sesión resuelta | login funcional, resto pendiente |
| B · Descubrimiento (vuelos, hospedaje) | adaptadores y búsqueda funcionando | buscador de vuelos funcional, hospedaje pendiente |
| C · Viajes, Experiencias y Presupuesto | motor de presupuesto y CRUD listos | panel de presupuesto listo, resto pendiente |

Cada archivo lleva en su encabezado el módulo al que pertenece y los `TODO(letra)` marcan lo que falta.

## Aviso sobre los datos

Los vuelos vienen del sandbox de Duffel: la aerolínea es ficticia y **los precios y horarios no son reales**. Geoapify devuelve puntos de interés, no tarifas, así que los precios de hospedaje y experiencias son **estimaciones nuestras** marcadas con `estimated: true`. La interfaz debe mostrar esa etiqueta.
