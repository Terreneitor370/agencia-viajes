/** Rutas de viajes. DUENO: Jeshua (modulo C). */
import { lazy, Suspense } from 'react';
import { ProtectedRoute } from '../../core/guards/ProtectedRoute';

const TripsPage = lazy(() => import('./pages/TripsPage'));
const TripDetailPage = lazy(() => import('./pages/TripDetailPage'));
const load = (C) => <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando...</div>}><C /></Suspense>;

export default [
  { path: 'viajes', element: <ProtectedRoute>{load(TripsPage)}</ProtectedRoute> },
  { path: 'viajes/:id', element: <ProtectedRoute>{load(TripDetailPage)}</ProtectedRoute> },
];
