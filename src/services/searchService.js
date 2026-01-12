import api from './api';

const searchService = {
  // Get search history
  getHistory: async () => {
    const response = await api.get('/search/history');
    return response.data;
  },

  // Add search to history
  addSearch: async (query) => {
    const response = await api.post('/search/history', { query });
    return response.data;
  },

  // Delete specific history
  deleteHistory: async (id) => {
    const response = await api.delete(`/search/history/${id}`);
    return response.data;
  },

  // Clear all history
  clearAllHistory: async () => {
    const response = await api.delete('/search/history');
    return response.data;
  }
};

export default searchService;
