/** DUENO: integrante C. TODO: itinerario + panel de presupuesto. */
import { useParams } from 'react-router-dom';
import BudgetPanel from '../../budget/components/BudgetPanel';

export default function TripDetailPage() {
  const { id } = useParams();
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold">Itinerario</h1>
        <p className="mt-2 text-sm text-slate-500">Pendiente: GET /trips/{id}</p>
      </section>
      <BudgetPanel tripId={id} />
    </div>
  );
}
