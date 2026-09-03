import apiClient from '../api/client';

export const telemetryService = {
  async getTelemetryHistory(wellId: string, limit: number = 100): Promise<any[]> {
    const response = await apiClient.get('/api/v1/telemetry/history', {
      params: { last_n: limit }
    });
    return response.data.frames || [];
  },
  
  async uploadTelemetryChunk(wellId: string, data: any[]): Promise<any> {
    const response = await apiClient.post('/api/v1/telemetry/upload-chunk', data, {
      params: { well_id: wellId }
    });
    return response.data;
  }
};
