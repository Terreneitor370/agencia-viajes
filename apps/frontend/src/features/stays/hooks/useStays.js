import { useState } from 'react';
import { staysApi } from '../api';

export function useStays() {
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState({});
  const [searched, setSearched] = useState(false);

  const search = async (params) => {
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await staysApi.search(params);

      // El backend responde: { data: [...], location, nights, rooms, degraded }
      const data = Array.isArray(response.data) ? response.data : [];
      setStays(data);
      setMetadata({
        location: response.location || null,
        nights: response.nights || null,
        rooms: response.rooms || null,
        degraded: response.degraded || false,
      });
      return response;
    } catch (err) {
      setError(err.message || 'Error al buscar hospedaje');
      setStays([]);
      setMetadata({});
    } finally {
      setLoading(false);
    }
  };

  return { stays, loading, error, metadata, searched, search };
}
