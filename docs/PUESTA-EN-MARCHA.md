# Puesta en marcha

Guía para dejar el proyecto corriendo en tu máquina. Windows. Tiempo estimado: 20 minutos.

## Antes de empezar

Necesitas instalado:

- **Node.js 20 o superior** — comprueba con `node -v`
- **MySQL 8** corriendo en local — puede ser MySQL Server, XAMPP o Laragon
- **Git**
- **VS Code** con la extensión **ESLint** (es obligatoria para el equipo, no opcional)

---

## 1. Clonar e instalar

```bash
git clone https://github.com/Terreneitor370/agencia-viajes.git
cd agencia-viajes
npm install
```

`npm install` se ejecuta **solo en la raíz**. npm enlaza automáticamente las dependencias del backend y del frontend porque el proyecto usa workspaces. No corras `npm install` dentro de `apps/backend` ni de `apps/frontend`.

Confirma que estás en la rama correcta:

```bash
git branch --show-current
```

Debe decir `develop`. Si dice `main`, corre `git checkout develop`.

---

## 2. Variables de entorno

```bash
copy apps\backend\.env.example apps\backend\.env
copy apps\frontend\.env.example apps\frontend\.env
```

### 2.1 Secretos de sesión

Genera **dos** secretos distintos:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Córrelo dos veces y pega cada resultado en `apps/backend/.env`:

```
JWT_ACCESS_SECRET=<primer resultado>
JWT_REFRESH_SECRET=<segundo resultado>
```

Si son iguales o miden menos de 32 caracteres, el servidor no arranca. Es a propósito.

### 2.2 Datos de tu MySQL

En `apps/backend/.env` ajusta a tu instalación:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<tu contraseña>
DB_NAME=agencia_viajes
```

### 2.3 Llaves de las APIs (cada quien la suya)

Ninguna pide tarjeta. **No compartan llaves entre ustedes**: si una se filtra, no sabemos de quién era ni cuál rotar.

| Servicio | Dónde | Qué copiar |
|---|---|---|
| Duffel (vuelos) | https://app.duffel.com → Developers → Access tokens | Token que empieza con `duffel_test_` → `DUFFEL_API_TOKEN` |
| Geoapify (hospedaje, experiencias, ciudades) | https://myprojects.geoapify.com | La API key → `GEOAPIFY_API_KEY` |

Google OAuth es opcional y solo lo necesita quien trabaje el módulo de identidad.

> El proyecto arranca sin estas llaves: responde con datos de respaldo marcados como degradados. Puedes empezar a programar antes de conseguirlas.

---

## 3. Base de datos

Con MySQL corriendo:

```bash
npm run db:migrate
```

Crea la base y las tablas. Para cargar usuarios y viajes de prueba:

```bash
npm run db:seed
```

Antes de sembrar, genera los hashes de las contraseñas demo y pégalos en `apps/backend/db/seeds/001_admin_and_demo.sql`:

```bash
node -e "console.log(require('bcryptjs').hashSync('Admin.Demo.2026!',12))"
```

---

## 4. Arrancar

```bash
npm run dev
```

Levanta backend y frontend a la vez.

| Qué | Dónde |
|---|---|
| Aplicación | http://localhost:5173 |
| API | http://localhost:3000/api/v1 |
| Salud del sistema | http://localhost:3000/api/v1/health |
| Especificación OpenAPI | http://localhost:3000/api/v1/openapi.json |

Abre la salud del sistema. Si dice `"database": "up"`, todo quedó bien.

---

## 5. Antes de escribir tu primera línea

Lee estos dos documentos. Sin eso, la protección contra conflictos de merge que trae el proyecto no funciona: depende de que los tres respeten sus carpetas.

- `docs/ARQUITECTURA.md` sección 3 — qué carpetas te tocan
- `docs/FLUJO-DE-TRABAJO.md` — ramas, commits y las cinco reglas para no chocar

### Reparto de módulos

| Módulo | Responsable | Backend | Frontend | Migración |
|---|---|---|---|---|
| A — Identidad, Acceso y Administración | | `src/modules/{auth,users,admin}` | `src/features/{auth,admin}` | `010_auth.sql` |
| B — Descubrimiento (vuelos y hospedaje) | | `src/modules/{flights,stays}` | `src/features/{flights,stays}` | `030_catalog.sql` |
| C — Viajes, Experiencias y Presupuesto | | `src/modules/{trips,experiences,budget}` | `src/features/{trips,experiences,budget}` | `020_trips.sql` |

### Crear tu rama

```bash
git checkout develop
git pull origin develop
git checkout -b feature/identidad
```

Los nombres acordados son `feature/identidad`, `feature/descubrimiento` y `feature/viajes`.

---

## 6. Rutina diaria

**Cada día antes de empezar**, aunque no hayas terminado nada:

```bash
git checkout develop
git pull origin develop
git checkout feature/lo-tuyo
git merge develop
```

Cinco minutos diarios evitan dos horas de conflictos el día 6.

**Antes de abrir un pull request:**

```bash
npm run lint
npm test
```

Los dos tienen que pasar. Después:

```bash
git add .
git commit -m "feat(vuelos): agrega busqueda de ofertas y tarjeta de resultado"
git push origin feature/lo-tuyo
```

Y abres el pull request hacia `develop` en GitHub. **Nadie aprueba el suyo**: siempre lo revisa otra persona con el checklist que aparece automáticamente en la plantilla.

---

## Si algo falla

| Síntoma | Causa probable | Solución |
|---|---|---|
| `[env] Configuracion invalida` | Falta un valor en `.env` o un secreto JWT es muy corto | El mensaje dice exactamente qué variable falta |
| `"database": "down"` en salud | MySQL no está corriendo o las credenciales no coinciden | Revisa el servicio de MySQL y las variables `DB_*` |
| `npm run dev` no levanta el frontend | Se instaló dentro de `apps/frontend` | Borra `apps/frontend/node_modules` y corre `npm install` en la raíz |
| Conflicto en `package-lock.json` | Dos personas agregaron dependencias | No lo resuelvas a mano: bórralo, corre `npm install` en la raíz y haz commit del resultado |
| Conflicto en algo de `core/` o `middlewares/` | Alguien tocó territorio compartido | **Para y avisa al equipo** antes de resolverlo |
| Resultados con aviso de "datos de ejemplo" | Falta la llave de Duffel o Geoapify, o se agotó la cuota | Revisa `.env`. Es comportamiento esperado, no un error |
