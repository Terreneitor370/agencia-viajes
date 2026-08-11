# Prompt para la sección de diseño

> Copia todo lo que está entre las líneas de guiones y pégalo tal cual.
> Está escrito para que quien lo reciba tenga suficiente contexto real del proyecto
> y no invente datos que no existen en nuestra API.

---

Actúa como diseñador de producto senior especializado en plataformas de viajes. Necesito que definas la identidad visual y los mockups conceptuales de una aplicación web de planeación de viajes, priorizando una experiencia altamente intuitiva y coherente.

## Contexto del producto

**Qué es:** aplicación web de sugerencias y planeación de viajes. El usuario busca vuelos, hospedaje y experiencias, los agrega a un viaje, y ve un presupuesto que se recalcula automáticamente según cuántas personas viajen. No se reserva ni se paga nada: es una herramienta de planeación y estimación.

**Referencia visual y funcional:** Booking.com. Quiero su claridad, su densidad informativa controlada y su patrón de "buscador prominente arriba, resultados en lista con acción clara a la derecha". No quiero que sea una copia: nuestro diferenciador es el presupuesto dinámico, y eso debe tener más protagonismo visual del que Booking le da a cualquier cosa.

**Público:** personas planeando un viaje en grupo (2 a 8 personas). Español de México, moneda MXN por omisión.

**Stack de implementación (esto condiciona tus decisiones):**
- React 19 + Vite
- Tailwind CSS **versión 3** estrictamente. Todo lo que propongas debe ser expresable con utilidades de Tailwind v3 o con tokens declarados en `tailwind.config.js`. No propongas nada que requiera Tailwind v4.
- Sin librería de componentes: los componentes se construyen a mano.
- Interfaz web adaptable. Diseña primero para escritorio (1280 px) y describe cómo colapsa en móvil (375 px).

## Datos reales del sistema

Diseña con estos datos, no con datos genéricos. Son los que la API devuelve de verdad.

**Roles:** invitado (sin sesión, solo puede buscar), viajero, administrador.

**Oferta de vuelo:** aerolínea, origen y destino en código IATA de 3 letras, fecha y hora de salida y llegada, número de escalas, precio, moneda. El precio de un vuelo siempre es **por persona**.

**Hospedaje:** nombre, dirección, categorías, sitio web, precio por noche. **Importante:** nuestro proveedor de lugares no entrega tarifas reales, así que el precio de hospedaje y de experiencias es una **estimación nuestra** y viene marcado con `estimated: true`. La interfaz tiene que comunicar eso con honestidad, sin que se vea como un error ni como letra chica escondida.

**Experiencia:** nombre, dirección, categorías, precio estimado. Los intereses que el usuario puede elegir son exactamente: cultura, naturaleza, gastronomía, aventura, vida nocturna, compras.

**Viaje:** título, ciudad de origen, ciudad de destino, fecha de salida, fecha de regreso, cantidad de viajeros (1 a 20), moneda, límite de presupuesto opcional.

**Concepto del itinerario (`TripItem`):** tipo (vuelo, hospedaje, experiencia u otro), título, precio unitario, moneda, cantidad, si es estimado, y un campo crítico llamado `pricingMode` que define cómo escala el costo:

| Modo | Cómo escala | Ejemplo |
|---|---|---|
| `per_person` | precio × viajeros | Vuelo, entrada a museo |
| `per_group` | no escala | Renta de auto, tour privado |
| `per_night_per_room` | precio × noches × habitaciones (1 habitación por cada 2 viajeros) | Hotel |
| `per_person_per_day` | precio × viajeros × días | Comidas, transporte local |

**Respuesta del presupuesto:** desglose por categoría (vuelos, hospedaje, experiencias, otros), subtotal, fondo de imprevistos (10 % por omisión, configurable), total, costo por persona, límite de presupuesto, indicador de exceso y monto restante.

**Estado degradado:** cuando un proveedor externo falla, la API responde con datos de respaldo y una bandera `degraded: true`. La interfaz debe avisarlo de forma visible pero no alarmante.

---

# Lo que necesito que entregues

## 1. Sistema de diseño

### 1.1 Paleta de colores
Define la paleta completa con **códigos HEX** y **justificación de accesibilidad**:

- Color primario (con su escala de 50 a 900, para poder declararla en `tailwind.config.js`)
- Color secundario o de acento
- Colores de fondo: fondo de página, fondo de superficie o tarjeta, fondo de sección destacada
- Colores de texto: primario, secundario, deshabilitado
- Colores de estado: **éxito**, **advertencia** (para presupuesto cerca del límite), **error crítico** (para presupuesto excedido) e **informativo** (para la etiqueta de precio estimado y el aviso de resultados degradados)
- Colores de borde y separadores

