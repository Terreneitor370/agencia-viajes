/** DUENO: Kassie (modulo B). TODO: formulario ciudad/fechas + listado de hospedaje. */
export default function StaysPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-lg font-semibold">Hospedaje</h1>
      <p className="mt-2 text-sm text-slate-500">
        Pendiente: GET /stays/search. Recuerda mostrar la etiqueta &quot;precio estimado&quot;
        cuando el campo `estimated` venga en true.
      </p>
    </div>
  );
}
