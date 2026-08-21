import { api, qs } from '../../core/api/client';

const seatMapCache = new Map();

export const flightsApi = {
  search: (params, signal) => api.get(`/flights/search${qs(params)}`, { signal }),
  airports: (signal) => api.get('/flights/airports', { signal }),
  seatMap: (offerId) => {
    if (seatMapCache.has(offerId)) return Promise.resolve({ data: seatMapCache.get(offerId) });
    return api.get(`/flights/seat-map?offer_id=${encodeURIComponent(offerId)}`).then((res) => {
      seatMapCache.set(offerId, res.data);
      return res;
    });
  },
  checkSeatMaps: (offerIds) => api.get(`/flights/seat-map/check?offer_ids=${offerIds.join(',')}`),
  preloadSeatMap: (offerId) => {
    if (seatMapCache.has(offerId)) return;
    flightsApi.seatMap(offerId).catch(() => {});
  },
};
