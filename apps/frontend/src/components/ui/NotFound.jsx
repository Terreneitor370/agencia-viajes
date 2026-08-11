import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <h1 className="mt-3 text-xl font-semibold">Esta pagina no existe</h1>
      <Link to="/" className="mt-6 inline-block text-sky-700 hover:underline">Volver al inicio</Link>
    </div>
  );
}
