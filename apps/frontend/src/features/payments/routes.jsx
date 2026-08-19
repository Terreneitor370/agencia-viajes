import { lazy, Suspense } from 'react';
import { ProtectedRoute } from '../../core/guards/ProtectedRoute';

const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage'));
const load = (C) => <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando...</div>}><C /></Suspense>;

export default [
  { path: 'checkout', element: <ProtectedRoute>{load(CheckoutPage)}</ProtectedRoute> },
  { path: 'checkout/exito', element: <ProtectedRoute>{load(CheckoutSuccessPage)}</ProtectedRoute> },
];
