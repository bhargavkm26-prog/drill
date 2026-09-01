import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from lightgbm import LGBMClassifier

print("[*] Loading lost circulation dataset...")

# Load dataset
df = pd.read_excel("lost_circulation_data.xlsx")

print(f"[+] Dataset loaded: {df.shape}")

# Target
TARGET = "LossesSeverity"

# Features
FEATURES = [
    "HoleSection",
    "M.Depth",
    "RateofPenetration",
    "WeightonBit",
    "Rotation",
    "Torque",
    "StandpipePressure",
    "FlowIn",
    "FlowOut",
    "PumpStroke",
    "MudWeight",
    "FunnelViscosity",
    "PlasticViscosity",
    "YieldPoint",
    "Gel Strength10sec",
    "Gel Strength10min",
    "Solid",
]

# Keep required columns
df = df[FEATURES + [TARGET]].copy()

# Remove missing values
df = df.dropna()

print(f"[+] Clean dataset: {df.shape}")

# Encode target
label_encoder = LabelEncoder()
y = label_encoder.fit_transform(df[TARGET])

X = df[FEATURES]

print("\n[*] Classes:")
for i, name in enumerate(label_encoder.classes_):
    print(f"    {i} = {name}")

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print(f"\n[+] Training samples: {len(X_train)}")
print(f"[+] Testing samples:  {len(X_test)}")

# LightGBM multiclass model
print("\n[*] Training LightGBM Mud Loss model...")

model = LGBMClassifier(
    objective="multiclass",
    num_class=len(label_encoder.classes_),
    n_estimators=500,
    learning_rate=0.05,
    num_leaves=31,
    max_depth=-1,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
    verbosity=-1
)

model.fit(X_train, y_train)

print("[+] Training complete!")

# Predictions
y_pred = model.predict(X_test)

# Evaluation
print("\n========== MODEL RESULTS ==========")

print("\nClassification Report:")
print(
    classification_report(
        y_test,
        y_pred,
        target_names=label_encoder.classes_,
        zero_division=0
    )
)

print("Macro F1:",
      round(f1_score(y_test, y_pred, average="macro"), 4))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# Save model + encoder
joblib.dump(
    {
        "model": model,
        "label_encoder": label_encoder,
        "features": FEATURES
    },
    "mud_loss_external_model.pkl"
)

print("\n[+] Saved model:")
print("    mud_loss_external_model.pkl")