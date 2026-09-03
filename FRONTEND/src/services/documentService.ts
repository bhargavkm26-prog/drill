import apiClient from '../api/client';

export const documentService = {
  async uploadReport(file: File, wellId: string, metadata?: any): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (wellId) formData.append('well_id', wellId);
    if (metadata) formData.append('metadata', JSON.stringify(metadata));

    const response = await apiClient.post('/api/v1/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async listDocuments(wellId?: string): Promise<any[]> {
    const response = await apiClient.get('/api/v1/documents', {
      params: { well_name: wellId } // Pass well_name since frontend uses name as ID for now
    });
    return response.data.documents || [];
  },

  async getDocument(docId: string): Promise<any> {
    const response = await apiClient.get(`/api/v1/documents/${docId}`);
    return response.data;
  },

  async uploadBulkArchive(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/v1/documents/upload-bulk', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async syncDataLake(): Promise<any> {
    const response = await apiClient.post('/api/v1/documents/sync');
    return response.data;
  },

  async updateDocument(docId: string, metadata: any): Promise<any> {
    const response = await apiClient.put(`/api/v1/documents/${docId}`, metadata);
    return response.data;
  }
};
