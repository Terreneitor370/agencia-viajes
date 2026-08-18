/**
 * Conversion de moneda en el frontend (DUENO: Kassie, modulo B).
 *
 * El backend ya convierte al buscar; este helper sirve para CUANDO el usuario
 * cambia de moneda despues de ver resultados: pide UNA tasa y reescribe los
 * precios en memoria, sin volver a consultar vuelos/hospedaje.
 */
import { api } from './client';

export async function getRate(from, to) {
  if (from === to) return 1;
  const res = await api.get(`/flights/rates?from=${from}&to=${to}`);
  return res.data?.rate ?? null;
}

/** Reescribe los precios de una lista a otra moneda (devuelve copia nueva). */
export function convertList(items, rate, to) {
  return items.map((item) => ({
    ...item,
    price: {
      ...item.price,
      amount: Math.round(item.price.amount * rate * 100) / 100,
      currency: to,
    },
  }));
}
