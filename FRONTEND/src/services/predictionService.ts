import apiClient from '../api/client';

export const predictionService = {
  async predictDrillingRisk(data: any): Promise<any> {
    const payload = {
      Depth: data.depth_m ?? 3000,
      ROP_mean_5min: 25.0,
      WOB_mean: data.wob_tonnes ?? 15.0,
      RPM_mean: data.rpm ?? 120.0,
      Torque_mean_5min: 15000.0,
      SPP_mean: 2500.0,
      MudWeight: data.mud_weight_ppg ?? 10.0,
      ECD: (data.mud_weight_ppg ?? 10.0) + 0.5,
      FlowRate: data.flow_rate_gpm ?? 500.0,
      HistoricalLossCount: 0,
      HistoricalStuckPipeCount: 0,
      FormationRiskScore: 0.5,
      Inclination: 0.0,
      Azimuth: 0.0,
      DistanceToNearestRiskWell: 1500.0,
      Torque_trend: 0.0,
      SPP_trend: 0.0,
      ROP_trend: 0.0,
    };
    
    const response = await apiClient.post('/api/v1/predict', payload);
    const result = response.data;

    const maxRisk = Math.max(result.stuck_pipe_risk_percent, result.mud_loss_risk_percent) / 100;
    const contributing_factors: Record<string, number> = {};
    if (result.shap_explanations) {
      result.shap_explanations.forEach((shap: any) => {
        contributing_factors[shap.feature] = shap.contribution_percent / 100;
      });
    }

    return {
      risk_level: result.severity === 'CRITICAL' ? 'HIGH' : result.severity === 'WARNING' ? 'MEDIUM' : 'LOW',
      risk_probability: maxRisk,
      primary_risk_factor: result.active_warnings?.length ? result.active_warnings[0] : 'Normal drilling conditions',
      ai_explanation: result.mitigation_strategy || 'No immediate action required.',
      contributing_factors: contributing_factors
    };
  },

  async checkProactiveHazards(position: any): Promise<any> {
    const response = await apiClient.post('/api/v1/alerts/proactive', position);
    return response.data;
  }
};
