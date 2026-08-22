/**
 * Distintivos y etiquetas. DUENO: core compartido.
 *
 * Regla de accesibilidad que impone este componente: el color nunca es el
 * unico portador del significado. Cada tono trae ademas un icono, para que
 * alguien con daltonismo o mirando una pantalla mal calibrada siga
 * distinguiendo los cuatro estados. Iconos de lucide-react, no glifos Unicode
 * ni emojis -- politica del proyecto.
 */
import { Check, Info, RotateCcw, Star, TriangleAlert } from 'lucide-react';

const TONOS = {
  info: { clases: 'bg-azul-50 text-azul-700 border-azul-100', Icono: Info },
  exito: { clases: 'bg-exitoSuave text-exito border-exito/20', Icono: Check },
  oferta: { clases: 'bg-ambar-50 text-ambar-700 border-ambar-100', Icono: Star },
  critico: { clases: 'bg-criticoSuave text-critico border-critico/25', Icono: TriangleAlert },
  neutro: { clases: 'bg-lienzo text-tinta-700 border-borde', Icono: null },
  respaldo: { clases: 'bg-lienzo text-tinta-700 border-bordeFuerte border-dashed', Icono: RotateCcw },
};

export default function Distintivo({ tono = 'neutro', simbolo: Simbolo, children, className = '' }) {
  const t = TONOS[tono] ?? TONOS.neutro;
  const Icono = Simbolo ?? t.Icono;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold leading-tight ${t.clases} ${className}`}
    >
      {Icono && <Icono className="h-3 w-3 shrink-0" aria-hidden="true" />}
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
