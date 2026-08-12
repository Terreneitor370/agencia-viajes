import { api, qs } from '../../core/api/client';

export const staysApi = {
  search: (params, signal) => {
    const url = `/stays/search${qs(params)}`;
    console.log('staysApi.search URL:', url);
    console.log('staysApi.search params:', params);
    return api.get(url, { signal })
      .then(response => {
        console.log('staysApi.search response:', response);
        return response;
      })
      .catch(error => {
        console.error('staysApi.search error:', error);
        throw error;
      });
  },
};