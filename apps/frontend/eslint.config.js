import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * ESLint del frontend.
 *
 * Además del estilo, aquí hay dos reglas que son controles de seguridad
 * (ver docs/SEGURIDAD.md § A03 y § A02). Si necesitas saltártelas, no las
 * desactives en el archivo: discútelo en el PR.
 */
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // XSS: React escapa por defecto; esta propiedad es la única forma de
          // desactivar esa protección. En este proyecto está prohibida.
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message: 'Prohibido dangerouslySetInnerHTML (XSS). Si de verdad lo necesitas, discútelo en el PR.',
        },
        {
          // La sesión vive en cookies httpOnly. Guardar un token en
          // localStorage lo vuelve legible por cualquier XSS.
          selector: 'MemberExpression[object.name=/^(localStorage|sessionStorage)$/]',
          message: 'No guardes datos de sesión en localStorage/sessionStorage. La sesión va en cookies httpOnly.',
        },
      ],
      'no-console': ['warn', { allow: ['error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    /**
     * Los manifiestos de rutas de cada módulo exportan un arreglo de rutas,
     * no un componente. Fast Refresh no aplica a ellos, así que la regla
     * `only-export-components` es ruido aquí.
     */
    files: ['src/features/*/routes.jsx', 'src/app/router.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
