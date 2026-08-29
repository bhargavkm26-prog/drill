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

# RAG & Embeddings
from langchain_community.document_loaders import DirectoryLoader, UnstructuredLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

app = FastAPI(title="OIL eRTMAC - Enterprise AI Engine", version="1.0.0")

# =========================================================
# 1. CORS MIDDLEWARE (Enables React Frontend Communication)
# =========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows Vite/React localhost origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# 2. WEBSOCKET REAL-TIME BROADCASTER
# =========================================================
class ConnectionManager:
    """Manages active WebSocket connections to broadcast telemetry to React UIs."""
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
    """WebSocket stream for live gauges and industrial alerts in React."""
    await manager.connect(websocket)
    try:
        while True:
            # Keeps the socket connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# =========================================================
# 3. AI MODELS & VECTOR DATABASE INITIALIZATION
# =========================================================
try:
    model_stuck = joblib.load("models/stuck_pipe_model.pkl")
    model_loss = joblib.load("models/mud_loss_model.pkl")
except Exception as e:
    model_stuck, model_loss = None, None

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

# In-memory circular buffer for historical time-series charts (last 50 data frames)
telemetry_history: List[dict] = []

# =========================================================
# 4. BACKGROUND WORKER: BULK & OCR DOCUMENT INGESTION
# =========================================================
def process_bulk_directory_background(directory_path: str, source_name: str):
    print(f"[*] Worker Crawling: {directory_path} ({source_name})")
    try:
        loader = DirectoryLoader(
            directory_path, 
            glob="**/*.*", 
            loader_cls=UnstructuredLoader, 
            loader_kwargs={"strategy": "hi_res", "ocr_languages": "eng"}
        )
        documents = loader.load()
        if not documents:
            return

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = text_splitter.split_documents(documents)
        
        points = []
        for chunk in chunks:
            vector = embeddings_model.embed_query(chunk.page_content)
            source_file = chunk.metadata.get("source", source_name)
            points.append(
                PointStruct(
                    id=str(uuid.uuid4()), 
                    vector=vector, 
                    payload={"page_content": chunk.page_content, "source": source_file}
                )
            )
        
        qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points)
        print(f"[+] Successfully indexed {len(chunks)} vectors from {source_name}.")
    except Exception as e:
        print(f"[-] Document Ingestion Error ({source_name}): {e}")
    finally:
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
    return {"status": "queued", "message": f"Document '{file.filename}' queued for OCR & vector indexing."}

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
    return {"status": "queued", "message": f"Archive '{file.filename}' extracted. Batch OCR ingestion running."}

class SyncRequest(BaseModel):
    directory_path: str

@app.post("/sync-data-lake")
async def sync_data_lake(request: SyncRequest, background_tasks: BackgroundTasks):
    if not os.path.isdir(request.directory_path):
        raise HTTPException(status_code=404, detail="Directory path not found on server.")
    background_tasks.add_task(process_bulk_directory_background, request.directory_path, "Network_DataLake_Sync")
    return {"status": "sync_started", "message": f"Crawling directory '{request.directory_path}'."}

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

    # ML Probabilities & Physics Heuristics
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

    # Contextual RAG Retrieval
    mitigation_strategy = "Continue standard operational parameters."
    source_document = "N/A"
    
    if is_critical and active_warnings:
        query = f"Mitigation and standard operating procedure for {active_warnings[0]}"
        query_vector = embeddings_model.embed_query(query)
        
        search_results = qdrant_client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            limit=1
        )
        
        if search_results:
            mitigation_strategy = search_results[0].payload.get("page_content", "No mitigation record.")
            source_document = search_results[0].payload.get("source", "Historical Log")

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

    # Maintain a rolling window of recent frames
    telemetry_history.append(response_payload)
    if len(telemetry_history) > 50:
        telemetry_history.pop(0)

    # Real-time WebSocket broadcast to all active React clients
    await manager.broadcast(response_payload)

    return response_payload

@app.get("/telemetry/history")
async def get_telemetry_history():
    """Returns recent telemetry for historical graphing when frontend loads."""
    return telemetry_history