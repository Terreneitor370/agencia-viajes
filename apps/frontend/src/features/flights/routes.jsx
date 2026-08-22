/** Rutas de descubrimiento (vuelos + hospedaje). DUENO: Kassie (modulo B). */
import { lazy, Suspense } from 'react';
import { ProtectedRoute } from '../../core/guards/ProtectedRoute';

const SearchPage = lazy(() => import('./pages/SearchPage'));
const SeatSelectionPage = lazy(() => import('./pages/SeatSelectionPage'));
const load = (C) => <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando...</div>}><C /></Suspense>;

// Vuelos requiere sesion iniciada (a diferencia de hospedaje/experiencias).
// Antes se podia buscar y elegir asientos sin sesion, y al llegar al login
// el paso 2 se perdia -- habia una ruta de "retomar pendiente" para eso, pero
// crea friccion. Mas simple exigir sesion desde el principio del flujo.
export default [
  { path: 'buscar', element: <ProtectedRoute>{load(SearchPage)}</ProtectedRoute> },
  { path: 'asientos', element: <ProtectedRoute>{load(SeatSelectionPage)}</ProtectedRoute> },
];
