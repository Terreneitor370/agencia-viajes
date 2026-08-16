/** Rutas de cotizaciones de invitado. DUENO: Kassie (modulo B). */
import { lazy, Suspense } from 'react';

const QuotesPage = lazy(() => import('./pages/QuotesPage'));
const load = (C) => <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando...</div>}><C /></Suspense>;

export default [{ path: 'cotizaciones', element: load(QuotesPage) }];
