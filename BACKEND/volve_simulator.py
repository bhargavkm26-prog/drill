import os
import time
import logging

import numpy as np
import pandas as pd
import requests


# ==========================================
# CONFIGURATION
# ==========================================

FILE_NAME = "OIL_DEMO_DATASET.csv"

API_BASE_URL = "http://127.0.0.1:8000"
TOKEN_URL = f"{API_BASE_URL}/api/v1/auth/token"
API_URL = f"{API_BASE_URL}/api/v1/predict"

SIM_USERNAME = os.getenv("SIM_USERNAME")
SIM_PASSWORD = os.getenv("SIM_PASSWORD")

POLLING_RATE = 1.0

# Start from the region containing meaningful
# drilling telemetry.
START_INDEX = 2405


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger("VolveSimulator")


# ==========================================
# VALIDATE CREDENTIALS
# ==========================================

if not SIM_USERNAME or not SIM_PASSWORD:
    raise RuntimeError(
        "SIM_USERNAME and SIM_PASSWORD environment variables "
        "must be set."
    )


# ==========================================
# LOAD OIL DEMO DATASET
# ==========================================

print(f"[*] Loading dataset: {FILE_NAME}")

df_volve = pd.read_csv(FILE_NAME)

print(
    f"[*] Dataset loaded: "
    f"{len(df_volve)} rows"
)


# ==========================================
# AUTHENTICATE WITH BACKEND
# ==========================================

print("[*] Authenticating with backend...")

try:
    token_response = requests.post(
        TOKEN_URL,
        data={
            "username": SIM_USERNAME,
            "password": SIM_PASSWORD
        },
        timeout=15.0
    )

    token_response.raise_for_status()

    access_token = token_response.json()["access_token"]

except requests.RequestException as exc:
    raise RuntimeError(
        f"Authentication failed: {exc}"
    ) from exc

except KeyError:
    raise RuntimeError(
        "Authentication succeeded but no access token "
        "was returned."
    )


HEADERS = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

print("[+] Authentication successful.")


# ==========================================
# MAP OIL DEMO TELEMETRY → ML FEATURES
# ==========================================

mapped_df = pd.DataFrame(
    index=df_volve.index
)


mapped_df["Depth"] = df_volve[
    "Measured Depth m"
]


mapped_df["WOB_mean"] = df_volve[
    "Averaged WOB kkgf"
]


mapped_df["RPM_mean"] = df_volve[
    "Averaged RPM rpm"
]


mapped_df["ROP_mean_5min"] = df_volve[
    "Rate of Penetration (5ft avg) m/h"
]


mapped_df["Torque_mean_5min"] = df_volve[
    "Average Surface Torque kN.m"
]


mapped_df["SPP_mean"] = df_volve[
    "Average Standpipe Pressure kPa"
]


mapped_df["MudWeight"] = df_volve[
    "Mud Density In g/cm3"
]


# OIL demo dataset does not contain a direct ECD
# measurement in the selected telemetry schema.
mapped_df["ECD"] = 10.2


# ==========================================
# GEO CONTEXT
# ==========================================

# The simulator provides the drilling location.
# The backend uses these coordinates to query
# PostGIS and calculate:
#
#   HistoricalLossCount
#   HistoricalStuckPipeCount
#   FormationRiskScore
#   DistanceToNearestRiskWell
#
# Using existing seeded well NHK-18.
mapped_df["Latitude"] = 27.2900
mapped_df["Longitude"] = 95.3350


mapped_df["FlowRate"] = df_volve[
    "Mud Flow In L/min"
]


mapped_df["Inclination"] = df_volve[
    "MWD Continuous Inclination dega"
]


mapped_df["Azimuth"] = df_volve[
    "MWD Continuous Azimuth dega"
]


# ==========================================
# NUMERIC CLEANING
# ==========================================

CORE_TELEMETRY = [
    "Depth",
    "WOB_mean",
    "RPM_mean",
    "ROP_mean_5min",
    "Torque_mean_5min",
    "SPP_mean",
    "MudWeight",
    "FlowRate",
    "Inclination",
    "Azimuth"
]


