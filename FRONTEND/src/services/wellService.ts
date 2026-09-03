import apiClient from '../api/client';

export interface Well {
  id: string;
  well_name: string;
  latitude: number;
  longitude: number;
  target_depth_m: number;
  basin: string;
  status: string;
  incident_count: number;
  formation_count: number;
}

export interface NearbyWell extends Well {
  distance_km: number;
}

export interface NearbyWellsResponse {
  search_latitude: number;
  search_longitude: number;
  search_radius_km: number;
  total_found: number;
  nearby_wells: NearbyWell[];
}

export async function getWells(params?: any): Promise<{ total: number, wells: Well[] }> {
  const response = await apiClient.get('/api/v1/wells', { params });
  return response.data;
}

export async function getNearbyWells(lat: number, lon: number, radiusKm: number): Promise<NearbyWellsResponse> {
  const response = await apiClient.get('/api/v1/wells/nearby/search', {
    params: {
      lat,
      lon,
      radius_km: radiusKm
    }
  });
  return response.data;
}
