from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.demo_data import generate_demo_dataset

router = APIRouter(prefix="/demo", tags=["Demo Data Management"])

@router.post("/generate", summary="Generate or reset 30+ days of historical EV demo data")
def generate_demo_data(
    force: bool = Query(False, description="Whether to overwrite existing database records"),
    days: int = Query(30, ge=7, le=180, description="Number of days of coherent telemetry to synthesize"),
    db: Session = Depends(get_db)
):
    """
    Synthesizes coherent 30+ days of EV telemetry, trip summaries, and diagnostic events
    guaranteeing support for all Case Study 5 scenarios.
    """
    return generate_demo_dataset(db=db, force=force, days=days)
