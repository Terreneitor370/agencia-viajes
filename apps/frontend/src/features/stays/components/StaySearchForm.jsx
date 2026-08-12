import { useState } from 'react';

export default function StaySearchForm({ onSearch, loading }) {
  // Fechas para el input date
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Fecha máxima: 11 meses después
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 11);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const [form, setForm] = useState({
    city: '',
    checkIn: '',
    checkOut: '',
    travelers: 2,
    radiusKm: 8,
    limit: 20,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.city && form.checkIn && form.checkOut) {
      onSearch(form);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {/* Ciudad */}
      <label className="text-sm">
        <span className="text-tinta-500">Ciudad</span>
        <input
          name="city"
          placeholder="Ej: Oaxaca, Cancún"
          value={form.city}
          onChange={handleChange}
          className="mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azul-400"
          required
        />
      </label>

      {/* Fecha de llegada */}
      <label className="text-sm">
        <span className="text-tinta-500">Llegada</span>
        <input
          name="checkIn"
          type="date"
          value={form.checkIn}
          onChange={handleChange}
          min={todayStr}
          max={maxDateStr}
          className="mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azul-400"
          required
        />
      </label>

      {/* Fecha de salida */}
      <label className="text-sm">
        <span className="text-tinta-500">Salida</span>
        <input
          name="checkOut"
          type="date"
          value={form.checkOut}
          onChange={handleChange}
          min={todayStr}
          max={maxDateStr}
          className="mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azul-400"
          required
        />
      </label>

      {/* Viajeros - con controles + y - */}
      <label className="text-sm">
        <span className="text-tinta-500">Personas</span>
        <div className="mt-1 flex items-center gap-2 h-[42px]">
          <button
            type="button"
            onClick={() => setForm({ ...form, travelers: Math.max(1, form.travelers - 1) })}
            className="bg-lienzo hover:bg-borde rounded-md w-8 h-8 flex items-center justify-center font-bold text-tinta-700 text-lg"
          >
            −
          </button>
          <span className="text-center font-semibold text-tinta-900 text-lg w-10">
            {form.travelers}
          </span>
          <button
            type="button"
            onClick={() => setForm({ ...form, travelers: Math.min(20, form.travelers + 1) })}
            className="bg-lienzo hover:bg-borde rounded-md w-8 h-8 flex items-center justify-center font-bold text-tinta-700 text-lg"
          >
            +
          </button>
          <span className="text-menor text-tinta-500 ml-1">
            {form.travelers === 1 ? 'persona' : 'personas'}
          </span>
        </div>
      </label>

      {/* Botón buscar */}
      <button
        type="submit"
        disabled={loading}
        className="self-end rounded-md bg-azul-600 px-4 py-2 text-sm font-medium text-white hover:bg-azul-700 active:bg-azul-800 disabled:opacity-50"
      >
        {loading ? 'Buscando...' : 'Buscar hospedaje'}
      </button>
    </form>
  );
}