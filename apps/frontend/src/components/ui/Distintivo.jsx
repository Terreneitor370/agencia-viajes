/**
 * Distintivos y etiquetas. DUENO: core compartido.
 *
 * Regla de accesibilidad que impone este componente: el color nunca es el
 * unico portador del significado. Cada tono trae ademas un simbolo, para que
 * alguien con daltonismo o mirando una pantalla mal calibrada siga
 * distinguiendo los cuatro estados.
 */

const TONOS = {
  info: { clases: 'bg-azul-50 text-azul-700 border-azul-100', simbolo: 'ⓘ' },
  exito: { clases: 'bg-exitoSuave text-exito border-exito/20', simbolo: '✓' },
  oferta: { clases: 'bg-ambar-50 text-ambar-700 border-ambar-100', simbolo: '★' },
  critico: { clases: 'bg-criticoSuave text-critico border-critico/25', simbolo: '▲' },
  neutro: { clases: 'bg-lienzo text-tinta-700 border-borde', simbolo: '' },
  respaldo: { clases: 'bg-lienzo text-tinta-700 border-bordeFuerte border-dashed', simbolo: '↺' },
};

export default function Distintivo({ tono = 'neutro', simbolo, children, className = '' }) {
  const t = TONOS[tono] ?? TONOS.neutro;
  const glifo = simbolo ?? t.simbolo;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold leading-tight ${t.clases} ${className}`}
    >
      {glifo && <span aria-hidden="true">{glifo}</span>}
      {children}
    </span>
  );
}

/**
 * Etiqueta de precio estimado.
 *
 * Va ARRIBA del precio, no debajo. El ojo baja por la columna derecha hasta el
 * numero, asi que colocada arriba se lee como parte del precio; colocada abajo
 * se lee como nota al pie y se ignora. Es una decision de honestidad, no de
 * adorno: nuestro proveedor de lugares no entrega tarifas y el usuario tiene
 * que saberlo antes de leer la cifra.
 */
export function PrecioEstimado({ className = '' }) {
  return (
    <Distintivo
      tono="info"
      className={className}
      title="No es una tarifa del proveedor: la estimamos nosotros a partir de la categoria del lugar y el destino."
    >
      Precio estimado
    </Distintivo>
  );
}

/** Aviso de que los resultados vienen de datos de respaldo. */
export function DatosDeRespaldo({ className = '' }) {
  return <Distintivo tono="respaldo" className={className}>Datos de respaldo</Distintivo>;
}
