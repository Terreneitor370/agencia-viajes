/** DUENO: integrante C. TODO: selector de intereses + tarjetas de experiencias. */
export default function ExperiencesPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-lg font-semibold">Experiencias</h1>
      <p className="mt-2 text-sm text-slate-500">
        Pendiente: GET /experiencias/search. Los intereses validos son:
        cultura, naturaleza, gastronomia, aventura, vida_nocturna, compras.
      </p>
    </div>
  );
}
