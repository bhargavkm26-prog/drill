import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score
)

DATASET = "OIL_eRTMAC_NWIS_dataset.csv"

FEATURES = [
    'Depth',
    'ROP_mean_5min',
    'WOB_mean',
    'RPM_mean',
    'Torque_mean_5min',
    'SPP_mean',
    'MudWeight',
    'ECD',
    'HistoricalLossCount',
    'HistoricalStuckPipeCount',
    'FormationRiskScore',
    'FlowRate',
    'Inclination',
    'Azimuth',
    'DistanceToNearestRiskWell',
    'Torque_trend',
    'SPP_trend',
    'ROP_trend'
]

print("[*] Loading dataset...")
df = pd.read_csv(DATASET)

print("[*] Loading models...")
stuck_model = joblib.load("models/stuck_pipe_model.pkl")
mud_loss_model = joblib.load("models/mud_loss_model.pkl")

X = df[FEATURES]

# -----------------------------
# STUCK PIPE TEST SET
# -----------------------------

X_train_s, X_test_s, y_train_s, y_test_s = train_test_split(
    X,
    df["StuckPipe"],
    test_size=0.20,
    random_state=42,
    stratify=df["StuckPipe"]
)

stuck_pred = stuck_model.predict(X_test_s)
stuck_prob = stuck_model.predict_proba(X_test_s)[:, 1]

print("\n========== STUCK PIPE ==========")

print("\nClassification Report:")
print(classification_report(
    y_test_s,
    stuck_pred,
    target_names=["No Stuck Pipe", "Stuck Pipe"],
    zero_division=0
))

print("Confusion Matrix:")
print(confusion_matrix(y_test_s, stuck_pred))

print(f"\nROC-AUC: {roc_auc_score(y_test_s, stuck_prob):.4f}")


# -----------------------------
# MUD LOSS TEST SET
# -----------------------------

X_train_l, X_test_l, y_train_l, y_test_l = train_test_split(
    X,
    df["MudLoss"],
    test_size=0.20,
    random_state=42,
    stratify=df["MudLoss"]
)

loss_pred = mud_loss_model.predict(X_test_l)
loss_prob = mud_loss_model.predict_proba(X_test_l)[:, 1]

print("\n========== MUD LOSS ==========")

print("\nClassification Report:")
print(classification_report(
    y_test_l,
    loss_pred,
    target_names=["No Mud Loss", "Mud Loss"],
    zero_division=0
))

print("Confusion Matrix:")
print(confusion_matrix(y_test_l, loss_pred))

print(f"\nROC-AUC: {roc_auc_score(y_test_l, loss_prob):.4f}")

print("\n[+] Hold-out evaluation complete!")