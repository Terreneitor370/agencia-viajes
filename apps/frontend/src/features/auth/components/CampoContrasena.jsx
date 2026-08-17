/**
 * DUENO: Isa (modulo A).
 * Envuelve Campo (core) en vez de modificarlo: usa el prop `sufijo` que ya
 * existe para esto exactamente. Asi el boton de mostrar/ocultar aplica a
 * todos los campos de contrasena sin tocar components/ui/Campo.jsx.
 */
import { useId, useState } from 'react';
import Campo from '../../../components/ui/Campo';

function IconoOjo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconoOjoTachado() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function CampoContrasena(props) {
  const [visible, setVisible] = useState(false);
  const idBoton = useId();

  return (
    <Campo
      {...props}
      type={visible ? 'text' : 'password'}
      sufijo={
        <button
          type="button"
          id={idBoton}
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Ocultar contrasena' : 'Mostrar contrasena'}
          className="text-tinta-300 hover:text-tinta-500"
        >
          {visible ? <IconoOjoTachado /> : <IconoOjo />}
        </button>
      }
    />
  );
}
