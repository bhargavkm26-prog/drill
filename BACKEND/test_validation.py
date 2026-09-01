from prediction_engine import predict_risk, FEATURES


# Start with a valid input
valid_data = {feature: 1.0 for feature in FEATURES}

print("[TEST 1] Valid input")

try:
    result = predict_risk(valid_data)
    print("[+] Valid input accepted")
    print(result)
except Exception as e:
    print(f"[-] Unexpected error: {e}")


# Test missing feature
print("\n[TEST 2] Missing feature")

missing_data = valid_data.copy()
missing_data.pop("Depth")

try:
    predict_risk(missing_data)
    print("[-] ERROR: Missing feature was accepted")
except ValueError as e:
    print(f"[+] Correctly rejected: {e}")


# Test non-numeric feature
print("\n[TEST 3] Non-numeric feature")

invalid_data = valid_data.copy()
invalid_data["Depth"] = "hello"

try:
    predict_risk(invalid_data)
    print("[-] ERROR: Non-numeric value was accepted")
except ValueError as e:
    print(f"[+] Correctly rejected: {e}")