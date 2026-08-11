/**
 * Solo el objeto de contexto. Vive en su propio archivo para que el proveedor
 * (componente) y el hook (funcion) puedan estar separados sin importarse entre
 * si — que es lo que exige Fast Refresh de Vite.
 */
import { createContext } from 'react';

export const AuthContext = createContext(null);
