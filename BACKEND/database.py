from sqlalchemy import create_engine, Column, String, Text, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import uuid

# 1. The magic SQLite URL. This will create a file named 'drilling.db' in your folder.
DATABASE_URL = "sqlite:///./drilling.db"

# 2. SQLite requires a special flag to work with FastAPI's async threads
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class DocumentRecord(Base):
    __tablename__ = "document_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    original_file_name = Column(String, index=True)
    raw_extracted_text = Column(Text)
    ai_metadata = Column(JSON)  # Swapped from JSONB to standard JSON
    last_updated_by = Column(String, default="System OCR")
    last_updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create the tables in the database automatically
Base.metadata.create_all(bind=engine)