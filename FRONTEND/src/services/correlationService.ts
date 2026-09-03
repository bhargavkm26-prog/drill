import apiClient from '../api/client';
import { wellDataService } from './wellDataService';

export const correlationService = {
  async getWellCorrelation(wellId: string): Promise<any> {
    try {
      const well = await wellDataService.getWellDetail(wellId);
      const nearby = await wellDataService.findNearbyWells(well.latitude, well.longitude, 25);
      
      const comparisons = nearby.map((nw: any) => ({
        wellId: nw.well_name,
        depthDifferenceM: Math.round(Math.abs((nw.target_depth_m || 0) - (well.target_depth_m || 0))),
        distanceKm: nw.distance_km,
        statusRelation: nw.status === well.status ? 'MATCH' : 'DIFFERENT',
        eventData: nw.incident_count > 0 ? 'PRESENT' : 'NONE',
        correlationScore: 0.85
      }));
      
      return { comparisons };
    } catch (e) {
      return { comparisons: [] };
    }
  },
  
  async searchKnowledge(query: string, filters: any = {}): Promise<any> {
    const response = await apiClient.post('/api/v1/knowledge/search', { query, ...filters });
    return response.data;
  },

  async correlateFormations(formationName: string): Promise<any> {
    const response = await apiClient.get('/api/v1/knowledge/correlate', {
      params: { formation_name: formationName }
    });
    return response.data;
  }
};
