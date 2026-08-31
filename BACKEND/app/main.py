import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, Base, get_db
from app.models import UserRecord
from app.schemas import UserCreate, UserResponse, TokenResponse
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    require_role,
    get_current_user,
)

# ── Routers ──────────────────────────────────────────────────
from app.routers import wells, incidents, documents, predictions, alerts, telemetry

# ── Services ─────────────────────────────────────────────────
from app.services.ml_service import ml_service
from app.services.rag_service import rag_service

# ── Logging Setup ────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-20s | %(levelname)-7s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("NWIS.Main")


# ═══════════════════════════════════════════════════════════════
# APPLICATION LIFESPAN (Startup / Shutdown)
# ═══════════════════════════════════════════════════════════════
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs on startup: creates tables, loads ML models, initializes Qdrant.
    Runs on shutdown: cleanup.
    """
    logger.info("=" * 60)
    logger.info("  eRTMAC-NWIS Enterprise Platform — Starting Up")
    logger.info("=" * 60)

    # 1. Create all database tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("PostgreSQL + PostGIS tables initialized.")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")

    # 2. Load ML models
    try:
        ml_service.load_models()
        if ml_service.is_ready:
            logger.info("ML prediction models loaded (LightGBM + SHAP).")
        else:
            logger.warning("ML models not found. Prediction endpoints will return errors.")
    except Exception as e:
        logger.warning(f"ML model loading failed: {e}")

    # 3. Initialize Qdrant vector collection
    try:
        rag_service.ensure_collection()
        logger.info("Qdrant vector store connected.")
    except Exception as e:
        logger.warning(f"Qdrant initialization failed: {e}. RAG features unavailable.")

    logger.info("=" * 60)
    logger.info("  All systems operational. API ready.")
    logger.info("=" * 60)

    yield  # Application is running

    # Shutdown
    logger.info("eRTMAC-NWIS shutting down.")


# ═══════════════════════════════════════════════════════════════
# FASTAPI APPLICATION
# ═══════════════════════════════════════════════════════════════
app = FastAPI(
    title="eRTMAC-NWIS Enterprise API",
    description=(
        "Enhanced Real-Time Monitoring & Analytics Center — "
        "Nearby Wells Intelligence System. "
        "B2B platform for Oil India's drilling operations with "
        "PostGIS geospatial intelligence, AI risk prediction, "
        "SHAP explainability, RAG knowledge base, and proactive alerts."
    ),
    version="2.0.0",
    lifespan=lifespan,
)


# ── CORS Middleware ──────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global Exception Handler ────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Prevents server crashes and logs errors with context."""
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Enterprise Server Error",
            "error_code": "NWIS_500",
            "path": str(request.url.path),
        }
    )


# ═══════════════════════════════════════════════════════════════
# AUTHENTICATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════
@app.post("/api/v1/auth/register", status_code=status.HTTP_201_CREATED, tags=["Authentication"])
async def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    """Register a new B2B user with hashed password."""
    existing = db.query(UserRecord).filter(UserRecord.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Username '{user_data.username}' already exists.")

    new_user = UserRecord(
        username=user_data.username,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"New user registered: {user_data.username} (role={user_data.role})")
    return {
        "message": f"User '{user_data.username}' registered successfully.",
        "user_id": new_user.id,
        "role": new_user.role,
    }


@app.post("/api/v1/auth/token", response_model=TokenResponse, tags=["Authentication"])
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    B2B Login: Authenticate with username/password, receive a JWT token.
    The token must be included in all subsequent API requests.
    """
    user = db.query(UserRecord).filter(UserRecord.username == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username}, role=user.role)

    logger.info(f"User '{user.username}' logged in (role={user.role})")
    return TokenResponse(
        access_token=access_token,
        role=user.role,
        username=user.username,
    )


@app.get("/api/v1/auth/me", tags=["Authentication"])
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return current_user


# ═══════════════════════════════════════════════════════════════
# INCLUDE ALL ROUTERS
# ═══════════════════════════════════════════════════════════════
app.include_router(wells.router)
app.include_router(incidents.router)
app.include_router(documents.router)
app.include_router(predictions.router)
app.include_router(alerts.router)
app.include_router(telemetry.router)


# ═══════════════════════════════════════════════════════════════
# PRODUCTION ENDPOINTS
# ═══════════════════════════════════════════════════════════════
@app.get("/health", tags=["System"])
async def health_check():
    """Kubernetes/Docker health check — no auth required."""
    return {
        "status": "Operational",
        "engine": "FastAPI + PostGIS + Qdrant + LightGBM",
        "version": "2.0.0",
        "ml_ready": ml_service.is_ready,
    }


@app.get("/ready", tags=["System"])
async def readiness_check(db: Session = Depends(get_db)):
    """Deep readiness check — verifies database connectivity."""
    try:
        db.execute("SELECT 1")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "database": db_status,
        "ml_models": "loaded" if ml_service.is_ready else "not_loaded",
        "ready": db_status == "connected" and ml_service.is_ready,
    }


@app.get("/", tags=["System"])
async def root():
    """API root — discovery endpoint."""
    return {
        "platform": "eRTMAC-NWIS Enterprise API",
        "version": "2.0.0",
        "documentation": "/docs",
        "health": "/health",
        "endpoints": {
            "auth": "/api/v1/auth/token",
            "wells": "/api/v1/wells",
            "nearby_wells": "/api/v1/wells/nearby/search",
            "incidents": "/api/v1/incidents",
            "correlate": "/api/v1/knowledge/correlate",
            "search": "/api/v1/knowledge/search",
            "documents": "/api/v1/documents",
            "predict": "/api/v1/predict",
            "proactive_alerts": "/api/v1/alerts/proactive",
            "telemetry": "/ws/telemetry",
        }
    }