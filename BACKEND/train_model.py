import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import lightgbm as lgb

print("[*] Loading NWIS Drilling Dataset...")
df = pd.read_csv("OIL_eRTMAC_NWIS_dataset.csv")

# Input features matching your full architecture stack
features = [
    'Depth', 'ROP_mean_5min', 'WOB_mean', 'RPM_mean', 'Torque_mean_5min',
    'SPP_mean', 'MudWeight', 'ECD', 'HistoricalLossCount',
    'HistoricalStuckPipeCount', 'FormationRiskScore', 'FlowRate',
    'Inclination', 'Azimuth', 'DistanceToNearestRiskWell',
    'Torque_trend', 'SPP_trend', 'ROP_trend'
]

X = df[features]
y_stuck = df['StuckPipe']
y_loss = df['MudLoss']

# ------------------------------------------
# 1. Train Stuck Pipe Model (LightGBM)
# ------------------------------------------
print("\n[*] Training Stuck Pipe Model (LightGBM)...")
X_train_s, X_test_s, y_train_s, y_test_s = train_test_split(
    X, y_stuck, test_size=0.2, random_state=42, stratify=y_stuck
)

model_stuck = lgb.LGBMClassifier(
    n_estimators=100, random_state=42, class_weight='balanced', verbose=-1
)
model_stuck.fit(X_train_s, y_train_s)

print("[+] Stuck Pipe Classification Report:")
print(classification_report(y_test_s, model_stuck.predict(X_test_s)))

# ------------------------------------------
# 2. Train Mud Loss Model (LightGBM)
# ------------------------------------------
print("\n[*] Training Mud Loss Model (LightGBM)...")
X_train_l, X_test_l, y_train_l, y_test_l = train_test_split(
    X, y_loss, test_size=0.2, random_state=42, stratify=y_loss
)

model_loss = lgb.LGBMClassifier(
    n_estimators=100, random_state=42, class_weight='balanced', verbose=-1
)
model_loss.fit(X_train_l, y_train_l)

print("[+] Mud Loss Classification Report:")
print(classification_report(y_test_l, model_loss.predict(X_test_l)))

# ------------------------------------------
# 3. Export Models
# ------------------------------------------
print("\n[*] Saving LightGBM model artifacts...")
os.makedirs("models", exist_ok=True)
joblib.dump(model_stuck, "models/stuck_pipe_model.pkl")
joblib.dump(model_loss, "models/mud_loss_model.pkl")

print("[+] Complete! LightGBM models saved to the 'models/' folder.")