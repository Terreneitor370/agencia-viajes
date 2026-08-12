/**
 * Boton del sistema de diseno. DUENO: core compartido.
 *
 * Nadie escribe clases de boton a mano: se usa este componente. Asi las cuatro
 * variantes se ven igual en los tres modulos y las reglas de contraste quedan
 * impuestas por codigo, no por disciplina.
 */

const VARIANTES = {
  // Accion principal de la pantalla. Solo una por vista.
  primario:
    'bg-azul-600 text-white hover:bg-azul-700 active:bg-azul-800 ' +
    'disabled:bg-tinta-300 disabled:text-white',

  // Accion alterna del mismo nivel de importancia.
  secundario:
    'bg-superficie text-azul-600 border border-azul-600 hover:bg-azul-50 ' +
    'active:bg-azul-100 disabled:text-tinta-300 disabled:border-borde',

  // Accion terciaria: no compite visualmente.
  fantasma:
    'bg-transparent text-azul-600 hover:bg-azul-50 active:bg-azul-100 ' +
    'disabled:text-tinta-300',

  // Quitar, eliminar, cancelar algo con consecuencia.
  destructivo:
    'bg-superficie text-critico border border-critico hover:bg-criticoSuave ' +
    'active:bg-critico active:text-white disabled:text-tinta-300 disabled:border-borde',

  // Confirmacion de una accion destructiva ya iniciada.
  destructivoSolido:
    'bg-critico text-white hover:brightness-110 active:brightness-95 ' +
    'disabled:bg-tinta-300',

  /**
   * Ambar: reservado para lo que habla de dinero a favor.
   * OJO: el texto va en ambar-900, nunca blanco. Sobre ambar-400 el blanco da
   * 2.04:1 y es ilegible. Por eso esta fijado aqui y no se pasa por props.
   */
  oferta:
    'bg-ambar-400 text-ambar-900 hover:brightness-105 active:brightness-95 ' +
    'disabled:bg-ambar-100 disabled:text-tinta-300',
};

const TAMANOS = {
  // 44px de alto: area de toque minima recomendada para movil.
  lg: 'h-11 px-5 text-tarjeta',
  md: 'h-10 px-4 text-cuerpo font-semibold',
  sm: 'h-8 px-3 text-menor font-semibold',
};

export default function Boton({
  variante = 'primario',
  tamano = 'md',
  cargando = false,
  anchoCompleto = false,
  iconoIzq = null,
  children,
  className = '',
  disabled,
  ...props
}) {
  const clases = [
    'inline-flex items-center justify-center gap-2 rounded-md',
    'transition-colors duration-150 select-none',
    'disabled:cursor-not-allowed',
    VARIANTES[variante] ?? VARIANTES.primario,
    TAMANOS[tamano] ?? TAMANOS.md,
    anchoCompleto ? 'w-full' : '',
    className,
  ].join(' ');

  return (
    <button
      type="button"
      className={clases}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...props}
    >
      {cargando ? (
        <>
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          <span>Un momento…</span>
        </>
      ) : (
        <>
          {iconoIzq}
          {children}
        </>
      )}
    </button>
  );
}
