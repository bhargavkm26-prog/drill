import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://admin:nwis_password@localhost:5432/drilling_data"
    )

    # ── Vector Database ───────────────────────────────────────
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_COLLECTION: str = os.getenv("QDRANT_COLLECTION", "oil_india_ddr")

    # ── Authentication ────────────────────────────────────────
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkeysih2026oilindia")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # ── CORS ──────────────────────────────────────────────────
    CORS_ORIGINS: list = os.getenv(
        "CORS_ORIGINS", "http://localhost:8501,http://localhost:3000"
    ).split(",")

    # ── ML Models ─────────────────────────────────────────────
    MODEL_DIR: str = os.getenv("MODEL_DIR", "models")

    # ── File Uploads ──────────────────────────────────────────
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "temp_uploads")

    # ── Optional: Gemini / LLM API Key ────────────────────────
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")


settings = Settings()