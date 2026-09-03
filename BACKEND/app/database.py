from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# 1. Connect to PostgreSQL using the secure URL from your .env file
engine = create_engine(settings.DATABASE_URL)

# 2. Create a secure, isolated session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. The base class that all our future tables will inherit from
Base = declarative_base()

# 4. The Dependency: Safely manages connections for FastAPI
def get_db():
    """Generates safe database sessions per request and ensures they close."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()