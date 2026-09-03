import time
import requests
import pandas as pd
import numpy as np
from datetime import datetime

print("[*] Initializing Production eRTMAC Telemetry Stream Client...")

file_name = "Norway-NA-15_47_9-F-9 A depth.csv"
API_URL = "http://127.0.0.1:8000/predict"

# ==========================================
# 🎛️ STREAM CONTROL PANEL
# ==========================================
STARTING_DEPTH = 3500.0    # Visual override for UI depth
DEPTH_STEP_SIZE = 10.0     # Simulated drilling progression per frame
POLLING_RATE = 1.0         # Network transmit speed (seconds)
# ==========================================

try:
    df_volve = pd.read_csv(file_name, low_memory=False)
except FileNotFoundError:
    print(f"[-] Error: '{file_name}' not found.")
    exit()

# 1. Map raw sensor columns to ML feature schema
mapped_df = pd.DataFrame()
mapped_df['Depth'] = df_volve.get('DEPTH', df_volve.get('Depth', np.arange(len(df_volve))))
mapped_df['WOB_mean'] = df_volve.get('WOB', 10.5)
mapped_df['RPM_mean'] = df_volve.get('SURF_RPM', df_volve.get('RPM', 120.0))
mapped_df['ROP_mean_5min'] = df_volve.get('ROP', 30.0)
mapped_df['Torque_mean_5min'] = df_volve.get('SURF_TORQ', df_volve.get('STOR', 15.0))
mapped_df['SPP_mean'] = df_volve.get('STANDPIPE_PRES', df_volve.get('SPP', 2500.0))
mapped_df['MudWeight'] = df_volve.get('MUD_DENS_IN', 9.5)
mapped_df['ECD'] = df_volve.get('ECD', 10.2)
mapped_df['FlowRate'] = df_volve.get('FLOW_IN', 400.0)
mapped_df['Inclination'] = df_volve.get('INCLINATION', 0.0)
mapped_df['Azimuth'] = df_volve.get('AZIMUTH', 0.0)
mapped_df['HistoricalLossCount'] = 0
mapped_df['HistoricalStuckPipeCount'] = 0
mapped_df['FormationRiskScore'] = 0.5
mapped_df['DistanceToNearestRiskWell'] = 1500.0

# 2. Production Analytics: Calculate real moving trends
mapped_df['Torque_trend'] = mapped_df['Torque_mean_5min'].diff().fillna(0)
mapped_df['SPP_trend'] = mapped_df['SPP_mean'].diff().fillna(0)
mapped_df['ROP_trend'] = mapped_df['ROP_mean_5min'].diff().fillna(0)

# Clean numerical gaps and grab records
mapped_df = mapped_df.dropna(subset=['Depth']).ffill().fillna(0)
records = mapped_df.to_dict(orient="records")

print(f"[*] Broadcasting pure dataset stream to {API_URL}...")

try:
    for i, row in enumerate(records):
        # Apply depth scaling for UI tracking
        
        row["live_timestamp"] = datetime.now().isoformat()
        
        # Transmit to FastAPI
        res = requests.post(API_URL, json=row, timeout=2.0)
        
        if res.status_code == 200:
            data = res.json()
            m = data["metrics"]
            warnings = " | ".join(data["active_warnings"])
            
            print(f"[Frame {i}] Depth: {m['depth_m']}m | Torque: {m['torque_kNm']} | Status: [{data['severity']}] -> {warnings}")
        else:
            print(f"[-] API Error: {res.status_code}")

        time.sleep(POLLING_RATE)

except requests.exceptions.ConnectionError:
    print("\n[-] Error: FastAPI server is unreachable.")
except KeyboardInterrupt:
    print("\n[*] Telemetry broadcast stopped by operator.")