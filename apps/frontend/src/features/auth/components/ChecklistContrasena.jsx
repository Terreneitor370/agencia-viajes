/**
 * DUENO: Isa (modulo A).
 *
 * Solo 2 criterios porque son los 2 unicos que auth.schema.js valida de
 * verdad. A proposito NO se agregan mayuscula/minuscula/numero/simbolo: esa
 * complejidad compuesta es justo lo que el proyecto rechaza siguiendo NIST SP
 * 800-63B (ver el comentario en auth.schema.js) a favor de longitud + lista
 * de contrasenas comunes. Un checklist mas largo prometeria una regla que el
 * backend no aplica.
 */
import { LONGITUD_MINIMA_CONTRASENA } from '../utils/contrasena';

function Item({ cumple, children }) {
  return (
    <li className={`flex items-center gap-1.5 ${cumple ? 'text-exito' : 'text-tinta-500'}`}>
      <span aria-hidden="true">{cumple ? '✓' : '○'}</span>
      {children}
    </li>
  );
}

export default function ChecklistContrasena({ contrasena }) {
  const cumpleLongitud = contrasena.longitud >= LONGITUD_MINIMA_CONTRASENA;
  const cumpleNoComun = contrasena.longitud > 0 && !contrasena.comun;

  return (
    <ul aria-live="polite" className="mt-1.5 space-y-1 text-menor">
      <Item cumple={cumpleLongitud}>
        Minimo {LONGITUD_MINIMA_CONTRASENA} caracteres ({contrasena.longitud} de {LONGITUD_MINIMA_CONTRASENA})
      </Item>
      <Item cumple={cumpleNoComun}>
        No es una contraseña muy comun
      </Item>
    </ul>
  );
}
