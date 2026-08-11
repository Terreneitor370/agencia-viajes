# Flujo de trabajo del equipo

Extiende la guía de Git original con las reglas específicas que hacen que tres personas trabajando full-stack en paralelo no se pisen.

## Ramas

```
main            producción · protegida · solo recibe merges desde develop
└── develop     integración · nadie trabaja aquí directamente
    ├── feature/identidad        (integrante A)
    ├── feature/descubrimiento   (integrante B)
    └── feature/viajes           (integrante C)
```

Ramas auxiliares: `chore/*` para dependencias y configuración, `fix/*` para correcciones.

## Las reglas que evitan conflictos

**1. Tu territorio son dos carpetas.**

| Módulo | Backend | Frontend | Migración |
|---|---|---|---|
| A · Identidad | `src/modules/{auth,users,admin}/` | `src/features/{auth,admin}/` | `010_auth.sql` |
| B · Descubrimiento | `src/modules/{flights,stays}/` | `src/features/{flights,stays}/` | `030_catalog.sql` |
| C · Viajes | `src/modules/{trips,experiences,budget}/` | `src/features/{trips,experiences,budget}/` | `020_trips.sql` |

**2. No hay archivo central de rutas.** El backend descubre solo cualquier `modules/<x>/<x>.routes.js`; el frontend, cualquier `features/<x>/routes.jsx`. Agregar funcionalidad es crear archivos, no editar los de otros.

**3. Un `.sql` por persona.** Nunca un `schema.sql` compartido: es donde más duelen los conflictos.

**4. `core/`, `middlewares/`, `layouts/`, `components/ui/` se congelan tras el Día 0.** Si necesitas tocarlos, abre un PR aparte con etiqueta `core` y avisa en el chat. **Nunca** los metas dentro de un PR de feature.

**5. `package.json` y `tailwind.config.js` solo se tocan en PRs `chore:` separados.** Si tu PR de feature agrega una dependencia, sepáralo en dos.

**6. Sincroniza todos los días**, aunque no hayas terminado nada:

```bash
git checkout develop && git pull origin develop
git checkout feature/lo-tuyo && git merge develop
```

Cinco minutos diarios evitan dos horas el día 6.

## Commits

Conventional Commits. Un commit puede (y debe) llevar backend y frontend juntos, porque el trabajo es full-stack:

```
feat(vuelos): busqueda de ofertas con adaptador Duffel y tarjeta de resultado
fix(auth): corrige expiracion de la cookie de refresh
chore(deps): agrega helmet y express-rate-limit
docs(seguridad): documenta la preparacion para DAST
```

Prefijos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`.

## Pull Requests

Hacia `develop`, siempre. **Sin auto-aprobación.** Quien revisa verifica el checklist de `docs/SEGURIDAD.md` § 5:

- Cero `console.log`
- Toda ruta nueva declara `authenticate` + `authorize(...)`, o justifica por qué es pública
- Toda entrada tiene esquema Zod `.strict()`
- Cero SQL concatenado, cero `SELECT *`, filtro por `user_id` en datos de usuario
- Ningún secreto en el código
- `npm run lint` y `npm test` en verde

## Cuando aparece un conflicto (va a pasar)

```bash
git merge develop
# CONFLICT en apps/backend/package.json

git status                     # ver qué está en conflicto
# resolver en el editor, conservando AMBOS cambios cuando sean dependencias distintas
git add apps/backend/package.json
git commit                     # mensaje automático de merge, está bien
```

Si el conflicto está en `package-lock.json`, **no lo resuelvas a mano**: borra el archivo, corre `npm install` en la raíz y haz commit del resultado.

Si el conflicto está en un archivo de `core/`, **para y avísale al equipo** antes de resolverlo. Ahí es donde una resolución apresurada rompe cosas de forma silenciosa.
