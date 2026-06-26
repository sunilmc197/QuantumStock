import datetime
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import json

from backend.database.connection import get_db
from backend.database.models import User, Watchlist, SavedStrategy, PredictionHistory, Alert
from backend.auth.security import (
    hash_password, verify_password, create_access_token, verify_access_token,
    generate_otp_secret, verify_otp, get_totp_uri
)
from backend.datasets.collector import fetch_stock_history, get_stock_fundamental_info, fetch_macro_benchmarks
from backend.models.ensemble import EnsemblePredictor
from backend.services.explanations import ExplanationEngine
from backend.services.news import NewsService
from backend.services.portfolio import PortfolioOptimizer
from backend.services.backtesting import BacktestingEngine
from backend.services.chatbot import FinancialChatbot

logger = logging.getLogger("quantumstock.api.routes")
router = APIRouter()

# -----------------
# PYDANTIC SCHEMAS
# -----------------
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone_number: Optional[str] = None
    country: Optional[str] = None
    preferred_market: Optional[str] = "US"
    investment_experience: Optional[str] = "Beginner"
    risk_appetite: Optional[str] = "Medium"
    investment_duration: Optional[str] = "Medium"

class LoginRequest(BaseModel):
    email: str
    password: str
    otp_code: Optional[str] = None

class OTPVerifyRequest(BaseModel):
    email: str
    code: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

class WatchlistRequest(BaseModel):
    symbol: str

class OptimizeRequest(BaseModel):
    budget: float
    risk_appetite: str
    duration: str
    market: Optional[str] = "US"

class BacktestRequest(BaseModel):
    symbol: str
    strategy: str
    initial_capital: float
    start_date: str
    end_date: str

class ChatbotRequest(BaseModel):
    message: str

class AlertCreateRequest(BaseModel):
    symbol: str
    alert_type: str
    threshold: float

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    bio: Optional[str] = None
    country: Optional[str] = None
    preferred_market: Optional[str] = None
    investment_experience: Optional[str] = None
    risk_appetite: Optional[str] = None
    investment_duration: Optional[str] = None

class PrivacyUpdateRequest(BaseModel):
    preferred_market: str
    risk_appetite: str

# -----------------
# AUTH DEPENDENCY
# -----------------
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    """Extracts and verifies JWT bearer token from requests."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token is missing or malformed"
        )
    token = authorization.split(" ")[1]
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please login again."
        )
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )
    return user


def get_current_user_optional(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> Optional[User]:
    """Optionally extracts and verifies JWT bearer token if present, returning None if not."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.split(" ")[1]
        payload = verify_access_token(token)
        if not payload:
            return None
        email = payload.get("sub")
        return db.query(User).filter(User.email == email).first()
    except Exception:
        return None


