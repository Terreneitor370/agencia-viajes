/** Rutas de descubrimiento (vuelos + hospedaje). DUENO: Kassie (modulo B). */
import { lazy, Suspense } from 'react';

const SearchPage = lazy(() => import('./pages/SearchPage'));
const load = (C) => <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando...</div>}><C /></Suspense>;

export default [
  { path: 'buscar', element: load(SearchPage) },
];
