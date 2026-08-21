# Despliegue en el VPS escolar

Backend en Docker, frontend como build estatico servido por Nginx. Puerto
asignado: **3005**. Subdominio: **agencia-viajes.idgs8-2.tech**.

El contenedor del backend corre con `network_mode: host` (no bridge): el
MySQL de este VPS solo acepta conexiones por `127.0.0.1`
(`bind-address=127.0.0.1`), y un contenedor en la red bridge por defecto de
Docker le llega desde la IP del gateway, no desde loopback -- eso da
`ETIMEDOUT` en vez de conectar. Con host networking el contenedor comparte
la red del VPS directo, sin ese problema. La contraparte es que el
contenedor ya NO tiene un mapeo de puertos propio: el backend expone su
puerto (3005, via `PORT` en `.env.production`) directo en el VPS, como si
corriera con PM2. `server.js` lo ata solo a `127.0.0.1` en produccion para
no exponerlo en todas las interfaces del servidor compartido.

## 1. Primera vez: clonar y configurar

```bash
cd ~
git clone https://github.com/Terreneitor370/agencia-viajes.git
cd agencia-viajes
```

(el repo real de este despliegue quedo en `/home/terreneitor370/agencia-viajes`,
no en `/var/www/...` como sugiere la guia generica -- `deploy/nginx.agencia-viajes.conf`
ya apunta ahi. Si mueves el checkout de lugar, actualiza el `root` de ese
archivo tambien.)

Crea el archivo de entorno del backend a partir de la plantilla y llena los
valores reales (secretos JWT nuevos, credenciales SMTP/Stripe/Duffel/Geoapify,
credenciales de la base de datos que crees en el paso 2):

```bash
cp apps/backend/.env.production.example apps/backend/.env.production
nano apps/backend/.env.production
```

## 2. Base de datos: usuario y BD dedicados a este proyecto

Primero confirma en QUE puerto escucha el MySQL de este VPS -- no lo
asumas, cada servidor puede tener el suyo:

```bash
sudo ss -tulpn | grep mysql
```

Anota el puerto que te muestre (probablemente 3306, pero verifica).

**No reutilices el usuario root del MySQL compartido.** Entra al cliente de
MySQL (root normalmente no pide password si usas `sudo`; si `sudo mysql`
no funciona, prueba `mysql -u root -p`):

```bash
sudo mysql
```

Ya DENTRO del prompt `mysql>` (no en bash), pega esto completo. Usa el MISMO
nombre de usuario en las tres lineas que lo mencionan:

