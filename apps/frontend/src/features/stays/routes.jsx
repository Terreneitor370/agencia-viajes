/** Rutas de hospedaje. DUENO: integrante B. */
import { lazy, Suspense } from 'react';

const StaysPage = lazy(() => import('./pages/StaysPage'));
const load = (C) => <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando...</div>}><C /></Suspense>;

export default [{ path: 'hospedaje', element: load(StaysPage) }];
