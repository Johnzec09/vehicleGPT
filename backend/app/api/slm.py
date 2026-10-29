from fastapi import APIRouter
from app.slm.runtime import local_slm_runtime
from app.slm.config import slm_settings

router = APIRouter(prefix="/slm", tags=["Local SLM / LLM Intelligence"])

@router.get("/status", summary="Get on-device Small Language Model runtime status and hardware budget")
def get_slm_status():
    """
    Returns edge SLM model configuration, quantization level,
    architecture, runtime status, memory consumption, and active AI mode.
    """
    return local_slm_runtime.get_status()

@router.post("/scan", summary="Scan local models directory for GGUF model files")
def scan_models():
    """
    Scans backend/data/models/ for newly placed quantized GGUF weights.
    """
    return local_slm_runtime.refresh_model_status()

@router.post("/toggle", summary="Enable or disable on-device SLM inference")
def toggle_slm(enabled: bool):
    """
    Toggles between active SLM inference and pure deterministic analytics fallback.
    """
    slm_settings.ENABLE_LOCAL_SLM = enabled
    return local_slm_runtime.get_status()
