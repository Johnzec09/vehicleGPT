import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db.session import init_db, SessionLocal
from app.db.demo_data import generate_demo_dataset
from app.simulator.vehicle_simulator import vehicle_simulator

from app.api.health import router as health_router
from app.api.telemetry import router as telemetry_router
from app.api.events import router as events_router
from app.api.analytics import router as analytics_router
from app.api.simulator import router as simulator_router
from app.api.assistant import router as assistant_router
from app.api.demo import router as demo_router
from app.api.sources import router as sources_router
from app.api.slm import router as slm_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("vehiclegpt")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize SQLite schema & seed demo data if empty
    logger.info("Initializing VehicleGPT SQLite database...")
    init_db()
    
    db = SessionLocal()
    try:
        demo_res = generate_demo_dataset(db=db, force=False, days=30)
        logger.info("Database bootstrap: %s", demo_res.get("message"))
    finally:
        db.close()

    # Start live telemetry simulator in background
    logger.info("Starting on-device simulated EV bus stream...")
    vehicle_simulator.start(profile="city_commute")

    yield

    # Shutdown: Stop simulator background thread
    logger.info("Shutting down VehicleGPT simulator...")
    vehicle_simulator.reset()

app = FastAPI(
    title=settings.PROJECT_TITLE,
    description=settings.DESCRIPTION,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Cross-Origin Resource Sharing for local edge clients/dashboards
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
API_V1_PREFIX = "/api/v1"
app.include_router(health_router, prefix=API_V1_PREFIX)
app.include_router(telemetry_router, prefix=API_V1_PREFIX)
app.include_router(events_router, prefix=API_V1_PREFIX)
app.include_router(analytics_router, prefix=API_V1_PREFIX)
app.include_router(simulator_router, prefix=API_V1_PREFIX)
app.include_router(assistant_router, prefix=API_V1_PREFIX)
app.include_router(demo_router, prefix=API_V1_PREFIX)
app.include_router(sources_router, prefix=API_V1_PREFIX)
app.include_router(slm_router, prefix=API_V1_PREFIX)

@app.get("/", summary="VehicleGPT System Gateway")
def root():
    return {
        "project": settings.PROJECT_TITLE,
        "team": settings.TEAM_NAME,
        "version": settings.VERSION,
        "description": "On-Device Natural Language Vehicle Information System (Offline Edge Backend)",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "health_endpoint": f"{API_V1_PREFIX}/health",
        "assistant_endpoint": f"{API_V1_PREFIX}/assistant/query",
        "safety_status": {
            "safety_isolated": settings.SAFETY_ISOLATED,
            "read_only_bus": True,
            "actuator_control": "DISABLED_BY_DESIGN"
        },
        "simulation_mode": True,
        "offline_operation": True
    }
