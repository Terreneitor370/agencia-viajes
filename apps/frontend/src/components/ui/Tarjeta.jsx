/**
 * Superficie base. DUENO: core compartido.
 * Borde fino de 1 px y radio corto: lenguaje de agencia, no de red social.
 */
export default function Tarjeta({ children, className = '', comoElemento: Elemento = 'div', ...props }) {
  return (
    <Elemento
      className={`rounded-lg border border-borde bg-superficie shadow-tarjeta ${className}`}
      {...props}
    >
      {children}
    </Elemento>
  );
}

/** Encabezado de seccion del itinerario: titulo a la izquierda, subtotal a la derecha. */
export function EncabezadoSeccion({ titulo, monto, children }) {
  return (
    <div className="flex items-center justify-between border-b border-borde bg-lienzo px-4 py-2.5">
      <h3 className="etiqueta-seccion">{titulo}</h3>
      <div className="flex items-center gap-3">
        {children}
        {monto != null && <span className="precio-col-sm text-tarjeta text-tinta-900">{monto}</span>}
      </div>
    </div>
  );
}