Para cada par texto-sobre-fondo que propongas, indica la **razón de contraste calculada** y si cumple **WCAG 2.1 AA** (4.5:1 para texto normal, 3:1 para texto grande y para componentes de interfaz). Si algún par no llega, dilo y propón el ajuste.

Considera además que el color no puede ser el único portador de significado: explica qué refuerzo no cromático usa cada estado (icono, texto, forma).

Entrega la paleta también como bloque `theme.extend.colors` listo para pegar en `tailwind.config.js`.

### 1.2 Tipografía
- Propón una o dos familias **sans-serif** modernas y legibles, disponibles en Google Fonts y fáciles de cargar en un proyecto Vite.
- Justifica la elección pensando en densidad de datos y en números: la aplicación muestra muchos precios, así que valora si conviene una fuente con cifras tabulares.
- Define la escala tipográfica completa (tamaño, peso, altura de línea y espaciado entre letras) para: título de pantalla, título de sección, título de tarjeta, texto de cuerpo, texto secundario, etiqueta, precio grande y precio pequeño.
- Expresa la escala con las clases de Tailwind v3 correspondientes.

### 1.3 Componentes de interfaz
Especifica estilo, estados y clases de Tailwind para:

- **Tarjeta de resultado** (vuelo, hospedaje y experiencia). Define su anatomía: qué información va arriba, qué va a la derecha, dónde el precio, dónde la acción. Estados: normal, con el cursor encima, seleccionada y ya agregada al viaje.
- **Botones:** primario, secundario, fantasma y destructivo. Para cada uno: tamaños, estados (normal, cursor encima, presionado, foco de teclado, deshabilitado, cargando) y cuándo usar cada variante.
- **Formularios:** campo de texto, selector, selector de fecha, contador numérico y campo con autocompletado. Incluye el estado de error con su mensaje, el texto de ayuda y el estilo del foco visible por teclado.
- **Barra de navegación superior:** dos versiones, una para visitante sin sesión y otra para usuario con sesión iniciada. Indica qué cambia cuando el usuario es administrador.
- **Etiquetas y distintivos:** precio estimado, resultados de respaldo, vuelo directo, presupuesto excedido.
- **Estados vacíos, de carga y de error** para las listas de resultados y para el itinerario.

---

## 2. Flujos de usuario detallados

Para cada módulo, describe el flujo completo de pantallas. Necesito saber **exactamente dónde está ubicado cada botón clave, qué acción ejecuta y a qué pantalla redirige**. Usa una tabla por flujo con estas columnas: pantalla origen, elemento, ubicación precisa, acción y destino.

### Módulo A — Identidad y acceso

- **Punto de entrada:** ¿dónde ubicamos el acceso principal a iniciar sesión? Considera que el buscador debe funcionar sin registro, así que el registro tiene que aparecer en el momento correcto, no como muro de entrada.
- **Inicio de sesión y registro:** flujo por correo y contraseña, más un botón destacado para entrar con Google. Define la jerarquía entre ambas opciones y dónde va el separador.
- Contempla estos estados reales: credenciales inválidas (mensaje genérico, no decimos si falló el correo o la contraseña), cuenta bloqueada temporalmente tras cinco intentos, y contraseña que debe tener 12 caracteres como mínimo (¿cómo comunicamos el requisito sin frustrar?).
- **Qué pasa después de entrar:** a dónde llega el usuario y cómo recupera lo que estaba haciendo si venía de una búsqueda.
- **Panel de administración:** interfaz para listar usuarios con búsqueda y paginación, cambiar el rol de un usuario, y consultar la bitácora de auditoría. Considera que cambiar un rol es una acción sensible: define la confirmación. Un administrador no puede cambiar su propio rol; muestra cómo se comunica esa restricción.

### Módulo B — Descubrimiento de vuelos y hospedaje