```sql
CREATE DATABASE IF NOT EXISTS agencia_viajes CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS 'agencia_viajes_app'@'localhost' IDENTIFIED BY 'una-contrasena-fuerte-unica';
GRANT ALL PRIVILEGES ON agencia_viajes.* TO 'agencia_viajes_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

En `apps/backend/.env.production` llena `DB_USER`/`DB_PASSWORD` con ese
usuario/contraseña, `DB_PORT` con el puerto que confirmaste arriba, y
`DB_HOST=localhost` (o `127.0.0.1`). Como el contenedor corre con
`network_mode: host` (ver paso 4), este mismo valor aplica igual dentro y
fuera de Docker -- no hay que cambiarlo entre uno y otro.

Aplica las migraciones (fuera de Docker, directo con Node -- estos scripts
leen `apps/backend/.env`, no `.env.production` directamente, por eso se
copia primero):

```bash
cd apps/backend
cp .env.production .env
npm ci
npm run db:migrate
cd ../..
```

Si despues editas `.env.production` (por ejemplo para corregir un dato),
vuelve a correr `cp .env.production .env` antes de repetir el
`db:migrate` -- si no, sigue leyendo la copia vieja.

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

Confirma que `apps/backend/.env.production` tenga `PORT=3005` (tu puerto
asignado) -- con `network_mode: host` no hay traduccion de puertos de
Docker, ese valor es el puerto real en el VPS.

```bash
sudo docker compose up -d --build
sudo docker ps
sudo docker logs agencia_viajes_backend
```

(si no quieres usar `sudo` cada vez: `sudo usermod -aG docker $USER` y
vuelve a iniciar sesion SSH)

Los logs deben mostrar los 9 modulos montados y "Backend escuchando..." sin
errores. Eso NO prueba por si solo que conecto bien a MySQL -- confirmalo
con una peticion real que toque la base de datos:

```bash
curl -i -X POST http://127.0.0.1:3005/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Prueba","email":"prueba-despliegue@test.local","password":"PruebaDespliegue1234!"}'
```

`201 Created` = conecto bien. Borra la cuenta de prueba despues:

```bash
sudo mysql -e "DELETE FROM agencia_viajes.users WHERE email='prueba-despliegue@test.local';"
```

## 5. Nginx + SSL

Nginx corre como el usuario `www-data`, no como tu usuario -- necesita
permiso para ATRAVESAR cada carpeta del camino hasta `dist/` (no solo
leerla). Como el repo quedo dentro de tu home (`/home/terreneitor370/...`),
que por default en Ubuntu suele tener permisos `750` (nadie mas entra),
dale paso explicito:

```bash
chmod o+x /home/terreneitor370
```

(esto NO hace publico el contenido de tu home, solo permite que otros
procesos atraviesen la carpeta para llegar a una ruta especifica que ya
conocen -- no pueden listar lo que hay adentro)

```bash
sudo cp deploy/nginx.agencia-viajes.conf /etc/nginx/sites-available/agencia-viajes
sudo ln -s /etc/nginx/sites-available/agencia-viajes /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d agencia-viajes.idgs8-2.tech
```

`deploy/nginx.agencia-viajes.conf` ya incluye el bloque HTTPS que agrega
Certbot (se capturo del servidor real la primera vez que se corrio), asi
que **este `certbot --nginx` de la primera instalacion no hace falta
repetirlo despues** -- el `cp` de arriba ya trae el HTTPS puesto. Si de
todos modos lo vuelves a correr, Certbot detecta el certificado existente
y solo pregunta si reinstalarlo (opcion 1) o renovarlo (opcion 2); la 1 no
tiene riesgo.

⚠️ **No copies una version vieja de este archivo por encima de la que
esta en el servidor.** Ya nos paso: un `cp` de una copia que no traia el
bloque SSL borro el HTTPS de produccion sin avisar, y como el navegador ya
traia HSTS guardado de una visita anterior, siguio insistiendo en
conectarse por 443 -- y como agencia-viajes ya no tenia nada ahi, Nginx
sirvio el primer sitio de OTRO compañero que si tenia el 443 configurado
en este VPS compartido. Si necesitas editar este archivo, parte siempre
de `cat /etc/nginx/sites-enabled/agencia-viajes` en el servidor (la
version real, con Certbot incluido), no de una copia local vieja.

Si despues de un deploy el sitio da 403 Forbidden en vez de cargar, es
el tema de permisos del paso anterior -- revisa con
`sudo -u www-data test -r /home/terreneitor370/agencia-viajes/apps/frontend/dist/index.html && echo OK || echo SIN PERMISO`.

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
cd ~/agencia-viajes
git pull
npm ci                               # por si alguien agrego una dependencia nueva
npm run db:migrate -w apps/backend   # solo si hay migraciones nuevas
npm run build -w apps/frontend       # solo si cambio el frontend
sudo docker compose up -d --build    # solo si cambio el backend (el npm ci del backend corre DENTRO del build de Docker, no depende de este)

# Solo si cambio deploy/nginx.agencia-viajes.conf -- SIEMPRE los dos
# comandos juntos, el reload solo no sirve de nada si no se copio primero
# el archivo actualizado (y ya trae el bloque HTTPS de Certbot, ver el
# aviso mas arriba: es seguro volver a copiarlo, no hace falta certbot):
sudo cp deploy/nginx.agencia-viajes.conf /etc/nginx/sites-available/agencia-viajes
sudo nginx -t
sudo systemctl reload nginx
```

`npm ci` en la raiz es rapido si nada cambio (solo valida el lockfile), y evita el error de "Cannot find module" si alguien agrego un paquete y se les olvido avisar.
