import api from './api';

const linkService = {
  // Search links
  searchLinks: async (query) => {
    const response = await api.get('/links/search', { params: { query } });
    return response.data;
  },

  // Get all links
  getAllLinks: async (page = 1, limit = 50) => {
    const response = await api.get('/links', { params: { page, limit } });
    return response.data;
  },

  // Get single link
  getLink: async (id) => {
    const response = await api.get(`/links/${id}`);
    return response.data;
  },

  // Add new link
  addLink: async (linkData) => {
    const response = await api.post('/links', linkData);
    return response.data;
  },

  // Update link
  updateLink: async (id, linkData) => {
    const response = await api.put(`/links/${id}`, linkData);
    return response.data;
  },

  // Delete link
  deleteLink: async (id) => {
    const response = await api.delete(`/links/${id}`);
    return response.data;
  }
};

export default linkService;
