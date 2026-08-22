/**
 * Campo de formulario. DUENO: core compartido.
 *
 * Decisiones que impone:
 *  - El borde usa bordeInteractivo, no borde. El WCAG 1.4.11 exige 3:1 para el
 *    limite de un componente de interfaz y el gris claro del diseno original
 *    solo llegaba a 1.80:1.
 *  - El error se anuncia a lectores de pantalla con role="alert" y se enlaza al
 *    campo con aria-describedby.
 *  - El texto de ayuda va ANTES de escribir, no despues de fallar. El minimo de
 *    12 caracteres de la contrasena se anuncia de entrada; validarlo al enviar
 *    frustra.
 */
import { useId } from 'react';
import { TriangleAlert } from 'lucide-react';

export default function Campo({
  etiqueta,
  ayuda,
  error,
  sufijo,        // por ejemplo el distintivo IATA dentro del campo
  contador,      // por ejemplo "12 de 12"
  className = '',
  inputClassName = '',
  ...props
}) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;

  const bordes = error
    ? 'border-critico focus:border-critico'
    : 'border-bordeInteractivo focus:border-azul-600';

  return (
    <div className={className}>
      {etiqueta && (
        <label htmlFor={id} className="mb-1 block text-menor font-semibold text-tinta-700">
          {etiqueta}
          {ayuda && <span className="ml-1 font-normal text-tinta-500">· {ayuda}</span>}
        </label>
      )}

      <div className="relative">
        <input
          id={id}
          className={`h-11 w-full rounded-md border bg-superficie px-3 text-cuerpo text-tinta-900 placeholder:text-tinta-300 ${bordes} ${sufijo ? 'pr-16' : ''} ${inputClassName}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={[ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(' ') || undefined}
          {...props}
        />
        {sufijo && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{sufijo}</span>
        )}
      </div>

      {contador && !error && (
        <p className="mt-1 text-right text-menor text-tinta-500">{contador}</p>
      )}

      {error && (
        <p id={idError} role="alert" className="mt-1 flex items-start gap-1 text-menor text-critico">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 translate-y-0.5" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
