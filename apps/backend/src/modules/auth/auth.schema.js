/**
 * Contratos de entrada del modulo Identidad. DUENO: Isa (modulo A).
 * `.strict()` es obligatorio: descarta cualquier campo no declarado.
 * Es lo que impide un mass assignment del tipo { email, password, role: "admin" }.
 */
const { z } = require('zod');

const email = z.string().trim().toLowerCase().email('Correo invalido').max(160);

// Letras (incluye acentos/enie via \p{L}), espacios, apostrofe y guion: cubre
// nombres compuestos ("Ana Maria", "Jean-Paul", "O'Brien") sin aceptar digitos.
const name = z.string().trim().min(2).max(80)
  .regex(/^[\p{L}\s'-]+$/u, 'El nombre solo puede tener letras y espacios');

/**
 * Politica de contrasena alineada a NIST SP 800-63B: se prioriza la longitud
 * sobre la complejidad artificial, y se prohiben las contrasenas obvias.
 */
const password = z.string()
  .min(12, 'Minimo 12 caracteres')
  .max(128, 'Maximo 128 caracteres')
  .refine((v) => !/^(?:password|contrasena|12345678|qwerty)/i.test(v), 'Contrasena demasiado comun');

const registerSchema = z.object({
  name,
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

const verifyOtpSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/, 'El codigo debe tener 6 digitos'),
}).strict();

const resendOtpSchema = z.object({
  challengeId: z.string().uuid(),
}).strict();

const forgotPasswordSchema = z.object({
  email,
}).strict();

const resetPasswordSchema = z.object({
  email,
  code: z.string().regex(/^\d{6}$/, 'El codigo debe tener 6 digitos'),
  newPassword: password,
}).strict();

// Sin .strict(): esto no es un formulario que llena nuestro usuario, es un
// redirect que arma Google. Google agrega parametros propios (tipicamente
// `scope`) que no controlamos; rechazarlos tumbaba un login valido con
// "solicitud invalida". Los campos que no nos interesan simplemente se
// descartan (comportamiento por defecto de Zod), code/state se siguen
// validando igual de estricto.
const googleCallbackSchema = z.object({
  code: z.string().min(10).max(512),
  state: z.string().min(10).max(256), // anti-CSRF del flujo OAuth
});

module.exports = {
  registerSchema, loginSchema, changePasswordSchema, googleCallbackSchema, verifyOtpSchema, resendOtpSchema,
  forgotPasswordSchema, resetPasswordSchema,
  // Se reexporta porque modules/users/users.routes.js necesita el mismo
  // patron para el nombre en la edicion de perfil: un solo lugar donde vive
  // la regla, nunca dos copias que se puedan desalinear.
  name,
};
