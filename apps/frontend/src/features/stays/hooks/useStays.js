import { useState } from 'react';
import { staysApi } from '../api';

export function useStays() {
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState({});

  const search = async (params) => {
    setLoading(true);
    setError(null);

    try {
      const response = await staysApi.search(params);
      console.log('useStays response:', response);

      // La respuesta del backend tiene:
      // { data: [...], location: {...}, nights: N, rooms: N, degraded: false }
      // data es el array de hospedajes, NO response.data.data
      const data = response.data || response;

      // Si response.data es el array directamente
      if (Array.isArray(response.data)) {
        setStays(response.data);
        setMetadata({
          location: response.location || null,
          nights: response.nights || null,
          rooms: response.rooms || null,
          degraded: response.degraded || false,
        });
      } else if (Array.isArray(data.stays)) {
        // Formato alternativo: { stays: [...], location: {...} }
        setStays(data.stays);
        setMetadata({
          location: data.location || null,
          nights: data.nights || null,
          rooms: data.rooms || null,
          degraded: data.degraded || false,
        });
      } else {
        // Fallback: intentar usar data directamente
        setStays(Array.isArray(data) ? data : []);
        setMetadata({
          location: data.location || null,
          nights: data.nights || null,
          rooms: data.rooms || null,
          degraded: data.degraded || false,
        });
      }

      return data;
    } catch (err) {
      console.error('useStays error:', err);
      setError(err.message || 'Error al buscar hospedaje');
      setStays([]);
    } finally {
      setLoading(false);
    }
  };

  return { stays, loading, error, metadata, search };
}