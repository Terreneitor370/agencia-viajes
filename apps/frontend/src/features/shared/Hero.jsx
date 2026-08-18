/**
 * Encabezado hero para las pantallas de descubrimiento. DUENO: Kassie (modulo B).
 *
 * Imagen de fondo (Unsplash) + overlay oscuro para mantener el contraste del
 * titulo (WCAG) + tarjeta blanca donde vive el buscador. Si la imagen no
 * carga, se oculta y queda solo el degradado azul: nunca se ve en blanco.
 */
import { useState } from 'react';

export default function Hero({ image, eyebrow, title, subtitle, children }) {
  const [broken, setBroken] = useState(false);

  return (
    <section className="relative overflow-hidden rounded-lg bg-azul-800 shadow-elevada">
      {!broken && image && (
        <img
          src={image}
          alt=""
          aria-hidden="true"
          loading="eager"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-azul-800/80 via-azul-700/70 to-tinta-900/85" aria-hidden="true" />

      <div className="relative px-4 py-8 sm:px-6">
        {eyebrow && <p className="text-etiqueta uppercase text-azul-100">{eyebrow}</p>}
        <h1 className="mt-1 text-titulo text-white">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-cuerpo text-azul-100">{subtitle}</p>}

        {children && <div className="mt-5 rounded-lg bg-white p-4 shadow-elevada">{children}</div>}
      </div>
    </section>
  );
}