for feature in CORE_TELEMETRY:
    mapped_df[feature] = pd.to_numeric(
        mapped_df[feature],
        errors="coerce"
    )


# Replace infinities with NaN
mapped_df = mapped_df.replace(
    [np.inf, -np.inf],
    np.nan
)


# ==========================================
# SYNCHRONIZE SPARSE TELEMETRY
# ==========================================

# Several telemetry channels in the OIL demo
# dataset are sparse. Interpolate them so that
# the simulator can produce a synchronized
# telemetry stream.

mapped_df[CORE_TELEMETRY] = (
    mapped_df[CORE_TELEMETRY]
    .interpolate(
        method="linear",
        limit_direction="both"
    )
)


# Remove rows where the essential drilling
# telemetry is still unavailable.

mapped_df = mapped_df.dropna(
    subset=[
        "Depth",
        "Torque_mean_5min",
        "WOB_mean",
        "RPM_mean",
        "ROP_mean_5min"
    ]
)


# ==========================================
# START FROM VALID TELEMETRY REGION
# ==========================================

mapped_df = mapped_df.loc[
    mapped_df.index >= START_INDEX
]


# ==========================================
# CALCULATE LIVE TRENDS
# ==========================================

mapped_df["Torque_trend"] = (
    mapped_df["Torque_mean_5min"]
    .diff()
    .fillna(0)
)


mapped_df["SPP_trend"] = (
    mapped_df["SPP_mean"]
    .diff()
    .fillna(0)
)


mapped_df["ROP_trend"] = (
    mapped_df["ROP_mean_5min"]
    .diff()
    .fillna(0)
)


# ==========================================
# FINAL CLEANUP
# ==========================================

# These are only the features supplied by the
# simulator itself.
#
# Historical/geospatial ML features are NOT
# included here because the backend calculates
# them from PostGIS using Latitude/Longitude.

FEATURES = [
    "Depth",
    "ROP_mean_5min",
    "WOB_mean",
    "RPM_mean",
    "Torque_mean_5min",
    "SPP_mean",
    "MudWeight",
    "ECD",
    "FlowRate",
    "Inclination",
    "Azimuth",
    "Torque_trend",
    "SPP_trend",
    "ROP_trend"
]


for feature in FEATURES:
    mapped_df[feature] = pd.to_numeric(
        mapped_df[feature],
        errors="coerce"
    )


mapped_df = (
    mapped_df
    .replace([np.inf, -np.inf], np.nan)
    .dropna(subset=FEATURES)
)


records = mapped_df.to_dict(
    orient="records"
)


print(
    f"[*] Prepared {len(records)} "
    f"telemetry frames."
)


print(
    f"[*] Broadcasting telemetry stream "
    f"to {API_URL}..."
)


# ==========================================
# TELEMETRY STREAM
# ==========================================

try:

    for row in records:

        try:

            res = requests.post(
                API_URL,
                json=row,
                headers=HEADERS,
                timeout=10.0
            )

            if res.status_code == 200:

                data = res.json()

                print(
                    f"[+] Depth={row['Depth']:.2f} m | "
                    f"Torque={row['Torque_mean_5min']:.2f} | "
                    f"ROP={row['ROP_mean_5min']:.2f} | "
                    f"WOB={row['WOB_mean']:.2f} | "
                    f"Stuck={data.get('stuck_pipe_risk_percent', 0):.2f}% | "
                    f"Loss={data.get('mud_loss_risk_percent', 0):.2f}% | "
                    f"Severity={data.get('severity', 'UNKNOWN')}"
                )

            else:

                print(
                    f"[!] Prediction failed: "
                    f"HTTP {res.status_code}"
                )

                print(res.text)

        except requests.RequestException as exc:

            print(
                f"[!] Request error: {exc}"
            )

        time.sleep(POLLING_RATE)


except KeyboardInterrupt:

    print(
        "\n[*] Simulator stopped by user."
    )


print("[+] Telemetry simulation complete.")