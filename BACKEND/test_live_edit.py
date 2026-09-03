import requests
from database import SessionLocal, DocumentRecord
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

API_URL = "http://localhost:8000"
QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "oil_india_ddr"

def verify_live_edit_pipeline():
    print("[*] Step 1: Injecting dummy report into PostgreSQL (Source of Truth)...")
    db = SessionLocal()
    
    # Create a fake document with an OCR "mistake"
    dummy_doc = DocumentRecord(
        original_file_name="Well_15_Maintenance_Log.pdf",
        raw_extracted_text="Original OCR text: Minor vibrations observed. No action taken.",
        ai_metadata={"data_category": "Routine Daily Log"}
    )
    db.add(dummy_doc)
    db.commit()
    db.refresh(dummy_doc)
    doc_id = dummy_doc.id
    db.close()
    
    print(f"[+] Created Master SQL Record ID: {doc_id}")

    print("\n[*] Step 2: Simulating Engineer fixing the OCR via React Frontend (PUT Request)...")
    
    # The engineer realizes it wasn't a minor vibration, it was a major anomaly.
    new_text = "UPDATED TEXT: Severe Mechanical Torque Spike detected. Cease rotation immediately and pump heavy pill."
    payload = {
        "new_raw_text": new_text,
        "updated_by": "Senior Drilling Engineer (ID: 9942)"
    }
    
    response = requests.put(f"{API_URL}/documents/{doc_id}", json=payload)
    print(f"API Response: {response.json()}")

    print("\n[*] Step 3: Verifying PostgreSQL Audit Trail...")
    get_response = requests.get(f"{API_URL}/documents/{doc_id}")
    doc_data = get_response.json()
    print(f"Database Text: {doc_data['raw_text']}")
    print(f"Last Edited By: {doc_data['last_updated_by']}")

    print("\n[*] Step 4: Verifying Qdrant Vector Sync...")
    client = QdrantClient(url=QDRANT_URL)
    
    # Scroll through Qdrant looking for vectors tied to this specific PostgreSQL ID
    search_result = client.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=qmodels.Filter(
            must=[
                qmodels.FieldCondition(
                    key="postgres_doc_id",
                    match=qmodels.MatchValue(value=doc_id)
                )
            ]
        ),
        limit=5
    )
    
    points = search_result[0]
    if points:
        print(f"[+] SUCCESS! Qdrant perfectly synced. Found {len(points)} new vector chunk(s).")
        print(f"Qdrant Vector Payload: {points[0].payload['page_content']}")
        print(f"Dynamic AI Metadata: {points[0].payload['ai_metadata']}")
    else:
        print("[-] Qdrant sync failed. No vectors found.")

if __name__ == "__main__":
    verify_live_edit_pipeline()