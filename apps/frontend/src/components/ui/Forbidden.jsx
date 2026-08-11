import { Link } from 'react-router-dom';

export default function Forbidden() {
  return (
    <div className="py-20 text-center">
      <p className="text-5xl font-bold text-slate-300">403</p>
      <h1 className="mt-3 text-xl font-semibold">No tienes acceso a esta seccion</h1>
      <p className="mt-2 text-sm text-slate-500">
        Si crees que se trata de un error, contacta al administrador.
      </p>
      <Link to="/" className="mt-6 inline-block text-sky-700 hover:underline">Volver al inicio</Link>
    </div>
  );
}
