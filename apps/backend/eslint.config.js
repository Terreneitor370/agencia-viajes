const js = require('@eslint/js');
const globals = require('globals');

/**
 * ESLint del backend.
 *
 * Mas alla del estilo, aqui hay reglas que son controles de seguridad:
 * el linter detiene en el editor lo que despues seria un hallazgo en el pentest.
 */
module.exports = [
  { ignores: ['node_modules/**', 'coverage/**', 'db/**'] },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,

      // --- Reglas con intencion de seguridad -------------------------
      // Prohibe eval y compañia: ejecucion dinamica de codigo.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      // Prohibe console.log: obliga a usar core/logger, que redacta secretos.
      'no-console': ['error', { allow: ['error'] }],
      // Prototype pollution.
      'no-proto': 'error',
      'no-extend-native': 'error',
      // Errores tragados en silencio.
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^(_|next$)', varsIgnorePattern: '^_' }],
      // await dentro de try/catch mal escrito.
      'require-atomic-updates': 'error',
      'no-return-await': 'error',

      // --- Estilo minimo acordado ------------------------------------
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // Los archivos de prueba pueden imprimir en consola.
    files: ['tests/**/*.js', 'scripts/**/*.js'],
    rules: { 'no-console': 'off' },
  },
];
