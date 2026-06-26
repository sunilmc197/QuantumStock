import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("quantumstock.database")
logging.basicConfig(level=logging.INFO)

DATABASE_URL = os.getenv("DATABASE_URL")
Base = declarative_base()

# Self-healing database connection resolution
if not DATABASE_URL:
    logger.warning("DATABASE_URL env variable not set. Falling back to local SQLite database.")
    # Use SQLite for zero-configuration developer onboarding
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "quantumstock.db")
    DATABASE_URL = f"sqlite:///{db_path}"

# For SQLite, check if it's SQLite and enable check_same_thread=False
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL settings
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency injector for FastAPI routes to manage DB sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes tables based on declarative metadata."""
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