# -----------------
# AUTH ENDPOINTS
# -----------------
@router.post("/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Check if user exists
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
        
    otp_secret = generate_otp_secret()
    # Create User
    new_user = User(
        name=req.name,
        email=req.email,
        hashed_password=hash_password(req.password),
        phone_number=req.phone_number,
        country=req.country,
        preferred_market=req.preferred_market,
        investment_experience=req.investment_experience,
        risk_appetite=req.risk_appetite,
        investment_duration=req.investment_duration,
        otp_secret=otp_secret,
        is_verified=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate verification token or QR code placeholder
    totp_uri = get_totp_uri(otp_secret, req.email)
    
    # In a production environment, you would mail this code. For resume demo:
    # We display the 6-digit code or mock OTP so developer can copy it immediately.
    import pyotp
    mock_otp = pyotp.TOTP(otp_secret).now()
    
    return {
        "message": "Registration successful. Please verify email using MFA OTP.",
        "email": req.email,
        "totp_uri": totp_uri,
        "demo_verification_otp": mock_otp # Provided for easy testing of OTP flow
    }

@router.post("/auth/verify-email")
def verify_email(req: OTPVerifyRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found.")
        
    if verify_otp(user.otp_secret, req.code):
        user.is_verified = True
        db.commit()
        return {"message": "Email verified successfully. You can now login."}
    else:
        raise HTTPException(status_code=400, detail="Invalid verification code.")

@router.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered.")

    # Check Lockout status
    if user.locked_until and user.locked_until > datetime.datetime.utcnow():
        time_left = int((user.locked_until - datetime.datetime.utcnow()).total_seconds() / 60)
        raise HTTPException(
            status_code=423,
            detail=f"Account is locked due to multiple failed login attempts. Try again in {time_left} minutes."
        )

    # Verify Password
    if not verify_password(req.password, user.hashed_password):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
            user.failed_login_attempts = 0 # reset attempts for next check after lock expiry
            db.commit()
            raise HTTPException(
                status_code=423,
                detail="Too many failed attempts. Account locked for 15 minutes."
            )
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect password credentials.")

    # Verify OTP if email is verified (MFA)
    if user.is_verified:
        if not req.otp_code:
            return {
                "mfa_required": True,
                "email": user.email,
                "message": "Enter your 2FA Google Authenticator code to continue."
            }
        if not verify_otp(user.otp_secret, req.otp_code):
            raise HTTPException(status_code=400, detail="Invalid authenticator code.")

    # Reset attempts on successful authentication
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    # Create Token
    token = create_access_token({"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "name": user.name,
            "email": user.email,
            "preferred_market": user.preferred_market,
            "risk_appetite": user.risk_appetite,
            "is_verified": user.is_verified
        }
    }

@router.post("/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered.")
    
    # Generate OTP for resetting
    import pyotp
    mock_otp = pyotp.TOTP(user.otp_secret).now()
    
    return {
        "message": "Password reset OTP sent to registered email.",
        "email": req.email,
        "demo_reset_otp": mock_otp # for demo verification without mailing setup
    }

@router.post("/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered.")

    if verify_otp(user.otp_secret, req.code):
        user.hashed_password = hash_password(req.new_password)
        db.commit()
        return {"message": "Password has been reset successfully."}
    else:
        raise HTTPException(status_code=400, detail="Invalid verification code.")

@router.get("/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return {
        "name": user.name,
        "email": user.email,
        "phone_number": user.phone_number,
        "bio": user.bio,
        "country": user.country,
        "preferred_market": user.preferred_market,
        "investment_experience": user.investment_experience,
        "risk_appetite": user.risk_appetite,
        "investment_duration": user.investment_duration,
        "is_verified": user.is_verified,
        "profile_picture": user.profile_picture
    }

@router.put("/auth/profile")
def update_profile(req: ProfileUpdateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for field, val in req.dict(exclude_unset=True).items():
        setattr(user, field, val)
    db.commit()
    db.refresh(user)
    return {"message": "Profile updated successfully.", "user": {
        "name": user.name,
        "bio": user.bio,
        "phone_number": user.phone_number,
        "risk_appetite": user.risk_appetite,
        "preferred_market": user.preferred_market
    }}

@router.put("/auth/privacy")
def update_privacy(req: PrivacyUpdateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.preferred_market = req.preferred_market
    user.risk_appetite = req.risk_appetite
    db.commit()
    return {"message": "Privacy settings updated successfully."}


# -----------------
# MARKET DASHBOARD ENDPOINTS
# -----------------
@router.get("/stocks/search")
def search_stocks(query: str):
    """Simple database/yfinance autocomplete list matching."""
    # Common active symbols
    symbols_list = [
        {"symbol": "AAPL", "name": "Apple Inc"},
        {"symbol": "TSLA", "name": "Tesla Inc"},
        {"symbol": "MSFT", "name": "Microsoft Corp"},
        {"symbol": "NVDA", "name": "NVIDIA Corp"},
        {"symbol": "GOOGL", "name": "Alphabet Inc"},
        {"symbol": "AMZN", "name": "Amazon.com Inc"},
        {"symbol": "RELIANCE.NS", "name": "Reliance Industries Ltd"},
        {"symbol": "TCS.NS", "name": "Tata Consultancy Services Ltd"},
        {"symbol": "INFY.NS", "name": "Infosys Ltd"},
        {"symbol": "HDFCBANK.NS", "name": "HDFC Bank Ltd"}
    ]
    query_upper = query.upper()
    matches = [s for s in symbols_list if query_upper in s["symbol"] or query_upper in s["name"].upper()]
    # If no local lists match, allow generic ticker search format
    if not matches and len(query) >= 2:
        matches = [{"symbol": query_upper, "name": f"{query_upper} Stock"}]
    return matches

@router.get("/stocks/details")
def get_stock_details(symbol: str):
    """
    Core engine call. Downloads stock history, fundamentals,
    sentiment, ML ensemble outputs, and SHAP indicators.
    """
    try:
        # 1. Download Stock History
        df = fetch_stock_history(symbol, period_years=5)
        fundamentals = get_stock_fundamental_info(symbol)
        
        # 2. Fit Multi-Model Ensemble Predictor
        predictor = EnsemblePredictor(symbol)
        predictor.fit_and_evaluate(df)
        predictions_info = predictor.forecast_horizons(df)
        
        # 3. Generate SHAP/Indicators Explanations
        explainer = ExplanationEngine(predictor)
        explanations_info = explainer.generate_explanations(df, predictions_info)
        
        # 4. Fetch News Sentiment
        news_info = NewsService.get_news_sentiment(symbol)
        
        # Build candlestick series for chart (last 90 trading days)
        df_chart = df.tail(90).reset_index()
        chart_data = []
        for i, row in df_chart.iterrows():
            chart_data.append({
                "date": str(row["Date"].date() if hasattr(row["Date"], "date") else row["Date"]),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": float(row["Volume"]),
                "rsi": float(row["RSI"]),
                "macd_hist": float(row["MACD_Hist"]),
                "bb_upper": float(row["BB_Upper"]),
                "bb_lower": float(row["BB_Lower"]),
                "sma_20": float(row["SMA_20"])
            })

        return {
            "symbol": symbol,
            "fundamentals": fundamentals,
            "predictions": predictions_info["predictions"],
            "model_weights": predictions_info["weights"],
            "explanations": explanations_info,
            "news": news_info,
            "chart_data": chart_data
        }
        
    except Exception as e:
        logger.error(f"Error fetching details for stock {symbol} ({e})")
        raise HTTPException(status_code=400, detail=f"Failed to process ticker {symbol}: {str(e)}")

@router.get("/stocks/macro-dashboard")
def get_macro_dashboard():
    """Returns economic backdrop statistics for dashboard widgets."""
    return fetch_macro_benchmarks()

# Watchlist endpoints
@router.get("/watchlist")
def get_watchlist(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Watchlist).filter(Watchlist.user_id == user.id).all()
    return [{"id": i.id, "symbol": i.symbol} for i in items]

@router.post("/watchlist/add")
def add_watchlist(req: WatchlistRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(Watchlist).filter(Watchlist.user_id == user.id, Watchlist.symbol == req.symbol).first()
    if existing:
        return {"message": "Symbol already in watchlist"}
    item = Watchlist(user_id=user.id, symbol=req.symbol)
    db.add(item)
    db.commit()
    return {"message": f"{req.symbol} added to watchlist"}

@router.delete("/watchlist/remove/{symbol}")
def remove_watchlist(symbol: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(Watchlist).filter(Watchlist.user_id == user.id, Watchlist.symbol == symbol).first()
    if not item:
        raise HTTPException(status_code=404, detail="Ticker not found in watchlist.")
    db.delete(item)
    db.commit()
    return {"message": f"{symbol} removed from watchlist"}


# -----------------
# PORTFOLIO OPTIMIZER ENDPOINTS
# -----------------
@router.post("/portfolio/optimize")
def optimize_portfolio(req: OptimizeRequest):
    try:
        result = PortfolioOptimizer.optimize(
            budget=req.budget,
            risk_appetite=req.risk_appetite,
            duration=req.duration,
            market=req.market
        )
        return result
    except Exception as e:
        logger.error(f"Portfolio optimize endpoint failed ({e})")
        raise HTTPException(status_code=400, detail=str(e))


# -----------------
# BACKTESTING ENDPOINTS
# -----------------
@router.post("/backtest/run")
def run_backtest(req: BacktestRequest):
    try:
        result = BacktestingEngine.run_backtest(
            symbol=req.symbol,
            strategy=req.strategy,
            initial_capital=req.initial_capital,
            start_date=req.start_date,
            end_date=req.end_date
        )
        return result
    except Exception as e:
        logger.error(f"Backtest run failed ({e})")
        raise HTTPException(status_code=400, detail=str(e))


# -----------------
# CHATBOT ENDPOINTS
# -----------------
@router.post("/chatbot/message")
def chatbot_message(req: ChatbotRequest, user: Optional[User] = Depends(get_current_user_optional)):
    try:
        market = user.preferred_market if user else "US"
        response = FinancialChatbot.generate_response(req.message, preferred_market=market)
        return response
    except Exception as e:
        logger.error(f"Chatbot query failed ({e})")
        raise HTTPException(status_code=400, detail="Chatbot encountered an error processing your query.")


# -----------------
# ALERTS SYSTEM ENDPOINTS
# -----------------
@router.get("/alerts")
def get_alerts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    alerts = db.query(Alert).filter(Alert.user_id == user.id).all()
    return [
        {
            "id": a.id,
            "symbol": a.symbol,
            "alert_type": a.alert_type,
            "threshold": a.threshold,
            "is_triggered": a.is_triggered,
            "triggered_at": a.triggered_at
        } for a in alerts
    ]

@router.post("/alerts/create")
def create_alert(req: AlertCreateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_alert = Alert(
        user_id=user.id,
        symbol=req.symbol.upper(),
        alert_type=req.alert_type,
        threshold=req.threshold
    )
    db.add(new_alert)
    db.commit()
    return {"message": f"Alert set for {req.symbol.upper()} triggers on {req.alert_type}."}

@router.delete("/alerts/remove/{alert_id}")
def delete_alert(alert_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.user_id == user.id, Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted successfully."}
