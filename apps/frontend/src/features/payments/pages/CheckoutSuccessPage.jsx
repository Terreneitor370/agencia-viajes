import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { paymentsApi } from '../api';
import Tarjeta from '../../../components/ui/Tarjeta';

const dinero = (cents, currency) => {
  const amount = (cents || 0) / 100;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' }).format(amount);
};

export default function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10;

    const fetchOrder = () => {
      paymentsApi.orderBySession(sessionId)
        .then((res) => {
          if (cancelled) return;
          setOrder(res.data);
          if (res.data.status === 'pending' && attempts < maxAttempts) {
            attempts++;
            setTimeout(fetchOrder, 2000);
          }
        })
        .catch((err) => { if (!cancelled) setError(err.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    };

    fetchOrder();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (loading && !order) {
    return (
      <Tarjeta className="p-8 text-center">
        <p className="text-tinta-500">Verificando pago...</p>
      </Tarjeta>
    );
  }

  if (error || !order) {
    return (
      <Tarjeta className="p-8 text-center space-y-4">
        <h1 className="text-seccion text-tinta-900">Pago no encontrado</h1>
        <p className="text-cuerpo text-tinta-500">{error || 'No se pudo verificar el pago.'}</p>
        <Link to="/viajes" className="inline-block rounded-md bg-azul-600 px-4 py-2 text-sm font-medium text-white hover:bg-azul-700">
          Ir a mis viajes
        </Link>
      </Tarjeta>
    );
  }

  const isPaid = order.status === 'paid';

  return (
    <Tarjeta className="p-8 text-center space-y-4 max-w-lg mx-auto">
      {isPaid ? (
        <>
          <div className="text-4xl">&#10003;</div>
          <h1 className="text-seccion text-exito">Pago exitoso</h1>
          <p className="text-cuerpo text-tinta-700">
            Tu reserva ha sido confirmada. Puedes ver los detalles en tu viaje.
          </p>
        </>
      ) : (
        <>
          <div className="text-4xl">&#9203;</div>
          <h1 className="text-seccion text-ambar-600">Pago pendiente</h1>
          <p className="text-cuerpo text-tinta-700">
            Tu pago esta siendo procesado. Esta pagina se actualiza automaticamente.
          </p>
        </>
      )}

      <div className="rounded-lg bg-lienzo p-4 text-left space-y-2">
        <div className="flex justify-between text-cuerpo">
          <span className="text-tinta-500">Orden</span>
          <span className="text-tinta-900 font-mono text-menor">{order.id.slice(0, 8)}...</span>
        </div>
        <div className="flex justify-between text-cuerpo">
          <span className="text-tinta-500">Estado</span>
          <span className={`font-semibold ${isPaid ? 'text-exito' : 'text-ambar-600'}`}>
            {isPaid ? 'Pagado' : order.status}
          </span>
        </div>
        <div className="flex justify-between text-cuerpo">
          <span className="text-tinta-500">Total</span>
          <span className="text-tarjeta text-azul-600">{dinero(order.total_cents, order.currency)}</span>
        </div>
      </div>

      <div className="flex gap-3 justify-center pt-2">
        <Link to={`/viajes/${order.trip_id}`} className="rounded-md bg-azul-600 px-4 py-2 text-sm font-medium text-white hover:bg-azul-700">
          Ver mi viaje
        </Link>
        <Link to="/viajes" className="rounded-md border border-borde px-4 py-2 text-sm font-medium text-tinta-700 hover:bg-lienzo">
          Mis viajes
        </Link>
      </div>
    </Tarjeta>
  );
}
