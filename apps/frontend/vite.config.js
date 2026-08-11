import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    /**
     * Proxy hacia el backend.
     *
     * Motivo de seguridad, no solo comodidad: con el proxy, navegador y API
     * comparten origen (http://localhost:5173). Eso permite usar cookies
     * SameSite sin excepciones y reduce la superficie de CORS a cero en
     * desarrollo. Ademas, el codigo del frontend nunca conoce la URL real
     * del backend ni ninguna clave de proveedor.
     */
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: false, // no publicar el codigo fuente original en produccion
  },
});
