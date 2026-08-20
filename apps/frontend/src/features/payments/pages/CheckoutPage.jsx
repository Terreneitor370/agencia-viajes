import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { paymentsApi } from '../api';
import Tarjeta from '../../../components/ui/Tarjeta';

const stripePromise = loadStripe('pk_test_51QuHNEQQdZgCoRyuxYyqPJyoHoizaGDhQUGyiEylzRlFliVsg9q0vtQseWM5cXA9AlSJzO682rDCvBclHyEsS2v800WCNLNtdI');

const dinero = (cents, currency) => {
  const amount = (cents || 0) / 100;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' }).format(amount);
};

const CARD_STYLE = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1e293b',
      '::placeholder': { color: '#94a3b8' },
    },
    invalid: { color: '#ef4444' },
  },
};

function CardForm({ clientSecret, orderId, totalCents, currency, onDone }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError('');

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });

    if (result.error) {
      setError(result.error.message || 'Error al procesar el pago.');
      setProcessing(false);
      return;
    }

    try {
      await paymentsApi.confirmOrder(orderId);
    } catch {
      // el webhook o polling lo resolvera
    }
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md border border-bordeInteractivo p-3">
        <CardElement options={CARD_STYLE} hidePostalCode />
      </div>
      {error && <p className="text-menor text-critico text-center">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full rounded-md bg-exito px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
      >
        {processing ? 'Procesando...' : `Pagar ${dinero(totalCents, currency)}`}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tripId = params.get('trip_id');
  const currency = params.get('currency') || 'MXN';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
  const [totalCents, setTotalCents] = useState(0);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    paymentsApi.createPaymentIntent({ tripId, currency })
      .then((res) => {
        if (cancelled) return;
        setClientSecret(res.data.clientSecret);
        setOrderId(res.data.orderId);
        setTotalCents(res.data.totalCents);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'No se pudo iniciar el pago.');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [tripId, currency]);

  const errorMessage = !tripId ? 'Falta el viaje para pagar.' : error;
  const isLoading = Boolean(tripId) && loading;

  if (isLoading) {
    return (
      <Tarjeta className="p-8 text-center max-w-lg mx-auto mt-8">
        <p className="text-tinta-500">Preparando pago...</p>
      </Tarjeta>
    );
  }

  if (errorMessage) {
    return (
      <Tarjeta className="p-8 text-center max-w-lg mx-auto mt-8 space-y-4">
        <h1 className="text-seccion text-tinta-900">No se pudo cargar el pago</h1>
        <p className="text-cuerpo text-tinta-500">{errorMessage}</p>
        <Link to={tripId ? `/viajes/${tripId}` : '/viajes'} className="inline-block rounded-md bg-azul-600 px-4 py-2 text-sm font-medium text-white hover:bg-azul-700">
          Volver al viaje
        </Link>
      </Tarjeta>
    );
  }

  if (paid) {
    return (
      <Tarjeta className="p-8 text-center max-w-lg mx-auto mt-8 space-y-4">
        <div className="text-4xl">&#10003;</div>
        <h1 className="text-seccion text-exito">Pago exitoso</h1>
        <p className="text-cuerpo text-tinta-700">Tu reserva ha sido confirmada.</p>
        <div className="flex gap-3 justify-center pt-2">
          <Link to={`/viajes/${tripId}`} className="rounded-md bg-azul-600 px-4 py-2 text-sm font-medium text-white hover:bg-azul-700">
            Ver mi viaje
          </Link>
          <Link to="/viajes" className="rounded-md border border-borde px-4 py-2 text-sm font-medium text-tinta-700 hover:bg-lienzo">
            Mis viajes
          </Link>
        </div>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta className="p-6 max-w-lg mx-auto mt-8 space-y-4">
      <h1 className="text-seccion text-tinta-900">Confirmar pago</h1>
      <p className="text-cuerpo text-tinta-500">Total: <span className="font-semibold text-azul-600">{dinero(totalCents, currency)}</span></p>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CardForm
          clientSecret={clientSecret}
          orderId={orderId}
          totalCents={totalCents}
          currency={currency}
          onDone={() => setPaid(true)}
        />
      </Elements>
      <div className="text-center pt-1">
        <button type="button" onClick={() => navigate(-1)} className="text-menor text-tinta-500 hover:text-tinta-700">
          Cancelar y volver
        </button>
      </div>
    </Tarjeta>
  );
}
