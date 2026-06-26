import uuid
import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from backend.database.connection import Base

# Helper to support UUID across both PostgreSQL and SQLite
class CommonUUID:
    """Uses PG UUID if Postgres, else falls back to String representation of UUID."""
    pass

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone_number = Column(String(20), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    profile_picture = Column(Text, nullable=True) # stores base64 or URL
    bio = Column(Text, nullable=True)
    country = Column(String(100), nullable=True)
    preferred_market = Column(String(50), default="US") # US, IN, Global, etc.
    investment_experience = Column(String(50), default="Beginner") # Beginner, Intermediate, Advanced
    risk_appetite = Column(String(50), default="Medium") # Low, Medium, High
    investment_duration = Column(String(50), default="Medium") # Short, Medium, Long
    
    # Auth Security Features
    is_verified = Column(Boolean, default=False)
    otp_secret = Column(String(100), nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    watchlist = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")
    strategies = relationship("SavedStrategy", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String(50), index=True, nullable=False)
    added_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="watchlist")


class SavedStrategy(Base):
    __tablename__ = "saved_strategies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    criteria = Column(JSON, nullable=False) # stores strategy settings as json
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="strategies")


class StockDataCache(Base):
    __tablename__ = "stock_data_cache"

    symbol = Column(String(50), primary_key=True)
    date = Column(Date, primary_key=True)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)
    indicators = Column(JSON, nullable=True) # technical indicators like RSI, MACD, BB, SMAs


class PredictionHistory(Base):
    __tablename__ = "prediction_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(50), index=True, nullable=False)
    prediction_date = Column(Date, default=datetime.date.today, nullable=False)
    target_date = Column(Date, nullable=False)
    predicted_min = Column(Float, nullable=False)
    predicted_max = Column(Float, nullable=False)
    buy_probability = Column(Float, nullable=False)
    sell_probability = Column(Float, nullable=False)
    trend_probability = Column(Float, nullable=False) # e.g. Bullish ratio
    confidence_score = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    model_weights = Column(JSON, nullable=True) # weight of each model in ensemble
    explanations = Column(JSON, nullable=True) # SHAP metrics & reasons


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String(50), index=True, nullable=False)
    alert_type = Column(String(50), nullable=False) # e.g. "reversal", "volatility", "news", "volume"
    threshold = Column(Float, nullable=False)
    is_triggered = Column(Boolean, default=False)
    triggered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="alerts")
