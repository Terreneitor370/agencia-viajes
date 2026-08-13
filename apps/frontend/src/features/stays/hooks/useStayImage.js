import { useState, useEffect } from 'react';

// Imágenes de respaldo variadas (para que no se vean todas iguales)
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1495365200479-c4ed1d35e1aa?w=400&h=300&fit=crop',
];

const pickFallback = (stay) => {
  const index = stay?.externalId
    ? Math.abs(stay.externalId.length) % FALLBACK_IMAGES.length
    : Math.floor(Math.random() * FALLBACK_IMAGES.length);
  return FALLBACK_IMAGES[index];
};

export function useStayImage(stay) {
  const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
  const hasKey = Boolean(UNSPLASH_KEY && stay);

  // Si no hay llave, usamos una imagen de respaldo desde el inicio (sin efecto).
  const [image, setImage] = useState(() => (hasKey ? null : pickFallback(stay)));
  const [loading, setLoading] = useState(hasKey);

  useEffect(() => {
    if (!hasKey || !stay) return;
    let isMounted = true;

    // Estrategia de búsqueda: varias combinaciones por especificidad
    const city = stay.address?.split(',')[0]?.trim() || '';
    const nameParts = stay.name.split(' ');
    const mainName = nameParts.slice(0, 2).join(' ');

    const searchQueries = [
      `hotel ${mainName} ${city}`,
      `${mainName} hotel ${city}`,
      `hotel ${city} ${mainName}`,
      `hotel room ${city}`,
      `${city} hotel luxury`,
      `hotel ${city}`,
    ];

    let currentQueryIndex = 0;

    const resolve = (query) => {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&client_id=${UNSPLASH_KEY}`;
      return fetch(url).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
    };

    const trySearch = () => {
      if (currentQueryIndex >= searchQueries.length) {
        if (isMounted) {
          setImage(pickFallback(stay));
          setLoading(false);
        }
        return;
      }
      const query = searchQueries[currentQueryIndex];
      currentQueryIndex += 1;
      resolve(query)
        .then((data) => {
          if (!isMounted) return;
          if (data.results && data.results.length > 0) {
            setImage(data.results[0].urls.small);
            setLoading(false);
          } else {
            trySearch();
          }
        })
        .catch(() => {
          if (isMounted) trySearch();
        });
    };

    trySearch();

    return () => { isMounted = false; };
  }, [hasKey, stay, UNSPLASH_KEY]);

  return { image, loading };
}
