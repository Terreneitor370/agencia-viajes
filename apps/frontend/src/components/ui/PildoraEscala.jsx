/**
 * Pildora de modo de escalado. DUENO: core compartido.
 *
 * ESTE ES EL COMPONENTE MAS IMPORTANTE DEL SISTEMA DE DISENO.
 *
 * El problema que resuelve: un presupuesto de viaje no es una suma simple,
 * porque no todos los costos escalan igual cuando cambia el tamano del grupo.
 * El vuelo se duplica, el tour privado no. Si el usuario no entiende eso, el
 * recalculo le parece arbitrario y deja de confiar en la cifra.
 *
 * La solucion es decirlo en palabras, en cada renglon, antes de que el usuario
 * mueva el control de viajeros. No despues, no en un texto de ayuda: en el
 * renglon mismo.
 *
 * Los tres modulos DEBEN usar este componente. Que el modulo de vuelos escriba
 * "por persona" y el de viajes escriba "c/u" rompe el aprendizaje del usuario,
 * que es justo lo que estamos tratando de construir.
 */

const MODOS = {
  per_person: {
    etiqueta: 'Sube por persona',
    apagado: false,
    explicacion: 'Cada viajero que agregues suma otro cobro completo de este concepto.',
  },
  per_group: {
    etiqueta: 'No cambia con viajeros',
    apagado: true, // se muestra atenuado a proposito: es el que NO se mueve
    explicacion: 'Es un precio fijo por el grupo. Agregar personas no lo aumenta; lo reparte.',
  },
  per_night_per_room: {
    etiqueta: 'Sube cada 2 personas',
    apagado: false,
    explicacion: 'Calculamos una habitacion por cada dos viajeros, multiplicada por las noches.',
  },
  per_person_per_day: {
    etiqueta: 'Sube por persona y por dia',
    apagado: false,
    explicacion: 'Se multiplica por la cantidad de viajeros y por los dias del viaje.',
  },
};

export default function PildoraEscala({ modo, className = '' }) {
  const m = MODOS[modo];
  if (!m) return null;

  const tono = m.apagado
    ? 'bg-lienzo text-tinta-500 border-borde'
    : 'bg-azul-50 text-azul-700 border-azul-100';

  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold leading-tight ${tono} ${className}`}
      title={m.explicacion}
    >
      {m.etiqueta}
    </span>
  );
}

/** Version compacta para la tabla del simulador: solo el multiplicador. */
export function MultiplicadorEscala({ modo, viajeros, noches, habitaciones, dias, className = '' }) {
  const texto = {
    per_person: `×${viajeros}`,
    per_group: 'fijo',
    per_night_per_room: `×${noches}n ×${habitaciones}h`,
    per_person_per_day: `×${viajeros} ×${dias}d`,
  }[modo];

  if (!texto) return null;
  const apagado = modo === 'per_group';

  return (
    <span
      className={`inline-block min-w-[68px] rounded border px-2 py-0.5 text-center text-[11px] font-semibold tabular-nums ${
        apagado ? 'border-borde bg-lienzo text-tinta-500' : 'border-azul-100 bg-azul-50 text-azul-700'
      } ${className}`}
    >
      {texto}
    </span>
  );
}

export { MODOS as MODOS_ESCALA };
