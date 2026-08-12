import { useState, useEffect } from 'react';

// Imagen por defecto si todo falla
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop';

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

export function useStayImage(stay) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stay) {
      setLoading(false);
      return;
    }

    const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    
    // Si no hay clave, usar una imagen de respaldo aleatoria
    if (!UNSPLASH_KEY) {
      const randomIndex = Math.floor(Math.random() * FALLBACK_IMAGES.length);
      setImage(FALLBACK_IMAGES[randomIndex]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    // Usar el ID del hotel para generar una imagen de respaldo consistente
    const getFallbackForHotel = (id) => {
      const index = id ? Math.abs(id.length) % FALLBACK_IMAGES.length : 0;
      return FALLBACK_IMAGES[index];
    };

    // Construir términos de búsqueda más específicos
    const city = stay.address?.split(',')[0]?.trim() || '';
    const nameParts = stay.name.split(' ');
    const mainName = nameParts.slice(0, 2).join(' ');
    
    // Estrategia de búsqueda: varias combinaciones
    const searchQueries = [
      `hotel ${mainName} ${city}`,
      `${mainName} hotel ${city}`,
      `hotel ${city} ${mainName}`,
      `hotel room ${city}`,
      `${city} hotel luxury`,
      `hotel ${city}`,
    ];

    let currentQueryIndex = 0;

    const trySearch = () => {
      if (currentQueryIndex >= searchQueries.length) {
        // Si no encuentra nada, usar fallback variado
        if (isMounted) {
          setImage(getFallbackForHotel(stay.externalId));
          setLoading(false);
        }
        return;
      }

      const query = searchQueries[currentQueryIndex];
      console.log(`[${currentQueryIndex + 1}/${searchQueries.length}] Buscando: "${query}"`);
      
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&client_id=${UNSPLASH_KEY}`;

      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (isMounted) {
            if (data.results && data.results.length > 0) {
              console.log(`Encontrado con: "${query}"`);
              setImage(data.results[0].urls.small);
              setLoading(false);
            } else {
              currentQueryIndex++;
              trySearch();
            }
          }
        })
        .catch((err) => {
          console.warn(`Error con "${query}":`, err.message);
          currentQueryIndex++;
          trySearch();
        });
    };

    trySearch();

    return () => {
      isMounted = false;
    };
  }, [stay]);

  return { image, loading };
}