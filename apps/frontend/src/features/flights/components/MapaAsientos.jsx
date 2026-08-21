import { useState, useEffect } from 'react';
import { flightsApi } from '../api';

const money = (amount, currency = 'USD') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);

const SEAT_COLORS = {
  available: 'bg-exito/20 border-exito text-exito hover:bg-exito/40 cursor-pointer',
  unavailable: 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed',
  selected: 'bg-azul-600 border-azul-700 text-white',
  expensive: 'bg-ambar-100 border-ambar-400 text-ambar-700 hover:bg-ambar-200 cursor-pointer',
};

function SeatButton({ seat, isSelected, onSelect, currencyRate = 1, displayCurrency = 'MXN' }) {
  if (!seat.available) {
    return (
      <div className={`w-8 h-8 rounded border flex items-center justify-center text-xs font-medium ${SEAT_COLORS.unavailable}`}>
        {seat.designator}
      </div>
    );
  }

  const colorClass = isSelected
    ? SEAT_COLORS.selected
    : seat.price > 0
      ? SEAT_COLORS.expensive
      : SEAT_COLORS.available;

  return (
    <button
      type="button"
      onClick={() => onSelect(seat)}
      className={`w-8 h-8 rounded border flex items-center justify-center text-xs font-medium transition-colors ${colorClass}`}
      title={seat.price > 0 ? `${seat.designator} — ${money(Math.round(seat.price * currencyRate * 100) / 100, displayCurrency)}` : seat.designator}
    >
      {seat.designator}
    </button>
  );
}

function SectionLabel({ text }) {
  return (
    <div className="col-span-full text-center text-xs text-tinta-400 py-1">
      {text}
    </div>
  );
}

function Row({ row, rowNumber, aisles, selectedSet, onSelect, totalRows, currencyRate, displayCurrency }) {
  const seats = row.seats || [];
  const gridCols = seats.length + aisles;
  const elements = [];
  let seatIdx = 0;

  for (let col = 0; col < gridCols; col++) {
    const isAisle = seats.length > 0 && col > 0 && col < gridCols - 1 && (col % (Math.ceil(gridCols / 2))) === 0;
    if (isAisle) {
      elements.push(
        <div key={`aisle-${col}`} className="w-4 flex items-center justify-center text-tinta-300 text-xs">
          {rowNumber === 1 ? ' pasillo ' : ''}
        </div>
      );
    } else if (seatIdx < seats.length) {
      elements.push(
        <SeatButton
          key={seats[seatIdx].designator}
          seat={seats[seatIdx]}
          isSelected={selectedSet.has(seats[seatIdx].designator)}
          onSelect={onSelect}
          currencyRate={currencyRate}
          displayCurrency={displayCurrency}
        />
      );
      seatIdx++;
    }
  }

  return (
    <>
      {rowNumber === 1 && <SectionLabel text="Frente del avión" />}
      {elements}
      {rowNumber === totalRows && <SectionLabel text="Parte trasera" />}
    </>
  );
}

function SeatMapCabin({ cabin, selectedSet, onSelect, maxSeats, selectedCount, currencyRate, displayCurrency }) {
  if (!cabin?.rows?.length) {
    return (
      <p className="text-sm text-tinta-500 text-center">Mapa de asientos no disponible</p>
    );
  }

  const aisles = cabin.aisles || 2;
  const colCount = 6 + aisles;

  const allSeats = cabin.rows.flatMap((r) => r.seats || []);
  const hasFree = allSeats.some((s) => s.available && s.price === 0);
  const hasPaid = allSeats.some((s) => s.available && s.price > 0);

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-tinta-700">
        Selecciona asiento{maxSeats > 1 ? `s (${selectedCount}/${maxSeats})` : ''}
      </p>

      <div className="overflow-x-auto">
        <div
          className="grid gap-1 mx-auto"
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
        >
          {cabin.rows.map((row, ri) => (
            <Row
              key={ri}
              row={row}
              rowNumber={ri + 1}
              aisles={aisles}
              selectedSet={selectedSet}
              onSelect={onSelect}
              totalRows={cabin.rows.length}
              currencyRate={currencyRate}
              displayCurrency={displayCurrency}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-tinta-500">
        {hasFree && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded border border-exito bg-exito/20" />
            Gratis
          </span>
        )}
        {hasPaid && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded border border-ambar-400 bg-ambar-100" />
            Con costo
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded border border-slate-200 bg-slate-100" />
          Ocupado
        </span>
      </div>
    </div>
  );
}

export default function MapaAsientos({ offerId, travelers = 1, sliceIndex = 0, currencyRate = 1, displayCurrency = 'MXN', onSeatsSelect }) {
  const [seatMap, setSeatMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSeats, setSelectedSeats] = useState([]);

  const maxSeats = Math.max(1, travelers);

  useEffect(() => {
    if (!offerId) return;
    let cancelled = false;
    setLoading(true);
    setSelectedSeats([]);
    flightsApi.seatMap(offerId)
      .then((res) => {
        if (cancelled) return;
        setSeatMap(res.data);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'No se pudo cargar el mapa de asientos');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [offerId]);

  const selectedSet = new Set(selectedSeats.map((s) => s.designator));

  const handleSelect = (seat) => {
    let next;
    if (selectedSet.has(seat.designator)) {
      next = selectedSeats.filter((s) => s.designator !== seat.designator);
    } else if (selectedSeats.length < maxSeats) {
      next = [...selectedSeats, seat];
    } else {
      next = [...selectedSeats.slice(1), seat];
    }
    setSelectedSeats(next);
    onSeatsSelect?.(next.length ? next : null);
  };

  if (loading) {
    return (
      <div className="rounded-md border border-borde p-4 text-center">
        <p className="text-sm text-tinta-500">Cargando mapa de asientos...</p>
      </div>
    );
  }

  if (error || !seatMap) {
    return (
      <div className="rounded-md border border-borde p-4 text-center">
        <p className="text-sm text-tinta-500">{error || 'Mapa de asientos no disponible para esta aerolínea'}</p>
      </div>
    );
  }

  const slice = seatMap[sliceIndex] || seatMap[0];
  const cabin = slice?.cabins?.[0];

  if (!cabin) {
    return (
      <div className="rounded-md border border-borde p-4 text-center">
        <p className="text-sm text-tinta-500">Mapa de asientos no disponible para este tramo</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-borde p-4 space-y-3">
      <SeatMapCabin
        cabin={cabin}
        selectedSet={selectedSet}
        onSelect={handleSelect}
        maxSeats={maxSeats}
        selectedCount={selectedSeats.length}
        currencyRate={currencyRate}
        displayCurrency={displayCurrency}
      />

      {selectedSeats.length > 0 && (
        <p className="text-xs text-azul-600 text-center font-medium">
          Asientos: {selectedSeats.map((s) => s.designator).join(', ')}
          {selectedSeats.some((s) => s.price > 0) && (
            <span className="block text-tinta-500 mt-0.5">
              Costo extra: {money(Math.round(selectedSeats.reduce((sum, s) => sum + s.price, 0) * currencyRate * 100) / 100, displayCurrency)}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
