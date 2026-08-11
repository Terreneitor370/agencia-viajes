/** Rutas de experiencias. DUENO: integrante C. */
import { lazy, Suspense } from 'react';

const ExperiencesPage = lazy(() => import('./pages/ExperiencesPage'));
const load = (C) => <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando...</div>}><C /></Suspense>;

export default [{ path: 'experiencias', element: load(ExperiencesPage) }];
