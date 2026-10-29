from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.schemas import NLQueryRequest, NLQueryResponse
from app.assistant.query_engine import NaturalLanguageQueryEngine

router = APIRouter(prefix="/assistant", tags=["Natural Language Assistant (VehicleGPT)"])

@router.post("/query", response_model=NLQueryResponse, summary="Submit a natural language question about vehicle logs")
def answer_vehicle_query(req: NLQueryRequest, db: Session = Depends(get_db)):
    """
    Submits a natural language query to the deterministic on-edge query engine.
    Retrieves actual data from SQLite, computes mathematical results,
    and returns an evidence-backed answer with timestamps and supporting records.
    """
    result = NaturalLanguageQueryEngine.execute_query(req.query, db)
    return result
