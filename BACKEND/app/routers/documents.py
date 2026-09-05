import os
import uuid
import shutil
import zipfile
import logging
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DocumentRecord
from app.schemas import DocumentUpdate, DocumentResponse
from app.auth import require_role
from app.config import settings
from app.services.ocr_service import ocr_service
from app.services.rag_service import rag_service

logger = logging.getLogger("NWIS.Documents")

router = APIRouter(prefix="/api/v1/documents", tags=["Document Management & OCR"])

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────
# BACKGROUND WORKER: Enterprise Multimodal Ingestion Pipeline
# ─────────────────────────────────────────────────────────────
def _process_directory(directory_path: str, source_name: str):
    """
    Background task that crawls a directory, applies OCR to images/PDFs,
    parses spreadsheets, classifies everything, and indexes into both
    PostgreSQL (structured) and Qdrant (vector).
    """
    from app.database import SessionLocal
    db = SessionLocal()

    try:
        processed = 0
        for root, _, files in os.walk(directory_path):
            for file in files:
                file_path = os.path.join(root, file)
                raw_text = ""

                # Neural OCR for images and PDFs
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.pdf')):
                    raw_text = ocr_service.extract_text(file_path)
                    if raw_text:
                        logger.info(f"OCR extracted {len(raw_text)} chars from '{file}'")

                # Spreadsheets and CSVs
                elif file.lower().endswith(('.csv', '.xlsx', '.xls')):
                    try:
                        if file.lower().endswith('.csv'):
                            df = pd.read_csv(file_path)
                        else:
                            df = pd.read_excel(file_path)
                        df.dropna(how='all', inplace=True)
                        raw_text = df.fillna("").to_csv(index=False, sep="|")
                    except Exception as e:
                        logger.warning(f"Spreadsheet parse error on '{file}': {e}")
                        continue
                else:
                    continue

                if not raw_text.strip():
                    continue

                # AI Classification
                ai_metadata = ocr_service.classify_text(raw_text)

                # Save to PostgreSQL
                doc_record = DocumentRecord(
                    original_file_name=file,
                    raw_extracted_text=raw_text,
                    ai_metadata=ai_metadata,
                )
                db.add(doc_record)
                db.commit()
                db.refresh(doc_record)

                # Index into Qdrant vector store
                rag_service.index_document(
                    doc_id=doc_record.id,
                    raw_text=raw_text,
                    source_filename=file,
                    ai_metadata=ai_metadata,
                )
                processed += 1

        logger.info(f"Batch processing complete: {processed} documents from '{source_name}'")

    except Exception as e:
        logger.error(f"Background processing error: {e}")
    finally:
        db.close()
        # Cleanup staging directory
        if os.path.exists(directory_path) and directory_path.startswith(settings.UPLOAD_DIR):
            shutil.rmtree(directory_path, ignore_errors=True)


