import { useState } from 'react';

export default function StaySearchForm({ onSearch, loading, defaultCity = '' }) {
  // Fechas para el input date
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Fecha máxima: 11 meses después
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 11);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const [form, setForm] = useState({
    city: defaultCity,
    checkIn: '',
    checkOut: '',
    travelers: 1,
    radiusKm: 8,
    limit: 20,
    currency: 'MXN',
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
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
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

      {/* Personas */}
      <label className="text-sm">
        <span className="text-tinta-500">Personas (1-20)</span>
        <input
          name="travelers"
          type="number"
          min={1}
          max={20}
          value={form.travelers}
          onChange={handleChange}
          className="mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azul-400"
        />
      </label>

      {/* Botón buscar */}
      <label className="text-sm">
        <span className="text-tinta-500">Moneda</span>
        <select
          name="currency"
          value={form.currency}
          onChange={handleChange}
          className="mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azul-400"
        >
          <option value="MXN">MXN</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </label>

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