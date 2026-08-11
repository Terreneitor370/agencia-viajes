/**
 * Contratos de entrada del modulo Identidad. DUENO: integrante A.
 * `.strict()` es obligatorio: descarta cualquier campo no declarado.
 * Es lo que impide un mass assignment del tipo { email, password, role: "admin" }.
 */
const { z } = require('zod');

const email = z.string().trim().toLowerCase().email('Correo invalido').max(160);

/**
 * Politica de contrasena alineada a NIST SP 800-63B: se prioriza la longitud
 * sobre la complejidad artificial, y se prohiben las contrasenas obvias.
 */
const password = z.string()
  .min(12, 'Minimo 12 caracteres')
  .max(128, 'Maximo 128 caracteres')
  .refine((v) => !/^(?:password|contrasena|12345678|qwerty)/i.test(v), 'Contrasena demasiado comun');

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  password,
  // OJO: aqui NO existe el campo `role`. El rol lo asigna el servidor (siempre 'traveler').
}).strict();

const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
}).strict();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
}).strict();

const googleCallbackSchema = z.object({
  code: z.string().min(10).max(512),
  state: z.string().min(10).max(256), // anti-CSRF del flujo OAuth
}).strict();

module.exports = { registerSchema, loginSchema, changePasswordSchema, googleCallbackSchema };
