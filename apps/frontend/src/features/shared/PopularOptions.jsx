/**
 * Sugerencias de inicio para las pantallas de descubrimiento: rutas y destinos
 * populares que llenan el buscador y disparan la busqueda de un clic.
 * DUENO: Kassie (modulo B).
 */
export default function PopularOptions({ eyebrow, title, subtitle, items, onPick }) {
  return (
    <section>
      {eyebrow && <p className="text-etiqueta uppercase text-tinta-500">{eyebrow}</p>}
      <h2 className="mt-1 text-seccion text-tinta-900">{title}</h2>
      {subtitle && <p className="mt-1 text-cuerpo text-tinta-500">{subtitle}</p>}

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, idx) => (
          <button
            key={item.key || idx}
            type="button"
            onClick={() => onPick(item)}
            className="rounded-lg border border-borde bg-superficie px-4 py-3 text-left shadow-tarjeta transition-colors hover:border-azul-400 hover:shadow-elevada"
          >
            <p className="text-tarjeta text-tinta-900">{item.label}</p>
            {item.hint && <p className="mt-0.5 text-menor text-tinta-500">{item.hint}</p>}
          </button>
        ))}
      </div>
    </section>
  );
}
