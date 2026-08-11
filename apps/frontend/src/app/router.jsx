/**
 * ROUTER CON AUTO-DESCUBRIMIENTO.
 *
 * Contraparte en el frontend del loader del backend, y por el mismo motivo:
 * eliminar el archivo central de rutas donde los 3 integrantes escribirian
 * en las mismas lineas. `import.meta.glob` (Vite) encuentra solos los
 * `features/<modulo>/routes.jsx`.
 *
 * Contrato de cada modulo: exportar por defecto un arreglo de objetos de ruta
 * de react-router. Agregar un modulo = crear un archivo nuevo. Cero conflictos.
 */
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import AppLayout from '../layouts/AppLayout';

// eager: false -> cada modulo se carga bajo demanda (code splitting por integrante)
const moduleRoutes = import.meta.glob('../features/*/routes.jsx', { eager: true });

const collected = Object.entries(moduleRoutes).flatMap(([path, mod]) => {
  const routes = mod.default;
  if (!Array.isArray(routes)) {
    console.error(`[router] ${path} no exporta por defecto un arreglo de rutas, se omite`);
    return [];
  }
  return routes;
});

const NotFound = lazy(() => import('../components/ui/NotFound'));
const Forbidden = lazy(() => import('../components/ui/Forbidden'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/buscar" replace /> },
      ...collected,
      { path: '403', element: <Suspense fallback={null}><Forbidden /></Suspense> },
      { path: '*', element: <Suspense fallback={null}><NotFound /></Suspense> },
    ],
  },
]);

export const registeredRouteCount = collected.length;