# ─────────────────────────────────────────────────────────────
# POST /api/v1/documents/upload — Single file upload
# ─────────────────────────────────────────────────────────────
@router.post("/upload")
async def upload_report(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: dict = Depends(require_role(["Admin", "Engineer"]))
):
    """Upload a single drilling report (PDF, image, CSV, Excel) for AI processing."""
    staging_dir = os.path.join(settings.UPLOAD_DIR, f"single_{uuid.uuid4()}")
    os.makedirs(staging_dir, exist_ok=True)
    file_path = os.path.join(staging_dir, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extract text synchronously for the demo so the frontend can display it immediately
    raw_text = ""
    if file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.pdf')):
        raw_text = ocr_service.extract_text(file_path)

    background_tasks.add_task(_process_directory, staging_dir, file.filename)

    logger.info(f"Document '{file.filename}' queued by {user['username']}")
    return {
        "status": "queued",
        "message": f"Document '{file.filename}' queued for Neural OCR & vector indexing.",
        "uploaded_by": user["username"],
        "extracted_text": raw_text
    }


# ─────────────────────────────────────────────────────────────
# POST /api/v1/documents/upload-bulk — ZIP archive upload
# ─────────────────────────────────────────────────────────────
@router.post("/upload-bulk")
async def upload_bulk_archive(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: dict = Depends(require_role(["Admin", "Engineer"]))
):
    """Upload a ZIP archive containing multiple drilling reports for batch processing."""
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only .zip archives are supported.")

    archive_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    extract_dir = os.path.join(settings.UPLOAD_DIR, f"extracted_{uuid.uuid4()}")

    with open(archive_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    with zipfile.ZipFile(archive_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)

    os.remove(archive_path)
    background_tasks.add_task(_process_directory, extract_dir, file.filename)

    return {
        "status": "queued",
        "message": f"Archive '{file.filename}' extracted. Batch Neural OCR running.",
        "uploaded_by": user["username"],
    }


# ─────────────────────────────────────────────────────────────
# POST /api/v1/documents/sync — Data lake directory sync
# ─────────────────────────────────────────────────────────────
@router.post("/sync")
async def sync_data_lake(
    directory_path: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_role(["Admin"]))
):
    """Sync and ingest all documents from a network data lake directory."""
    if not os.path.isdir(directory_path):
        raise HTTPException(status_code=404, detail="Directory path not found on server.")

    background_tasks.add_task(_process_directory, directory_path, "DataLake_Sync")
    return {
        "status": "sync_started",
        "message": f"Crawling directory '{directory_path}' using VLM pipeline.",
    }


# ─────────────────────────────────────────────────────────────
# GET /api/v1/documents — List recent documents
# ─────────────────────────────────────────────────────────────
@router.get("")
async def list_documents(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["Admin", "Engineer", "Viewer"]))
):
    """List recently processed documents with AI metadata."""
    docs = (
        db.query(DocumentRecord)
        .order_by(DocumentRecord.last_updated_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    total = db.query(DocumentRecord).count()

    return {
        "total": total,
        "documents": [
            {
                "id": doc.id,
                "filename": doc.original_file_name,
                "ai_metadata": doc.ai_metadata,
                "last_updated_by": doc.last_updated_by,
                "last_updated_at": str(doc.last_updated_at) if doc.last_updated_at else None,
            }
            for doc in docs
        ]
    }


# ─────────────────────────────────────────────────────────────
# GET /api/v1/documents/{doc_id} — Get full document
# ─────────────────────────────────────────────────────────────
@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["Admin", "Engineer", "Viewer"]))
):
    """Get a document's full extracted text and AI classification."""
    doc = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    return {
        "id": doc.id,
        "filename": doc.original_file_name,
        "raw_text": doc.raw_extracted_text,
        "ai_metadata": doc.ai_metadata,
        "last_updated_by": doc.last_updated_by,
        "last_updated_at": str(doc.last_updated_at) if doc.last_updated_at else None,
    }


# ─────────────────────────────────────────────────────────────
# PUT /api/v1/documents/{doc_id} — Edit & re-index
# ─────────────────────────────────────────────────────────────
@router.put("/{doc_id}")
async def update_document(
    doc_id: str,
    payload: DocumentUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["Admin", "Engineer"]))
):
    """
    Update a document's text (e.g., after manual OCR correction),
    re-classify with AI, and re-index vectors in Qdrant.
    """
    doc = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Update PostgreSQL record
    doc.raw_extracted_text = payload.new_raw_text
    doc.last_updated_by = payload.updated_by
    doc.ai_metadata = ocr_service.classify_text(payload.new_raw_text)
    db.commit()
    db.refresh(doc)

    # Re-index in Qdrant: delete old vectors, insert new ones
    rag_service.delete_document_vectors(doc_id)
    rag_service.index_document(
        doc_id=doc.id,
        raw_text=payload.new_raw_text,
        source_filename=doc.original_file_name,
        ai_metadata=doc.ai_metadata,
    )

    logger.info(f"Document '{doc.original_file_name}' updated by {payload.updated_by}")
    return {
        "status": "success",
        "message": f"Document '{doc.original_file_name}' updated and re-indexed.",
        "doc_id": doc.id,
    }
