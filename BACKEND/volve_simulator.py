import os
import time
import requests
import pandas as pd
import numpy as np
from datetime import datetime


print("[*] Initializing Production eRTMAC Telemetry Stream Client...")


# ==========================================
# CONFIGURATION
# ==========================================

file_name = "OIL_DEMO_DATASET.csv"

API_BASE_URL = "http://127.0.0.1:8000"
TOKEN_URL = f"{API_BASE_URL}/api/v1/auth/token"
API_URL = f"{API_BASE_URL}/api/v1/predict"

SIM_USERNAME = os.getenv("SIM_USERNAME")
SIM_PASSWORD = os.getenv("SIM_PASSWORD")

POLLING_RATE = 1.0

# Start from the first region containing
# meaningful drilling telemetry.
START_INDEX = 2405

# ==========================================


# ==========================================
# AUTHENTICATION
# ==========================================

if not SIM_USERNAME or not SIM_PASSWORD:
    print("[-] SIM_USERNAME or SIM_PASSWORD is not set.")
    exit()


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

    token_data = token_response.json()
    access_token = token_data["access_token"]

    print("[+] Authentication successful.")

except requests.exceptions.RequestException as e:
    print(f"[-] Authentication failed: {e}")
    exit()

except (KeyError, ValueError) as e:
    print(f"[-] Invalid authentication response: {e}")
    exit()


HEADERS = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}


# ==========================================
# LOAD OIL DEMO DATASET
# ==========================================

try:
    df_volve = pd.read_csv(
        file_name,
        low_memory=False
    )

except FileNotFoundError:
    print(f"[-] Error: '{file_name}' not found.")
    exit()

except Exception as e:
    print(f"[-] Error loading dataset: {e}")
    exit()


print(
    f"[*] Loaded OIL demo dataset: "
    f"{len(df_volve)} rows"
)


# ==========================================
# SELECT TELEMETRY REGION
# ==========================================

if START_INDEX >= len(df_volve):
    print(
        f"[-] START_INDEX {START_INDEX} "
        f"is outside the dataset."
    )
    exit()


df_volve = df_volve.iloc[START_INDEX:].copy()

print(
    f"[*] Starting telemetry stream "
    f"from dataset index {START_INDEX}..."
)


# ==========================================
# MAP OIL DEMO TELEMETRY → ML FEATURES
# ==========================================

mapped_df = pd.DataFrame(index=df_volve.index)


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

# Historical/context features are not available
# directly from the simulator telemetry.
mapped_df["HistoricalLossCount"] = 0
mapped_df["HistoricalStuckPipeCount"] = 0
mapped_df["FormationRiskScore"] = 0.5
mapped_df["DistanceToNearestRiskWell"] = 1500.0

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
#
# The OIL demo telemetry sensors do not all
# report values on the exact same row.
#
# Interpolate between real sensor observations
# so the simulator can produce a continuous
# synchronized telemetry stream.
#

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

FEATURES = [
    "Depth",
    "ROP_mean_5min",
    "WOB_mean",
    "RPM_mean",
    "Torque_mean_5min",
    "SPP_mean",
    "MudWeight",
    "ECD",
    "HistoricalLossCount",
    "HistoricalStuckPipeCount",
    "FormationRiskScore",
    "FlowRate",
    "Inclination",
    "Azimuth",
    "DistanceToNearestRiskWell",
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

    for i, row in enumerate(records):

        row["live_timestamp"] = (
            datetime.now().isoformat()
        )

        try:

            res = requests.post(
                API_URL,
                json=row,
                headers=HEADERS,
                timeout=10.0
            )

            if res.status_code == 200:

                data = res.json()

                metrics = data.get(
                    "metrics",
                    {}
                )

                warnings = " | ".join(
                    data.get(
                        "active_warnings",
                        []
                    )
                )

                print(
                    f"[Frame {i}] "
                    f"Depth: "
                    f"{metrics.get('depth_m', row['Depth']):.2f}m | "
                    f"Torque: "
                    f"{metrics.get('torque_kNm', row['Torque_mean_5min']):.2f} | "
                    f"ROP: "
                    f"{row['ROP_mean_5min']:.2f} | "
                    f"WOB: "
                    f"{row['WOB_mean']:.2f} | "
                    f"Status: "
                    f"[{data.get('severity', 'UNKNOWN')}] "
                    f"-> {warnings}"
                )

            else:

                print(
                    f"[-] API Error: "
                    f"{res.status_code} "
                    f"{res.text[:200]}"
                )

        except requests.exceptions.Timeout:

            print(
                f"[-] Prediction API request "
                f"timed out at frame {i}."
            )

        except requests.exceptions.RequestException as e:

            print(
                f"[-] Prediction API error "
                f"at frame {i}: {e}"
            )

        time.sleep(POLLING_RATE)


except KeyboardInterrupt:

    print(
        "\n[*] Telemetry broadcast "
        "stopped by operator."
    )


except Exception as e:

    print(
        f"\n[-] Unexpected simulator error: {e}"
    )