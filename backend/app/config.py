from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
SQLITE_DB_PATH = DATA_DIR / "vehicle_telemetry.db"

class Settings(BaseModel):
    PROJECT_NAME: str = "VehicleGPT"
    PROJECT_TITLE: str = "VehicleGPT — Natural Language Vehicle Information using On-Device SLM/LLM"
    TEAM_NAME: str = "Team SANJO (K. John Zechariah & B. Rohan)"
    VERSION: str = "1.0.0-edge"
    DESCRIPTION: str = (
        "An on-device, offline-capable vehicle intelligence backend for Software Defined Vehicles (SDVs). "
        "Provides simulated EV telemetry, 30+ days historical diagnostics, analytical engine, "
        "and a deterministic local evidence-backed natural language query engine. "
        "Strictly read-only and isolated from vehicle safety-critical controls."
    )
    DATABASE_URL: str = f"sqlite:///{SQLITE_DB_PATH.as_posix()}"
    DB_FILE_PATH: str = str(SQLITE_DB_PATH)
    
    # EV Vehicle Specifications
    VEHICLE_ID: str = "SANJO-EV-01"
    VEHICLE_MODEL: str = "Sanjo CyberCoupe EV (SDV Platform v2.4)"
    BATTERY_CAPACITY_KWH: float = 65.0
    NOMINAL_VOLTAGE_V: float = 385.0
    MAX_DESIGN_RANGE_KM: float = 430.0
    SIMULATION_LABEL: str = "SIMULATED_DATA"
    SAFETY_ISOLATED: bool = True
    ALLOW_ACTUATION_CONTROL: bool = False  # Strict safety requirement: No actuator access
    
    # Simulator Settings
    DEFAULT_TICK_SECONDS: float = 1.0

settings = Settings()
