import pandas as pd

from prediction_engine import predict_risk, FEATURES


DATASET = "OIL_eRTMAC_NWIS_dataset.csv"

print("[*] Loading dataset...")

df = pd.read_csv(DATASET)

# Take one real row from the dataset
sample = df[FEATURES].iloc[0].to_dict()

print("[*] Running prediction engine...")

# IMPORTANT: create the result before printing it
result = predict_risk(sample)

print("\n========== PREDICTION RESULT ==========")

print("Stuck Pipe:")
print(f"  Prediction: {result['stuck_pipe']['prediction']}")
print(f"  Probability: {result['stuck_pipe']['probability']:.2%}")
print(f"  Risk Level: {result['stuck_pipe']['risk_level']}")

print("\nMud Loss:")
print(f"  Prediction: {result['mud_loss']['prediction']}")
print(f"  Probability: {result['mud_loss']['probability']:.2%}")
print(f"  Risk Level: {result['mud_loss']['risk_level']}")

print("\n[+] Prediction engine working!")