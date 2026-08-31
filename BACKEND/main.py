import os
import uuid
import shutil
import zipfile
import joblib
import pandas as pd
from typing import List
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import SessionLocal, DocumentRecord
from qdrant_client.http import models as qmodels

# Enterprise Multimodal OCR Engine
from multimodal_extractor import ProductionDocumentIntelligence

# RAG & Embeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

app = FastAPI(title="OIL eRTMAC - Enterprise AI Engine", version="2.0.0")

# =========================================================
# 1. CORS MIDDLEWARE
# =========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# 2. WEBSOCKET REAL-TIME BROADCASTER
# =========================================================
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# =========================================================
# 3. AI MODELS, VLM PARSER & VECTOR DB INITIALIZATION
# =========================================================
try:
    model_stuck = joblib.load("models/stuck_pipe_model.pkl")
    model_loss = joblib.load("models/mud_loss_model.pkl")
except Exception:
    model_stuck, model_loss = None, None

doc_intelligence = ProductionDocumentIntelligence()

QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "oil_india_ddr"
qdrant_client = QdrantClient(url=QDRANT_URL)
embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

if not qdrant_client.collection_exists(COLLECTION_NAME):
    qdrant_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=384, distance=Distance.COSINE),
    )

os.makedirs("temp_uploads", exist_ok=True)
telemetry_history: List[dict] = []

# =========================================================
# 3.5 AI FEATURE & CLASSIFICATION ENGINE
# =========================================================
def ai_feature_engine(raw_ocr_text: str) -> dict:
    detected_entities = []
    has_anomaly = False
    risk_score = 1
    text_lower = raw_ocr_text.lower()

    if "torque spike" in text_lower or "stuck" in text_lower or "losses" in text_lower:
        has_anomaly = True
        risk_score = 8
        if "torque spike" in text_lower:
            detected_entities.append("Mechanical Torque Spike")
        if "stuck" in text_lower:
            detected_entities.append("Stuck Pipe Indicator")
        if "losses" in text_lower:
            detected_entities.append("Mud Loss")

    return {
        "data_category": "Incident Observation" if has_anomaly else "Routine Daily Log",
        "risk_score": risk_score,
        "detected_entities": detected_entities,
        "has_anomaly": has_anomaly
    }

# =========================================================
# 4. BACKGROUND WORKER: ENTERPRISE MULTIMODAL INGESTION
# =========================================================
def process_bulk_directory_background(directory_path: str, source_name: str):
    db = SessionLocal()
    try:
        points = []
        for root, _, files in os.walk(directory_path):
            for file in files:
                file_path = os.path.join(root, file)
                raw_text = ""
                
                # 1. Neural OCR for Images / PDFs
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.pdf')):
                    raw_text = doc_intelligence.extract_text_from_document(file_path)

                    print(f"\n====== OCR EXTRACTION SUCCESS ======")
                    print(raw_text[:500] + "...\n====================================\n")
                
                # 2. Spreadsheets & CSVs
                elif file.lower().endswith(('.csv', '.xlsx', '.xls')):
                    try:
                        df = pd.read_csv(file_path) if file.lower().endswith('.csv') else pd.read_excel(file_path)
                        df.dropna(how='all', inplace=True)
                        raw_text = df.fillna("").to_csv(index=False, sep="|")
                    except Exception as e:
                        print(f"[-] Spreadsheet read error on {file}: {e}")
                        continue
                else:
                    continue

                if not raw_text.strip():
                    continue

                # 3. Dynamic Classification
                ai_meta = ai_feature_engine(raw_text)

                # 4. Save to PostgreSQL Master Table
                doc_record = DocumentRecord(
                    original_file_name=file,
                    raw_extracted_text=raw_text,
                    ai_metadata=ai_meta
                )
                db.add(doc_record)
                db.commit()
                db.refresh(doc_record)
                
                # 5. Semantic Chunking
                text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
                chunks = text_splitter.split_text(raw_text)
                
                # 6. Index into Qdrant with PostgreSQL Reference Key
                for chunk in chunks:
                    vector = embeddings_model.embed_query(chunk)
                    payload_data = {
                        "postgres_doc_id": doc_record.id,
                        "page_content": chunk,
                        "source": file,
                        "ai_metadata": ai_meta
                    }
                    points.append(
                        PointStruct(id=str(uuid.uuid4()), vector=vector, payload=payload_data)
                    )
        
        if points:
            qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points)
            
    finally:
        db.close()
        if os.path.exists(directory_path):
            shutil.rmtree(directory_path)

