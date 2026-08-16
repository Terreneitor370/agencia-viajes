/**
 * Mis cotizaciones (invitado). DUENO: Kassie (modulo B).
 * Guarda vuelos y hospedaje SIN iniciar sesion; iniciar sesion permite
 * convertirlos en un viaje guardado.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { guestToken, quotesApi } from '../api';

const money = (amount, currency) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount ?? 0);

const TYPE_LABELS = { flight: 'Vuelo', stay: 'Hospedaje', experience: 'Experiencia', other: 'Otro' };

const dateStr = (iso) =>
  new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

export default function QuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasToken = Boolean(guestToken());

  useEffect(() => {
    if (!hasToken) return;
    let mounted = true;
    quotesApi.list()
      .then((res) => { if (mounted) setQuotes(res.data || []); })
      .catch((err) => { if (mounted) setError(err.message || 'No se pudieron cargar las cotizaciones'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [hasToken]);

  const remove = async (id) => {
    try {
      await quotesApi.remove(id);
      setQuotes((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la cotización');
    }
  };

  const isLoading = hasToken && loading;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-seccion font-bold text-tinta-900">Mis cotizaciones</h1>
        <p className="text-sm text-tinta-500">
          Guardas vuelos y hospedaje sin crear cuenta. Inicia sesión para convertirlos en un viaje.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-criticoSuave px-4 py-3 text-sm text-critico">
          {error}
        </p>
      )}

      {isLoading && <p className="text-sm text-tinta-500">Cargando...</p>}

      {!isLoading && quotes.length === 0 && (
        <div className="rounded-lg border border-dashed border-borde bg-superficie p-8 text-center">
          <p className="font-medium text-tinta-700">Aún no tienes cotizaciones</p>
          <p className="mt-1 text-sm text-tinta-500">
            Busca vuelos u hospedaje y usa “Agregar al viaje”: se guardará aquí sin necesidad de cuenta.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link to="/buscar" className="rounded-md bg-azul-600 px-4 py-2 text-sm font-medium text-white hover:bg-azul-700">
              Buscar vuelos
            </Link>
            <Link to="/hospedaje" className="rounded-md border border-azul-400 px-4 py-2 text-sm font-medium text-azul-700 hover:bg-azul-50">
              Buscar hospedaje
            </Link>
          </div>
        </div>
      )}

      <section className="grid gap-3">
        {quotes.map((q) => (
          <article key={q.id} className="flex items-center justify-between gap-3 rounded-lg border border-borde bg-superficie p-4">
            <div className="min-w-0">
              <span className="inline-block rounded bg-azul-100 px-2 py-0.5 text-xs font-medium text-azul-800">
                {TYPE_LABELS[q.type] || q.type}
              </span>
              <p className="mt-1 truncate font-medium text-tinta-900">{q.title}</p>
              <p className="text-xs text-tinta-500">
                {dateStr(q.created_at)} · {q.pricingMode === 'per_person' ? 'por persona' : q.pricingMode === 'per_night_per_room' ? 'por noche' : 'por grupo'}
                {q.estimated ? ' · ⚡ estimado' : ''}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="font-semibold text-tinta-900">
                {money(q.unit_price_cents / 100, q.currency)}
              </p>
              <button
                type="button"
                onClick={() => remove(q.id)}
                className="mt-1 text-xs text-critico hover:underline"
              >
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
