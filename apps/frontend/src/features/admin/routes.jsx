/** Rutas del backoffice. DUENO: Isa (modulo A). */
import { lazy, Suspense } from 'react';
import { PermissionRoute } from '../../core/guards/ProtectedRoute';

const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const load = (C) => <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando...</div>}><C /></Suspense>;

export default [
  { path: 'admin', element: <PermissionRoute permission="user:read:any">{load(AdminUsersPage)}</PermissionRoute> },
  { path: 'admin/auditoria', element: <PermissionRoute permission="audit:read">{load(AuditLogPage)}</PermissionRoute> },
];
