import apiClient from '../api/client';

export const incidentService = {
  async logIncident(data: any): Promise<any> {
    const response = await apiClient.post('/api/v1/incidents', data);
    return response.data;
  },

  async listIncidents(wellId?: string, limit: number = 50): Promise<any[]> {
    const response = await apiClient.get('/api/v1/incidents', {
      params: { well_name: wellId, limit }
    });
    return response.data.incidents || [];
  },

  async correlateFormations(formationName: string): Promise<any> {
    const response = await apiClient.get('/api/v1/knowledge/correlate', {
      params: { formation_name: formationName }
    });
    return response.data;
  },

  async searchKnowledge(query: string, limit: number = 5): Promise<any> {
    const response = await apiClient.post('/api/v1/knowledge/search', { query, limit });
    return response.data;
  }
};