- **Buscador central:** cómo estructurar los campos. Para vuelos: origen y destino en código IATA, fecha de salida, cantidad de viajeros (1 a 9) y clase de cabina. Para hospedaje: ciudad, entrada, salida y viajeros. Resuelve cómo convivir ambos buscadores sin duplicar la pantalla: ¿pestañas, selector de tipo, o buscador unificado? Justifica tu elección comparándola con cómo lo resuelve Booking.
- El código IATA es un obstáculo real de usabilidad: casi nadie sabe que Cancún es CUN. Propón cómo lo resolvemos sin perder el dato que la API necesita.
- **Tarjetas de resultados:** define la anatomía para vuelos (aerolínea, ruta, horarios, escalas, precio por persona y total del grupo) y para hospedaje (nombre, dirección, categorías, precio por noche).
- **Dónde colocamos la etiqueta de "precio estimado"** en la tarjeta de hospedaje y de experiencia, de forma que sea imposible de pasar por alto pero no domine visualmente el precio. Explica tu razonamiento.
- **Dónde colocamos el botón "Agregar al viaje"** y qué pasa cuando el usuario aún no tiene ningún viaje creado, o tiene varios. Diseña ese momento con cuidado: es el punto donde el descubrimiento se convierte en planeación y es donde más se pierde gente.
- Cómo se ve el aviso cuando los resultados vienen de datos de respaldo.

### Módulo C — Viajes, experiencias y presupuesto (el núcleo del producto)

- **Listado de viajes y creación:** cómo se ve la lista, dónde está el botón de crear y cómo es el formulario de creación.
- **Gestor de itinerario:** cómo organizamos los conceptos agregados. Evalúa al menos dos alternativas —agrupar por tipo (vuelos, hospedaje, experiencias) o por día del viaje— y recomienda una con argumentos. Define cómo se edita la cantidad de un concepto y cómo se elimina.
- **Motor de presupuesto dinámico.** Esta es la vista más importante del producto. Necesito una interfaz donde el usuario cambie la cantidad de viajeros con un control deslizante o con botones y vea el presupuesto recalcularse. Resuelve:
  - ¿Deslizador, botones de más y menos, o ambos? Justifica considerando que el rango va de 1 a 20.
  - Cómo se comunica visualmente que el número cambió y el total se está recalculando, sin que la cifra "brinque" de forma desconcertante.
  - Cómo se muestra el desglose por categoría y cómo se hace evidente que **no todos los conceptos escalan igual** (el vuelo se duplica, el tour privado no). Este es el concepto más difícil de comunicar del producto entero y quiero una propuesta concreta.
  - Dónde vive este panel respecto al itinerario: ¿columna lateral fija, panel inferior adherido, o pantalla aparte?
- **Alertas financieras:**
  - Dónde y cómo mostramos el fondo de imprevistos del 10 %, dejando claro que es una línea separada del subtotal y no un cargo oculto. Incluye cómo se edita ese porcentaje.
  - Cómo se ve la alerta cuando el plan supera el límite de presupuesto que el usuario definió: qué cambia en la pantalla, qué tan intrusivo debe ser, y qué acción le ofrecemos para resolverlo (no basta con avisar, hay que ayudar a corregir).
  - Define también el estado intermedio: cerca del límite pero sin superarlo.

---

## 3. Estructura de pantallas

Genera un **wireframe en texto** de la pantalla **"Detalle del viaje y presupuesto"**, que es la pantalla más importante del sistema. Incluye:

- Disposición de columnas con proporciones concretas, en versión de escritorio a 1280 px.
- Barra de navegación superior y encabezado del viaje.
- Menú o navegación lateral si lo consideras necesario, justificando si sí o si no.
- Ubicación exacta de cada llamada a la acción y su jerarquía visual.
- Jerarquía de la información: qué se lee primero, segundo y tercero, y por qué.
- Cómo colapsa esa misma pantalla en móvil a 375 px, incluyendo qué se vuelve adherido, qué se colapsa y qué se oculta tras un gesto.

Acompaña el wireframe con una explicación breve de cada decisión de disposición.

---

## Formato de entrega

1. Entrega primero el sistema de diseño, después los flujos y al final el wireframe.
2. Usa tablas para los flujos y para las escalas de color y tipografía.
3. Incluye los bloques de configuración de Tailwind listos para pegar.
4. Al final, agrega una sección de **"decisiones que tomé y por qué"** con las tres o cuatro elecciones más discutibles, y una de **"lo que recomiendo probar con usuarios"**.
5. Si algo de lo que pido entra en conflicto con una buena práctica de accesibilidad o de usabilidad, dilo y propón la alternativa en lugar de obedecer sin más.
6. Todo el texto de la interfaz debe estar en español de México, redactado como lo escribiría un producto real: claro, breve y sin tecnicismos dirigidos al usuario final.

Adicionalmente, si puedes generar un mockup interactivo en HTML con Tailwind de la pantalla "Detalle del viaje y presupuesto" —con el control de viajeros funcionando y el presupuesto recalculándose en el navegador— hazlo al final como pieza aparte.

---
