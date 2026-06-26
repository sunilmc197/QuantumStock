import uvicorn
import logging
import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database.connection import init_db
from backend.api.routes import router as api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("quantumstock.main")

app = FastAPI(
    title="QuantumStock AI API",
    description="Futuristic ML-powered stock trend analysis, portfolio optimizer, chatbot, and explanation backend.",
    version="1.0.0"
)

# Enable CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    logger.info("Starting up QuantumStock AI API...")
    init_db()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "QuantumStock AI Backend Engine",
        "api_docs": "/docs",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

# Register primary API router
app.include_router(api_router, prefix="/api")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
