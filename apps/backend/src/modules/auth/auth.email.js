/**
 * Envio del codigo de un solo uso: confirmacion de correo al registrarse, o
 * el mismo codigo retomado en el login si esa verificacion quedo pendiente.
 * DUENO: Isa (modulo A).
 *
 * OJO arquitectonico: esto es el UNICO lugar del backend que sale a la red
 * sin pasar por core/httpClient.js. Es a proposito, no un descuido: SMTP no
 * es HTTP, asi que el punto unico de egress (y su lista blanca en
 * core/security/guards.js) no aplica aqui, igual que no aplicaria a una
 * conexion de base de datos. El unico endpoint SMTP posible es el que se
 * configura en SMTP_HOST vía variable de entorno, nunca con input del
 * usuario, asi que no hay superficie de SSRF que tapar.
 */
const nodemailer = require('nodemailer');
const env = require('../../config/env');
const logger = require('../../core/logger');
const ApiError = require('../../core/ApiError');

const TIMEOUT_MS = 8000;
const MAX_INTENTOS = 2; // mismo criterio que MAX_RETRIES en core/httpClient.js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const estaConfigurado = () => Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);

let transporte = null;
function obtenerTransporte() {
  if (!transporte) {
    transporte = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      connectionTimeout: TIMEOUT_MS,
      greetingTimeout: TIMEOUT_MS,
      socketTimeout: TIMEOUT_MS,
    });
  }
  return transporte;
}

/**
 * Copys por proposito. "registro" es el codigo que confirma que el correo es
 * de quien esta creando la cuenta; "login" es ese mismo codigo retomado
 * porque la cuenta todavia no se habia verificado (no es un segundo factor
 * de cada inicio de sesion, solo pasa mientras siga pendiente). Mismo
 * mecanismo (ver auth.service.js#startOtpChallenge), solo cambia como se presenta.
 */
const COPYS = {
  registro: {
    asunto: (codigo) => `${codigo} es tu codigo para confirmar tu correo en Viaja`,
    titulo: 'Confirma tu correo',
    descripcion: 'Ingresa este codigo para terminar de crear tu cuenta en Viaja.',
    piePreventivo: 'Si tu no creaste esta cuenta, ignora este correo: no se activara sin este codigo.',
  },
  login: {
    asunto: (codigo) => `${codigo} es tu codigo de acceso a Viaja`,
    titulo: 'Verifica tu acceso',
    descripcion: 'Ingresa este codigo para iniciar sesion en Viaja.',
    piePreventivo: 'Si tu no intentaste iniciar sesion, ignora este correo: tu cuenta sigue segura.',
  },
};

/**
 * HTML con tablas y estilos inline: los clientes de correo (Gmail, Outlook)
 * no cargan hojas de estilo externas ni respetan flexbox/grid con
 * consistencia, tablas + inline es lo unico que se ve igual en todos.
 * Colores calcados de tailwind.config.js (azul/ambar/tinta/lienzo/borde) y el
 * mismo degradado que el header de la app (bg-marca) para que se sienta como
 * el mismo producto.
 */
function plantillaCodigo({ titulo, descripcion, piePreventivo, codigo }) {
  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#F1F3F7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F3F7;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background-color:#FFFFFF;border:1px solid #DCE1E9;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#0B5B93;background-image:linear-gradient(100deg,#093F82 0%,#0B5B93 50%,#0E7480 100%);padding:20px 32px;">
                <span style="font-size:20px;font-weight:700;color:#FFFFFF;">Viaja<span style="color:#F5A524;">.</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#10192B;">${titulo}</h1>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#5A6478;">${descripcion}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="background-color:#F1F3F7;border-radius:8px;padding:20px 0;">
                      <span style="font-family:Consolas,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:0.35em;color:#0B57B2;">${codigo}</span>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#5A6478;">
                  Vence en ${env.OTP_TTL_MINUTES} minutos. ${piePreventivo}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Codigo de un solo uso: confirmacion de correo al registrarse, o segundo factor de login. */
async function enviarCodigoAcceso(destinatario, codigo, proposito = 'login') {
  if (!estaConfigurado()) {
    logger.warn('SMTP no configurado: no se pudo enviar el codigo de acceso');
    throw ApiError.internal('El envio de correo no esta disponible en este momento');
  }
  const copy = COPYS[proposito] || COPYS.login;
  const mensaje = {
    from: env.SMTP_FROM,
    to: destinatario,
    subject: copy.asunto(codigo),
    text: `${copy.titulo}\n\n${copy.descripcion}\n\nTu codigo: ${codigo}\n`
      + `Vence en ${env.OTP_TTL_MINUTES} minutos.\n\n${copy.piePreventivo}`,
    html: plantillaCodigo({ ...copy, codigo }),
  };

  let ultimoError;
  for (let intento = 0; intento <= MAX_INTENTOS; intento += 1) {
    try {
      await obtenerTransporte().sendMail(mensaje);
      return;
    } catch (err) {
      ultimoError = err;
      // TLS/red intermitente (comun en Windows con antivirus inspeccionando
      // el handshake) es justo lo que un segundo intento suele resolver.
      // Un rechazo real de credenciales no se arregla reintentando, pero
      // tampoco cuesta mucho intentarlo dos veces mas antes de rendirse.
      logger.warn('Intento de envio de correo fallido', { intento: intento + 1, message: err.message });
      if (intento < MAX_INTENTOS) await sleep(500 * 2 ** intento);
    }
  }
  logger.error('Fallo el envio del codigo de acceso tras reintentar', { message: ultimoError.message });
  throw ApiError.upstream('No se pudo enviar el correo con el codigo de acceso');
}

module.exports = { estaConfigurado, enviarCodigoAcceso };
