import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = BASE_DIR / "data" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

class SLMSettings:
    MODELS_DIRECTORY: Path = MODELS_DIR
    CONFIGURED_MODEL_FILENAME: str = os.getenv("SLM_MODEL_FILENAME", "qwen2.5-0.5b-instruct-q4_k_m.gguf")
    CONFIGURED_MODEL_PATH: Path = MODELS_DIR / CONFIGURED_MODEL_FILENAME
    
    ENABLE_LOCAL_SLM: bool = os.getenv("ENABLE_LOCAL_SLM", "true").lower() in ("true", "1", "yes")
    INFERENCE_TIMEOUT_SECONDS: float = float(os.getenv("SLM_TIMEOUT_SEC", "6.0"))
    MAX_TOKENS: int = int(os.getenv("SLM_MAX_TOKENS", "220"))
    TEMPERATURE: float = float(os.getenv("SLM_TEMPERATURE", "0.15"))
    
    # Target Edge Hardware Constraints (from TELIPORT Case Study 5)
    TARGET_RAM_MB: int = 2048
    TARGET_CPU_CORES: int = 2

slm_settings = SLMSettings()
