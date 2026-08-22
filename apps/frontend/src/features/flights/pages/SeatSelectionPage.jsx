import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MapaAsientos from '../components/MapaAsientos';
import { flightsApi } from '../api';
import { api } from '../../../core/api/client';
import { useAuth } from '../../../core/auth/useAuth';
import { buildStaysUrl, construirCargosDeAsientos, construirPayload, guardarPendiente } from '../../shared/pendingTripItem';

const time = (iso) =>
  iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '--';

/**
 * Resumen de precio visible antes de continuar, al estilo Booking: el vuelo
 * base y cada asiento elegido, agrupado por tramo, con un total que se
 * actualiza en vivo conforme se elige en el mapa -- antes el unico precio
 * visible en esta pantalla era el de cada asiento suelto (el tooltip del
 * mapa) mas un "Costo extra: $X" sin el total del vuelo, asi que nunca se
 * veia cuanto se iba a pagar en total antes de seguir al paso 3.
 */
function dineroEn(currency) {
  return (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);
}

function TramoAsientos({ titulo, seats, pendiente, dinero }) {
  if (pendiente) {
    return (
      <div className="flex items-center justify-between text-xs text-tinta-400">
        <span>{titulo}</span>
        <span>Aun por elegir</span>
      </div>
    );
  }
  if (!seats.length) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-tinta-700">{titulo}</p>
      {seats.map((s) => (
        <div key={s.designator} className="flex items-center justify-between pl-2 text-xs text-tinta-500">
          <span>Asiento {s.designator}</span>
          <span>{s.price > 0 ? dinero(s.price) : 'Incluido'}</span>
        </div>
      ))}
    </div>
  );
}

function ResumenPrecio({ priceAmount, priceCurrency, travelers, outbound, ret, hasReturn }) {
  const dinero = dineroEn(priceCurrency);
  const baseTotal = priceAmount * travelers;
  const seatsTotal = [...outbound, ...ret].reduce((sum, s) => sum + s.price, 0);
  const total = baseTotal + seatsTotal;

  return (
    <div className="rounded-md border border-borde bg-superficie p-4 space-y-2.5">
      <p className="text-sm font-semibold text-tinta-900">Resumen del precio</p>
      <div className="flex items-center justify-between text-sm text-tinta-700">
        <span>Vuelo{hasReturn ? ' redondo' : ''} · {travelers} {travelers === 1 ? 'viajero' : 'viajeros'}</span>
        <span>{dinero(baseTotal)}</span>
      </div>
      <TramoAsientos titulo="Asientos · ida" seats={outbound} dinero={dinero} />
      {hasReturn && <TramoAsientos titulo="Asientos · regreso" seats={ret} pendiente={!ret.length} dinero={dinero} />}
      <div className="flex items-center justify-between border-t border-borde pt-2 text-sm font-semibold text-tinta-900">
        <span>Total estimado</span>
        <span>{dinero(total)}</span>
      </div>
    </div>
  );
}

