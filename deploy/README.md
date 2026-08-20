# Despliegue en el VPS escolar

Backend en Docker, frontend como build estatico servido por Nginx. Puerto
asignado: **3005** (interno del contenedor: 3000). Subdominio:
**agencia-viajes.idgs8-2.tech**.

## 1. Primera vez: clonar y configurar

```bash
cd /var/www/Terreneitor370
git clone https://github.com/Terreneitor370/agencia-viajes.git
cd agencia-viajes
```

Crea el archivo de entorno del backend a partir de la plantilla y llena los
valores reales (secretos JWT nuevos, credenciales SMTP/Stripe/Duffel/Geoapify,
credenciales de la base de datos que crees en el paso 2):

```bash
cp apps/backend/.env.production.example apps/backend/.env.production
nano apps/backend/.env.production
```

## 2. Base de datos: usuario y BD dedicados a este proyecto

**No reutilices el usuario root del MySQL compartido.** Crea un usuario que
solo pueda tocar la base de este proyecto, para no arriesgar los proyectos de
los demas compañeros en el mismo VPS:

```sql
CREATE DATABASE agencia_viajes CHARACTER SET utf8mb4;
CREATE USER 'agencia_viajes_app'@'localhost' IDENTIFIED BY 'una-contrasena-fuerte-unica';
GRANT ALL PRIVILEGES ON agencia_viajes.* TO 'agencia_viajes_app'@'localhost';
FLUSH PRIVILEGES;
```

Usa ese usuario/contraseña en `DB_USER`/`DB_PASSWORD` de
`apps/backend/.env.production`. `DB_HOST` no se toca ahi -- lo fija
`docker-compose.yml` a `host.docker.internal` para que el contenedor
alcance el MySQL del host.

Aplica las migraciones (fuera de Docker, directo con Node -- estos scripts
usan `apps/backend/.env`, asi que corren apuntando al mismo `.env.production`
si lo copias/enlazas como `.env`, o exporta las mismas variables de entorno
antes de correrlo):

```bash
cd apps/backend
cp .env.production .env
npm ci
npm run db:migrate
cd ../..
```

## 3. Build del frontend (estatico, fuera de Docker)

```bash
cd apps/frontend
npm ci
npm run build
cd ../..
```

Esto genera `apps/frontend/dist/`, que es lo que Nginx sirve directo (ver
`deploy/nginx.agencia-viajes.conf`).

## 4. Levantar el backend con Docker

```bash
docker compose up -d --build
docker ps
docker logs -f agencia_viajes_backend
```

Confirma en los logs que arranco sin errores de configuracion (env.js corta
el arranque si falta una variable critica) y que conecto a MySQL.

## 5. Nginx + SSL

```bash
sudo cp deploy/nginx.agencia-viajes.conf /etc/nginx/sites-available/agencia-viajes
sudo ln -s /etc/nginx/sites-available/agencia-viajes /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d agencia-viajes.idgs8-2.tech
```

**Importante:** las cookies de sesion se marcan `Secure` en produccion
(`env.isProd`), o sea que el login NO va a funcionar por HTTP plano. No
pruebes el login hasta que el paso de Certbot haya terminado y el sitio
cargue en `https://`.

Si usas login con Google, agrega
`https://agencia-viajes.idgs8-2.tech/api/v1/auth/google/callback` a los
"Authorized redirect URIs" del cliente OAuth en Google Cloud Console --
si no, Google rechaza el login con ese dominio.

## 6. Verificar

- `https://agencia-viajes.idgs8-2.tech` carga el frontend.
- Registro/login funciona (implica: cookies, SMTP y MySQL bien conectados).
- Un flujo de pago de prueba llega a Stripe Checkout.

## Actualizar tras el primer despliegue

```bash
cd /var/www/Terreneitor370/agencia-viajes
git pull
npm run db:migrate -w apps/backend   # solo si hay migraciones nuevas
npm run build -w apps/frontend       # solo si cambio el frontend
docker compose up -d --build         # solo si cambio el backend
sudo systemctl reload nginx          # solo si cambio deploy/nginx.agencia-viajes.conf
```
