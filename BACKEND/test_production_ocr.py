import os
import time
import requests
from PIL import Image, ImageDraw

API_URL = "http://localhost:8000"

def create_test_drilling_report(filename="test_well_log.png"):
    """Generates a synthetic high-resolution drilling report image for VLM testing."""
    img = Image.new('RGB', (1000, 500), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    report_content = """
    OFFSHORE DRILLING INCIDENT LOG - WELL 15/9-F-9
    Formation Depth: 3450m - 3500m (Siltstone & Shale)
    Anomaly Detected: Severe Mechanical Torque Spike reaching 52 kNm.
    
    MANDATORY MITIGATION SOP:
    1. Immediately cease rotation and pick off bottom by 3 meters.
    2. High-rate circulation at 600 GPM to clear dense cuttings bed from annulus.
    3. Pump 40 bbl heavy LCM pill if torque fails to normalize within 5 minutes.
    Approved By: Senior Drilling Superintendent
    """
    
    draw.text((40, 40), report_content, fill=(10, 10, 10))
    img.save(filename)
    print(f"[+] Generated synthetic test report: {filename}")
    return filename

def verify_production_pipeline():
    test_file = create_test_drilling_report()
    
    # 1. Test Upload Endpoint (Triggers Asynchronous Neural VLM OCR)
    print("\n[*] Step 1: Uploading document to /upload-report...")
    with open(test_file, "rb") as f:
        response = requests.post(
            f"{API_URL}/upload-report", 
            files={"file": (test_file, f, "image/png")}
        )
    print("Upload Response:", response.json())
    
    # 2. Wait for background worker to process Surya-OCR and embed into Qdrant
    print("\n[*] Step 2: Waiting 8 seconds for Deep Learning VLM OCR & Qdrant indexing...")
    time.sleep(8)
    
    # 3. Test Prediction & RAG Retrieval
    print("\n[*] Step 3: Simulating a live drilling torque spike to test RAG retrieval...")
    telemetry_payload = {
        "Depth": 3480.0,
        "ROP_mean_5min": 3.5,
        "WOB_mean": 24.0,
        "RPM_mean": 95.0,
        "Torque_mean_5min": 48.0,
        "SPP_mean": 2900.0,
        "MudWeight": 1.30,
        "ECD": 1.38,
        "FlowRate": 550.0,
        "Torque_trend": 19.2 # Triggers Torque Spike warning
    }
    
    pred_res = requests.post(f"{API_URL}/predict", json=telemetry_payload)
    result = pred_res.json()
    
    print("\n--- AI Engine Response ---")
    print("System Severity:", result.get("severity"))
    print("Active Warnings:", result.get("active_warnings"))
    print("Retrieved Mitigation SOP:", result.get("mitigation_strategy"))
    print("Source Document Match:", result.get("source_document"))
    
    # Cleanup local test file
    if os.path.exists(test_file):
        os.remove(test_file)

if __name__ == "__main__":
    verify_production_pipeline()