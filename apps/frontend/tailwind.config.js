import defaultTheme from 'tailwindcss/defaultTheme';

/**
 * Tokens del sistema de diseno "Viaja".
 * DUENO: core compartido. Congelado tras el dia 0.
 *
 * Azul de confianza + ambar de oferta. El ambar se reserva para lo que habla
 * de dinero a favor (precio por persona, ahorro, mejor precio). Rojo y verde
 * solo para estados, nunca decorativos.
 *
 * Contrastes verificados con la formula WCAG 2.1 (no son estimaciones):
 *   azul.600 sobre blanco ........ 6.95:1  AA
 *   azul.700 sobre blanco ....... 10.27:1  AAA
 *   exito sobre blanco ........... 5.41:1  AA
 *   ambar.700 sobre blanco ....... 5.93:1  AA
 *   critico sobre blanco ......... 5.66:1  AA
 *   tinta.900 sobre lienzo ...... 15.81:1  AAA
 *   tinta.500 sobre blanco ....... 5.95:1  AA
 *
 * DOS REGLAS QUE NO SE PUEDEN ROMPER:
 *
 * 1. ambar.400 NUNCA lleva texto blanco encima: da 2.04:1 y es ilegible.
 *    Sobre ambar.400 siempre va ambar.900 (6.73:1). El componente Boton y el
 *    componente Distintivo ya lo imponen, no lo escribas a mano.
 *
 * 2. tinta.300 da 3.05:1 sobre blanco, asi que NO alcanza para texto normal.
 *    Es solo para marcador de posicion, texto deshabilitado y separadores.
 *    Para texto informativo secundario usa tinta.500.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        azul: {
          50: '#EAF2FD', 100: '#CFE2FA', 200: '#A5C8F4', 300: '#6BA4EA',
          400: '#3B85DE', 500: '#1B72D9', 600: '#0B57B2', 700: '#093F82', 800: '#062B5C',
        },
        ambar: {
          50: '#FFF7E6', 100: '#FDECC4', 400: '#F5A524', 700: '#8A5A00',
          900: '#3D2A00', // unica tinta legible sobre ambar.400
        },
        exito: '#067A46',
        exitoSuave: '#E6F4EC',
        critico: '#C42B1F',
        criticoSuave: '#FDECEA',

        lienzo: '#F1F3F7',
        superficie: '#FFFFFF',
        realce: '#EAF2FD',

        tinta: { 900: '#10192B', 700: '#333F55', 500: '#5A6478', 300: '#8B94A5' },

        borde: '#DCE1E9',        // separadores decorativos
        bordeFuerte: '#B9C2D0',  // enfasis de tarjeta
        /**
         * Borde de controles interactivos (campos, selectores, casillas).
         * AGREGADO respecto al diseno original: el WCAG 1.4.11 exige 3:1 para
         * el limite de un componente de interfaz, y bordeFuerte solo llega a
         * 1.80:1. Este da 4.09:1 sobre blanco y 3.68:1 sobre lienzo.
         */
        bordeInteractivo: '#767E8C',
      },

      fontFamily: {
        sans: ['Poppins', ...defaultTheme.fontFamily.sans],
      },

      fontSize: {
        titulo: ['26px', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        seccion: ['17px', { lineHeight: '1.3', fontWeight: '600' }],
        tarjeta: ['15px', { lineHeight: '1.35', fontWeight: '600' }],
        cuerpo: ['13.5px', { lineHeight: '1.6' }],
        menor: ['12.5px', { lineHeight: '1.5' }],
        etiqueta: ['11px', { lineHeight: '1.4', letterSpacing: '0.08em', fontWeight: '600' }],
        precio: ['30px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        precioSm: ['15px', { lineHeight: '1.2', fontWeight: '700' }],
      },

      borderRadius: {
        // Radio corto: lenguaje de agencia, no de aplicacion de consumo.
        DEFAULT: '6px', md: '6px', lg: '8px', xl: '10px',
      },

      backgroundImage: {
        marca: 'linear-gradient(100deg,#093F82 0%,#0B5B93 50%,#0E7480 100%)',
      },

      boxShadow: {
        tarjeta: '0 1px 2px rgba(16,25,43,.06)',
        elevada: '0 4px 16px rgba(16,25,43,.10)',
        hoja: '0 -4px 20px rgba(16,25,43,.12)', // hoja adherida en movil
      },

      transitionDuration: {
        realce: '400ms', // el realce de fondo al recalcular el total
      },
    },
  },
  plugins: [],
};
