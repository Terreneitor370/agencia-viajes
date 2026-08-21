/**
 * Comprobante de pago por correo. DUENO: Kassie (modulo B).
 *
 * Mismo patron de transporte/reintentos que auth.email.js, pero
 * deliberadamente NUNCA relanza: el pago ya se cobro en Stripe cuando esto
 * se llama, asi que un correo que no sale no debe tumbar la confirmacion
 * del pago en si. Solo se deja constancia en el log.
 */
const nodemailer = require('nodemailer');
const env = require('../../config/env');
const logger = require('../../core/logger');

const TIMEOUT_MS = 8000;
const MAX_INTENTOS = 2;
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

const dinero = (cents, currency) => new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: currency || 'MXN',
}).format((cents || 0) / 100);

function filaConcepto(item, currency) {
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:#10192B;border-bottom:1px solid #EEF1F5;">${item.title} ${item.quantity > 1 ? `x${item.quantity}` : ''}</td>
    <td align="right" style="padding:8px 0;font-size:14px;color:#10192B;border-bottom:1px solid #EEF1F5;white-space:nowrap;">${dinero(item.subtotal_cents, currency)}</td>
  </tr>`;
}

/** Mismos estilos/tabla inline que auth.email.js: los clientes de correo no cargan CSS externo. */
function plantillaComprobante({ order, items }) {
  const filas = items.map((item) => filaConcepto(item, order.currency)).join('');
  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#F1F3F7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F3F7;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#FFFFFF;border:1px solid #DCE1E9;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#0B5B93;background-image:linear-gradient(100deg,#093F82 0%,#0B5B93 50%,#0E7480 100%);padding:20px 32px;">
                <span style="font-size:20px;font-weight:700;color:#FFFFFF;">Viaja<span style="color:#F5A524;">.</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#10192B;">Pago confirmado</h1>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#5A6478;">
                  Tu reserva quedo confirmada. Este es tu comprobante.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${filas}
                  <tr>
                    <td style="padding:12px 0 0;font-size:14px;font-weight:700;color:#10192B;">Total</td>
                    <td align="right" style="padding:12px 0 0;font-size:16px;font-weight:700;color:#0B57B2;white-space:nowrap;">${dinero(order.total_cents, order.currency)}</td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#5A6478;">
                  Numero de orden: ${order.id}
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

async function enviarComprobante(destinatario, order, items) {
  if (!estaConfigurado()) {
    logger.warn('SMTP no configurado: no se pudo enviar el comprobante de pago', { orderId: order.id });
    return;
  }

  const mensaje = {
    from: env.SMTP_FROM,
    to: destinatario,
    subject: `Comprobante de tu pago en Viaja · ${dinero(order.total_cents, order.currency)}`,
    text: `Pago confirmado.\n\nTotal: ${dinero(order.total_cents, order.currency)}\nOrden: ${order.id}\n\n`
      + items.map((item) => `- ${item.title}: ${dinero(item.subtotal_cents, order.currency)}`).join('\n'),
    html: plantillaComprobante({ order, items }),
  };

  let ultimoError;
  for (let intento = 0; intento <= MAX_INTENTOS; intento += 1) {
    try {
      await obtenerTransporte().sendMail(mensaje);
      return;
    } catch (err) {
      ultimoError = err;
      logger.warn('Intento de envio de comprobante fallido', { orderId: order.id, intento: intento + 1, message: err.message });
      if (intento < MAX_INTENTOS) await sleep(500 * 2 ** intento);
    }
  }
  logger.error('Fallo el envio del comprobante tras reintentar', { orderId: order.id, message: ultimoError.message });
}

module.exports = { enviarComprobante };