@app.post("/upload-report")
async def upload_drilling_report(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    staging_dir = f"temp_uploads/single_{uuid.uuid4()}"
    os.makedirs(staging_dir, exist_ok=True)
    file_path = os.path.join(staging_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    background_tasks.add_task(process_bulk_directory_background, staging_dir, file.filename)
    return {"status": "queued", "message": f"Document '{file.filename}' queued for Neural VLM OCR & vector indexing."}

@app.post("/upload-bulk-archive")
async def upload_bulk_archive(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only .zip archives are supported.")
        
    archive_path = f"temp_uploads/{file.filename}"
    extract_dir = f"temp_uploads/extracted_{uuid.uuid4()}"
    
    with open(archive_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    with zipfile.ZipFile(archive_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)
        
    os.remove(archive_path)
    background_tasks.add_task(process_bulk_directory_background, extract_dir, file.filename)
    return {"status": "queued", "message": f"Archive '{file.filename}' extracted. Batch Neural VLM OCR running."}

class SyncRequest(BaseModel):
    directory_path: str

@app.post("/sync-data-lake")
async def sync_data_lake(request: SyncRequest, background_tasks: BackgroundTasks):
    if not os.path.isdir(request.directory_path):
        raise HTTPException(status_code=404, detail="Directory path not found on server.")
    background_tasks.add_task(process_bulk_directory_background, request.directory_path, "Network_DataLake_Sync")
    return {"status": "sync_started", "message": f"Crawling directory '{request.directory_path}' using VLM pipeline."}

# =========================================================
# 5. REAL-TIME TELEMETRY & PREDICTION ENGINE
# =========================================================
class RigTelemetry(BaseModel):
    Depth: float
    ROP_mean_5min: float
    WOB_mean: float
    RPM_mean: float
    Torque_mean_5min: float
    SPP_mean: float
    MudWeight: float
    ECD: float
    HistoricalLossCount: int = 0
    HistoricalStuckPipeCount: int = 0
    FormationRiskScore: float = 0.5
    FlowRate: float
    Inclination: float = 0.0
    Azimuth: float = 0.0
    DistanceToNearestRiskWell: float = 1500.0
    Torque_trend: float = 0.0
    SPP_trend: float = 0.0
    ROP_trend: float = 0.0

@app.post("/predict")
async def predict_drilling_risk(telemetry: RigTelemetry):
    if not model_stuck or not model_loss:
        raise HTTPException(status_code=500, detail="ML Models not initialized.")

    input_data = pd.DataFrame([telemetry.dict()])

    prob_stuck = float(model_stuck.predict_proba(input_data)[0][1]) * 100
    prob_loss = float(model_loss.predict_proba(input_data)[0][1]) * 100
    torque_spike_detected = telemetry.Torque_trend > 15.0
    overpressure_risk = telemetry.ECD > (telemetry.MudWeight + 1.2)

    is_critical = prob_stuck > 70 or prob_loss > 70 or torque_spike_detected or overpressure_risk
    
    active_warnings = []
    if prob_stuck > 70: active_warnings.append("Stuck Pipe Probability")
    if torque_spike_detected: active_warnings.append("Mechanical Torque Spike")
    if prob_loss > 70: active_warnings.append("Severe Mud Loss")

    status_flag = "CRITICAL" if is_critical else "NORMAL"
    mitigation_strategy = "Continue standard operational parameters."
    source_document = "N/A"
    
    if is_critical and active_warnings:
        query = f"Mitigation and standard operating procedure for {active_warnings[0]}"
        query_vector = embeddings_model.embed_query(query)
        
        search_response = qdrant_client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            limit=1
        )
        
        if search_response.points:
            mitigation_strategy = search_response.points[0].payload.get("page_content", "No mitigation record.")
            source_document = search_response.points[0].payload.get("source", "Historical Log")

    response_payload = {
        "status": "success",
        "severity": status_flag,
        "active_warnings": active_warnings if active_warnings else ["None"],
        "mitigation_strategy": mitigation_strategy,
        "source_document": source_document,
        "metrics": {
            "depth_m": round(telemetry.Depth, 2),
            "stuck_pipe_risk_percent": round(prob_stuck, 2),
            "mud_loss_risk_percent": round(prob_loss, 2),
            "torque_kNm": round(telemetry.Torque_mean_5min, 2),
            "rop_m_hr": round(telemetry.ROP_mean_5min, 2),
            "wob_klbs": round(telemetry.WOB_mean, 2),
            "rpm": round(telemetry.RPM_mean, 2),
            "spp_psi": round(telemetry.SPP_mean, 2),
            "ecd_sg": round(telemetry.ECD, 2)
        },
        "alert": is_critical
    }

    telemetry_history.append(response_payload)
    if len(telemetry_history) > 50:
        telemetry_history.pop(0)

    await manager.broadcast(response_payload)
    return response_payload

@app.get("/telemetry/history")
async def get_telemetry_history():
    return telemetry_history

# =========================================================
# 6. DOCUMENT MANAGEMENT & AUDITABLE EDITING
# =========================================================
class DocumentUpdate(BaseModel):
    new_raw_text: str
    updated_by: str = "Engineer"

@app.get("/documents/{doc_id}")
async def get_document(doc_id: str):
    db = SessionLocal()
    try:
        doc = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        return {
            "id": doc.id,
            "filename": doc.original_file_name,
            "raw_text": doc.raw_extracted_text,
            "ai_metadata": doc.ai_metadata,
            "last_updated_by": doc.last_updated_by,
            "last_updated_at": doc.last_updated_at
        }
    finally:
        db.close()

@app.put("/documents/{doc_id}")
async def update_and_sync_document(doc_id: str, payload: DocumentUpdate):
    db = SessionLocal()
    try:
        doc = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found in database")
            
        doc.raw_extracted_text = payload.new_raw_text
        doc.last_updated_by = payload.updated_by
        doc.ai_metadata = ai_feature_engine(payload.new_raw_text)
        
        db.commit()
        db.refresh(doc)

        qdrant_client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="postgres_doc_id",
                        match=qmodels.MatchValue(value=doc_id)
                    )
                ]
            )
        )

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = text_splitter.split_text(payload.new_raw_text)
        
        new_points = []
        for chunk in chunks:
            vector = embeddings_model.embed_query(chunk)
            new_points.append(
                PointStruct(
                    id=str(uuid.uuid4()), 
                    vector=vector, 
                    payload={
                        "postgres_doc_id": doc.id,
                        "page_content": chunk,
                        "source": doc.original_file_name,
                        "ai_metadata": doc.ai_metadata
                    }
                )
            )
            
        if new_points:
            qdrant_client.upsert(collection_name=COLLECTION_NAME, points=new_points)

        return {
            "status": "success",
            "message": f"Document '{doc.original_file_name}' updated in PostgreSQL and re-indexed in Qdrant.",
            "doc_id": doc.id
        }
    
    finally:
        db.close()


@app.get("/documents")
async def list_recent_documents():
    db = SessionLocal()
    try:
        # Fetch the 10 most recently processed documents
        docs = db.query(DocumentRecord).order_by(DocumentRecord.last_updated_at.desc()).limit(10).all()
        return [
            {
                "id": doc.id,
                "filename": doc.original_file_name,
                "raw_text": doc.raw_extracted_text,
                "ai_metadata": doc.ai_metadata,
                "last_updated_at": doc.last_updated_at
            } 
            for doc in docs
        ]
    finally:
        db.close()    