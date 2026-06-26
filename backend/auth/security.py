import os
import logging
import datetime
from jose import jwt, JWTError
import bcrypt
import pyotp

logger = logging.getLogger("quantumstock.auth.security")

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "quantumstock_super_secret_cyberpunk_key_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours for testing convenience

def hash_password(password: str) -> str:
    """Hashes a password using bcrypt."""
    pw_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against its hashed value."""
    try:
        pw_bytes = plain_password.encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception as e:
        logger.error(f"Password verification failed ({e})")
        return False


def create_access_token(data: dict, expires_delta: datetime.timedelta = None) -> str:
    """Creates a JWT access token containing subject data and expiration time."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_access_token(token: str) -> dict | None:
    """Decodes and verifies a JWT access token. Returns decoded data or None."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def generate_otp_secret() -> str:
    """Generates a random 32-character base32 OTP secret."""
    return pyotp.random_base32()

def get_totp_uri(secret: str, email: str) -> str:
    """Generates a standard TOTP URI for QR codes."""
    return pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name="QuantumStock AI")

def verify_otp(secret: str, code: str) -> bool:
    """Verifies a 6-digit OTP code against the base32 secret."""
    try:
        totp = pyotp.TOTP(secret)
        # Verify code with a 1-step sync tolerance (30 seconds before/after)
        return totp.verify(code, valid_window=1)
    except Exception as e:
        logger.error(f"OTP verification error ({e})")
        return False
