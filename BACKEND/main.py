import os
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="OIL eRTMAC - Full PS Predictive Engine")

# Load Models
MODEL_DIR = "models"
try:
    model_stuck = joblib.load(os.path.join(MODEL_DIR, "stuck_pipe_model.pkl"))
    model_loss = joblib.load(os.path.join(MODEL_DIR, "mud_loss_model.pkl"))
except Exception as e:
    print(f"[-] Model load error: {e}")
    model_stuck, model_loss = None, None

class RigTelemetry(BaseModel):
    Depth: float
    ROP_mean_5min: float
    WOB_mean: float
    RPM_mean: float
    Torque_mean_5min: float
    SPP_mean: float
    MudWeight: float
    ECD: float
    HistoricalLossCount: int = 0
    HistoricalStuckPipeCount: int = 0
    FormationRiskScore: float = 0.5
    FlowRate: float
    Inclination: float = 0.0
    Azimuth: float = 0.0
    DistanceToNearestRiskWell: float = 1500.0
    Torque_trend: float = 0.0
    SPP_trend: float = 0.0
    ROP_trend: float = 0.0

@app.post("/predict")
async def predict_drilling_risk(telemetry: RigTelemetry):
    if not model_stuck or not model_loss:
        raise HTTPException(status_code=500, detail="Models missing")

    input_data = pd.DataFrame([telemetry.dict()])

    # 1. ML Predictions (Stuck Pipe & Mud Loss)
    prob_stuck = float(model_stuck.predict_proba(input_data)[0][1]) * 100
    prob_loss = float(model_loss.predict_proba(input_data)[0][1]) * 100

    # 2. Physics & Heuristics (Overpressure, Torque Spikes, Cementing)
    torque_spike_detected = telemetry.Torque_trend > 15.0 # Sudden 15 kNm jump
    overpressure_risk = telemetry.ECD > (telemetry.MudWeight + 1.2) # ECD diverging from MW
    cementing_issue = telemetry.FlowRate < 100 and telemetry.SPP_trend < -500 # Loss of pressure/flow

    # 3. Determine Overall Severity
    is_critical = prob_stuck > 70 or prob_loss > 70 or torque_spike_detected or overpressure_risk
    
    # Generate active warnings list
    active_warnings = []
    if prob_stuck > 70: active_warnings.append("High Stuck Pipe Probability")
    if prob_loss > 70: active_warnings.append("Severe Mud Loss Detected")
    if torque_spike_detected: active_warnings.append("Mechanical Torque Spike")
    if overpressure_risk: active_warnings.append("Formation Overpressure Zone")
    if cementing_issue: active_warnings.append("Cementing / Fluid Integrity Loss")

    status_flag = "CRITICAL" if is_critical else "NORMAL"

    return {
        "status": "success",
        "severity": status_flag,
        "active_warnings": active_warnings if active_warnings else ["None"],
        "metrics": {
            "depth_m": telemetry.Depth,
            "stuck_pipe_risk_percent": round(prob_stuck, 2),
            "mud_loss_risk_percent": round(prob_loss, 2),
            "torque_kNm": telemetry.Torque_mean_5min,
            "ecd_sg": telemetry.ECD
        }
    }