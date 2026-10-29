from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.analytics.engine import AnalyticsEngine
from app.models.schemas import CityHighwayComparisonResponse, SOCTrendResponse, RangeDegradationResponse, AnomalyReportResponse

router = APIRouter(prefix="/analytics", tags=["Vehicle Analytics"])

@router.get("/city-vs-highway", response_model=CityHighwayComparisonResponse, summary="Compare City vs Highway driving")
def get_city_highway_comparison(days: int = Query(30, ge=1, le=180), db: Session = Depends(get_db)):
    """
    Computes comparative statistics between low-speed stop-and-go city driving
    and high-speed highway cruising.
    """
    return AnalyticsEngine.get_city_vs_highway_comparison(db, days=days)

@router.get("/range-reduction", response_model=RangeDegradationResponse, summary="Analyze driving range reduction")
def get_range_reduction(window_days: int = Query(14, ge=3, le=60), db: Session = Depends(get_db)):
    """
    Explains reasons for reduced driving range over recent weeks (temperature, HVAC, speed, mode).
    """
    return AnalyticsEngine.get_range_reduction_analysis(db, window_days=window_days)

@router.get("/efficiency-drop", summary="Find the largest efficiency drop")
def get_largest_efficiency_drop(days: int = Query(30, ge=1, le=180), db: Session = Depends(get_db)):
    """
    Identifies the exact trip and timestamp where energy consumption spiked highest.
    """
    return AnalyticsEngine.get_largest_efficiency_drop(db, days=days)

@router.get("/pre-incident", summary="Retrieve pre-incident telemetry before battery overheat")
def get_pre_incident(window_minutes: int = Query(15, ge=1, le=60), db: Session = Depends(get_db)):
    """
    Retrieves the chronological telemetry window immediately preceding a battery overheating warning.
    """
    return AnalyticsEngine.get_pre_incident_telemetry(db, event_type="BATTERY_OVERHEAT", window_minutes=window_minutes)

@router.get("/soc-trends", response_model=SOCTrendResponse, summary="Get battery SOC trends")
def get_soc_trends(days: int = Query(30, ge=1, le=180), db: Session = Depends(get_db)):
    return AnalyticsEngine.get_soc_trends(db, days=days)

@router.get("/anomalies", response_model=AnomalyReportResponse, summary="Detect thermal and efficiency anomalies")
def get_anomalies(days: int = Query(30, ge=1, le=180), db: Session = Depends(get_db)):
    return AnalyticsEngine.detect_anomalies(db, days=days)
