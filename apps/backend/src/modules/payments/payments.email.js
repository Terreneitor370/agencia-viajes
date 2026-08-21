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

// timeZone: 'UTC' a proposito: mysql2 entrega las columnas DATE como
// medianoche UTC (ej. start_date "2026-09-21" llega como
// 2026-09-21T00:00:00.000Z). Formatear con la zona local del servidor
// corria el dia -1 (25 sep se veia como "24 de septiembre") en cualquier
// huso al oeste de UTC. Todo el calculo de este archivo se queda en UTC
// para no mezclar los dos sistemas.
const fechaLarga = (date) => new Intl.DateTimeFormat('es-MX', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
}).format(date);

/**
 * Agrupa por dia del viaje, mismo criterio que la vista "Por dia" del
 * detalle del viaje (TripDetailPage.jsx): item.meta.dayIndex (1-based) si
 * lo trae -- solo lo llevan las experiencias, que son las unicas con una
 * fecha de reservacion propia -- y si no, cae al primer dia. Los limites
 * del viaje (cuantos dias hay en total) salen de trip.start_date/end_date.
 */
function construirItinerario(trip, items) {
  if (!trip?.start_date || !trip?.end_date || !items.length) return [];

  const inicio = new Date(trip.start_date);
  const fin = new Date(trip.end_date);
  const noches = Math.max(1, Math.round((fin - inicio) / 86400000));
  const totalDias = noches + 1;

  const buckets = Array.from({ length: totalDias }, (_, index) => {
    const fecha = new Date(inicio);
    fecha.setUTCDate(fecha.getUTCDate() + index);
    return { numero: index + 1, fecha, items: [] };
  });

  for (const item of items) {
    const metaDay = Number(item.meta?.dayIndex ?? item.meta?.day ?? 1);
    const indice = Number.isFinite(metaDay)
      ? Math.max(0, Math.min(totalDias - 1, Math.round(metaDay) - 1))
      : 0;
    buckets[indice].items.push(item);
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
}

function filaConcepto(item, currency) {
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:#10192B;border-bottom:1px solid #EEF1F5;">${item.title} ${item.quantity > 1 ? `x${item.quantity}` : ''}</td>
    <td align="right" style="padding:8px 0;font-size:14px;color:#10192B;border-bottom:1px solid #EEF1F5;white-space:nowrap;">${dinero(item.subtotal_cents, currency)}</td>
  </tr>`;
}

function bloqueDia(bucket) {
  const conceptos = bucket.items.map((item) => `<li style="margin:0 0 4px;">${item.title}</li>`).join('');
  return `<div style="margin:0 0 16px;">
    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0B57B2;text-transform:uppercase;letter-spacing:0.04em;">
      Dia ${bucket.numero} · ${fechaLarga(bucket.fecha)}
    </p>
    <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.5;color:#10192B;">${conceptos}</ul>
  </div>`;
}

/** Mismos estilos/tabla inline que auth.email.js: los clientes de correo no cargan CSS externo. */
function plantillaComprobante({ order, items, itinerario }) {
  const filas = items.map((item) => filaConcepto(item, order.currency)).join('');
  const bloqueItinerario = itinerario.length
    ? `<h2 style="margin:0 0 12px;font-size:15px;color:#10192B;">Tu itinerario</h2>
       ${itinerario.map(bloqueDia).join('')}
       <div style="margin:20px 0;border-top:1px solid #EEF1F5;"></div>`
    : '';

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
                ${bloqueItinerario}
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

/** `trip` (con start_date/end_date) es opcional: sin el no se puede armar el
 * itinerario por dia, pero el comprobante igual se manda solo con la lista
 * de conceptos y el total. */
async function enviarComprobante(destinatario, order, items, trip = null) {
  if (!estaConfigurado()) {
    logger.warn('SMTP no configurado: no se pudo enviar el comprobante de pago', { orderId: order.id });
    return;
  }

  const itinerario = construirItinerario(trip, items);
  const textoItinerario = itinerario.length
    ? '\n\nTu itinerario:\n' + itinerario.map((bucket) => `Dia ${bucket.numero} · ${fechaLarga(bucket.fecha)}\n`
      + bucket.items.map((item) => `  - ${item.title}`).join('\n')).join('\n\n') + '\n'
    : '';

  const mensaje = {
    from: env.SMTP_FROM,
    to: destinatario,
    subject: `Comprobante de tu pago en Viaja · ${dinero(order.total_cents, order.currency)}`,
    text: `Pago confirmado.\n\nTotal: ${dinero(order.total_cents, order.currency)}\nOrden: ${order.id}\n${textoItinerario}\n`
      + items.map((item) => `- ${item.title}: ${dinero(item.subtotal_cents, order.currency)}`).join('\n'),
    html: plantillaComprobante({ order, items, itinerario }),
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