export default function SeatSelectionPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [params] = useSearchParams();

  const tripId = params.get('tripId') || '';
  const travelers = Number(params.get('travelers')) || 1;
  const currency = params.get('currency') || 'MXN';
  const flow = params.get('flow') || '';
  const offerId = params.get('offerId') || '';
  const origin = params.get('origin') || '';
  const destination = params.get('destination') || '';
  const departureAt = params.get('departureAt') || '';
  const retOrigin = params.get('retOrigin') || '';
  const retDestination = params.get('retDestination') || '';
  const retDepartureAt = params.get('retDepartureAt') || '';
  const airline = params.get('airline') || '';
  const hasReturn = Boolean(retOrigin);
  const backParams = params.get('backParams') || '';
  const replaceTarget = params.get('replaceTarget') || '';
  const replaceItemId = params.get('replaceItemId') || '';
  const returnTo = params.get('returnTo') || '';

  const [currencyRate, setCurrencyRate] = useState(1);
  const [baseCurrency, setBaseCurrency] = useState('');
  const [seatOutbound, setSeatOutbound] = useState(null);
  const [seatReturn, setSeatReturn] = useState(null);
  const [seatMapAvailable, setSeatMapAvailable] = useState(null);
  const [step, setStep] = useState('outbound');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!offerId) return;
    flightsApi.seatMap(offerId)
      .then((res) => {
        const sm = res.data;
        const hasAny = sm?.some((s) => s?.cabins?.some((c) => c?.rows?.length > 0));
        setSeatMapAvailable(Boolean(hasAny));
        if (sm?.[0]?.cabins?.[0]) {
          setBaseCurrency(sm[0].cabins[0].rows?.[0]?.seats?.[0]?.currency || 'USD');
        }
      })
      .catch(() => setSeatMapAvailable(false));
  }, [offerId]);

  useEffect(() => {
    if (!baseCurrency || baseCurrency === currency) return;
    import('../../../core/api/rates').then(({ getRate }) => {
      getRate(baseCurrency, currency).then((r) => {
        if (r) setCurrencyRate(r);
      });
    });
  }, [baseCurrency, currency]);

  const goToResults = () => {
    navigate(`/buscar${backParams ? `?${backParams}` : ''}`);
  };

  const priceAmount = Number(params.get('priceAmount')) || 0;
  const priceCurrency = params.get('priceCurrency') || 'MXN';

  // seat.price viene en baseCurrency (la moneda que reporta Duffel para los
  // asientos, ver el useEffect de arriba), no necesariamente la misma que
  // priceCurrency (la del vuelo): se convierte aqui, una sola vez, con el
  // mismo currencyRate que ya se usaba para mostrar el precio en el mapa --
  // tanto el resumen de precio de esta pantalla como buildFlightOffer() (lo
  // que se guarda) parten de esta misma conversion, para no calcularla dos
  // veces con resultados que podrian no coincidir.
  const convertirSeats = (seats, tramo) => (seats || []).map((s) => ({
    designator: s.designator,
    price: Math.round(Number(s.price) * currencyRate * 100) / 100,
    currency: priceCurrency,
    tramo,
  }));
  const outboundConvertido = convertirSeats(seatOutbound, 'ida');
  const returnConvertido = convertirSeats(seatReturn, 'regreso');

  // Comun a ambas ramas de abajo (con sesion y sin sesion): antes cada una
  // armaba su propio objeto por separado y ninguna incluia los asientos
  // elegidos en MapaAsientos.jsx, asi que la seleccion se perdia siempre al
  // guardar el vuelo en el viaje. El vuelo se guarda a su precio base, SIN
  // el cargo de asientos: ese cargo se cobra aparte (ver
  // construirCargosDeAsientos en pendingTripItem.js) porque cada viajero
  // puede haber elegido un asiento de precio distinto, y pricingMode
  // 'per_person' solo admite un unico precio que se multiplica por
  // travelers -- no hay forma de que ese precio unico represente montos
  // distintos por persona.
  const buildFlightOffer = () => ({
    externalId: offerId,
    origin,
    destination,
    departureAt,
    airline,
    price: { amount: priceAmount, currency: priceCurrency },
    provider: params.get('provider') || 'unknown',
    pricingMode: 'per_person',
    return: retOrigin ? { departureAt: retDepartureAt } : null,
    seats: (outboundConvertido.length || returnConvertido.length)
      ? { outbound: outboundConvertido, return: returnConvertido }
      : null,
  });

  const addToTripAndGoToStays = async () => {
    if (!isAuthenticated) {
      const returnTo = `/asientos?${params.toString()}`;
      guardarPendiente(buildFlightOffer(), 'flight', tripId, returnTo);
      navigate('/login');
      return;
    }

    if (!tripId) { navigate('/viajes'); return; }
    setSaving(true);
    setSaveError('');
    try {
      const offer = buildFlightOffer();
      await api.post(`/trips/${tripId}/items`, construirPayload(offer, 'flight'));

      // Secuencial, no Promise.all: si un asiento falla a mitad de camino
      // preferimos que el error se note claro en vez de que una carga en
      // paralelo deje al usuario sin saber cuales de varios cargos si se
      // guardaron.
      for (const chargeItem of construirCargosDeAsientos(offer)) {
        await api.post(`/trips/${tripId}/items`, chargeItem);
      }

      if (flow === 'replace' && replaceItemId) {
        const { tripsApi } = await import('../api');
        const detailRes = await tripsApi.detail(tripId);
        const items = Array.isArray(detailRes.data?.items) ? detailRes.data.items : [];
        const obsolete = items.filter((item) => item.type === 'flight' && item.id !== replaceItemId);
        await Promise.all(obsolete.map((item) => tripsApi.removeItem(tripId, item.id)));
        navigate(returnTo || `/viajes/${tripId}`);
        return;
      }

      navigate(buildStaysUrl(params, offer.seats, tripId));
    } catch (err) {
      setSaveError(err.message || 'No se pudo guardar el vuelo. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = () => {
    if (step === 'outbound' && hasReturn) {
      setStep('return');
    } else {
      addToTripAndGoToStays();
    }
  };

  const isOutbound = step === 'outbound';
  const isReturn = step === 'return';

  return (
    <div className="min-h-screen bg-lienzo space-y-6 p-4 max-w-2xl mx-auto">
      <div className="space-y-1">
        <p className="text-xs text-tinta-400 uppercase tracking-wide font-semibold">
          Paso 2 de 4
        </p>
        <h1 className="text-xl font-bold text-tinta-900">Selecciona tus asientos</h1>
        <p className="text-sm text-tinta-500">
          {airline} · {origin} → {destination}
          {departureAt && ` · Salida ${time(departureAt)}`}
        </p>
        {hasReturn && (
          <p className="text-sm text-tinta-500">
            Regreso: {retOrigin} → {retDestination}
            {retDepartureAt && ` · ${time(retDepartureAt)}`}
          </p>
        )}
      </div>

      {hasReturn && (
        <div className="flex gap-2 text-xs">
          <span className={`rounded-full px-3 py-1 font-medium ${isOutbound ? 'bg-azul-600 text-white' : 'bg-azul-100 text-azul-700'}`}>
            1. Vuelo de ida
          </span>
          <span className={`rounded-full px-3 py-1 font-medium ${isReturn ? 'bg-azul-600 text-white' : seatOutbound?.length ? 'bg-azul-100 text-azul-700' : 'bg-slate-100 text-slate-400'}`}>
            2. Vuelo de regreso
          </span>
        </div>
      )}

      {seatMapAvailable === null && (
        <div className="rounded-md border border-borde p-6 text-center">
          <p className="text-sm text-tinta-500">Cargando mapa de asientos...</p>
        </div>
      )}

      {seatMapAvailable === false && (
        <div className="rounded-md border border-borde bg-superficie p-6 space-y-3">
          <p className="text-sm text-tinta-700 font-medium">Esta aerolínea no permite seleccionar asientos por ahora.</p>
          <p className="text-xs text-tinta-500">Los asientos se asignarán al momento de reservar.</p>
        </div>
      )}

      {seatMapAvailable === true && isOutbound && (
        <div className="rounded-md border border-azul-200 bg-azul-50/50 p-4">
          <p className="text-sm font-semibold text-azul-800 mb-2">
            {hasReturn ? 'Vuelo de ida' : 'Selecciona tus asientos'}
          </p>
          <p className="text-xs text-azul-600 mb-3">{origin} → {destination}</p>
          <MapaAsientos
            offerId={offerId}
            travelers={travelers}
            sliceIndex={0}
            currencyRate={currencyRate}
            displayCurrency={currency}
            onSeatsSelect={setSeatOutbound}
          />
        </div>
      )}

      {seatMapAvailable === true && isReturn && (
        <div className="rounded-md border border-azul-200 bg-azul-50/50 p-4">
          <p className="text-sm font-semibold text-azul-800 mb-2">Vuelo de regreso</p>
          <p className="text-xs text-azul-600 mb-3">{retOrigin} → {retDestination}</p>
          <MapaAsientos
            offerId={offerId}
            travelers={travelers}
            sliceIndex={1}
            currencyRate={currencyRate}
            displayCurrency={currency}
            onSeatsSelect={setSeatReturn}
          />
        </div>
      )}

      {seatMapAvailable !== null && (
        <ResumenPrecio
          priceAmount={priceAmount}
          priceCurrency={priceCurrency}
          travelers={travelers}
          outbound={outboundConvertido}
          ret={returnConvertido}
          hasReturn={hasReturn}
        />
      )}

      <div className="flex items-center justify-between pt-2">
        {isReturn ? (
          <button
            type="button"
            onClick={() => setStep('outbound')}
            className="text-sm text-tinta-500 hover:text-tinta-700 underline"
          >
            ← Volver a ida
          </button>
        ) : (
          <button
            type="button"
            onClick={goToResults}
            className="text-sm text-tinta-500 hover:text-tinta-700 underline"
          >
            Volver a resultados
          </button>
        )}

        {saveError && <p className="text-xs text-critico">{saveError}</p>}

        {seatMapAvailable === false ? (
          <button
            type="button"
            onClick={addToTripAndGoToStays}
            disabled={saving}
            className="rounded-md bg-azul-600 px-5 py-2 text-sm font-medium text-white hover:bg-azul-700 active:bg-azul-800 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Continuar a hospedaje'}
          </button>
        ) : seatMapAvailable === true ? (
          <button
            type="button"
            onClick={handleContinue}
            disabled={saving}
            className="rounded-md bg-azul-600 px-5 py-2 text-sm font-medium text-white hover:bg-azul-700 active:bg-azul-800 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : (step === 'outbound' && hasReturn ? 'Continuar al regreso' : 'Continuar a hospedaje')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
