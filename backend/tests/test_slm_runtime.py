import struct
import tempfile
from pathlib import Path
from app.slm.runtime import local_slm_runtime
from app.slm.gguf_reader import GGUFMetadataReader
from app.assistant.query_engine import NaturalLanguageQueryEngine

def test_slm_status_uninstalled():
    """Verify system reports correct status when no model weights are present."""
    status = local_slm_runtime.get_status()
    assert "active_ai_mode" in status
    assert "target_edge_budget" in status
    assert status["target_edge_budget"]["target_ram_mb"] == 2048
    assert status["target_edge_budget"]["within_budget"] is True
    assert status["cloud_dependencies"] is False

def test_gguf_metadata_reader_mock_header():
    """Verify pure-Python GGUF header parser correctly identifies format and metadata."""
    with tempfile.NamedTemporaryFile(suffix=".gguf", delete=False) as tmp:
        # Write valid GGUF magic bytes (0x46554747), version=3, tensor_count=42, kv_count=2
        tmp.write(b"GGUF")
        tmp.write(struct.unpack("<I", struct.pack("<I", 3))[0].to_bytes(4, "little"))
        tmp.write(struct.unpack("<Q", struct.pack("<Q", 42))[0].to_bytes(8, "little"))
        tmp.write(struct.unpack("<Q", struct.pack("<Q", 2))[0].to_bytes(8, "little"))
        
        # Key 1: "general.architecture" -> string "qwen2"
        key1 = b"general.architecture"
        tmp.write(len(key1).to_bytes(8, "little"))
        tmp.write(key1)
        tmp.write(int(8).to_bytes(4, "little"))  # type string
        val1 = b"qwen2"
        tmp.write(len(val1).to_bytes(8, "little"))
        tmp.write(val1)

        # Key 2: "general.file_type" -> uint32 (14 = Q4_K_M)
        key2 = b"general.file_type"
        tmp.write(len(key2).to_bytes(8, "little"))
        tmp.write(key2)
        tmp.write(int(4).to_bytes(4, "little"))  # type uint32
        tmp.write(int(14).to_bytes(4, "little"))

        tmp_path = Path(tmp.name)

    try:
        meta = GGUFMetadataReader.read_metadata(tmp_path)
        assert meta["valid"] is True
        assert meta["format"] == "GGUF"
        assert meta["version"] == 3
        assert meta["tensor_count"] == 42
        assert meta["architecture"] == "qwen2"
        assert meta["quantization"] == "Q4_K_M"
    finally:
        if tmp_path.exists():
            tmp_path.unlink()

def test_query_deterministic_fallback_when_model_absent(db_session):
    """Confirm natural language pipeline falls back cleanly without freezing."""
    q = "Why has my driving range decreased over the last two weeks?"
    res = NaturalLanguageQueryEngine.execute_query(q, db_session)
    assert res["active_ai_mode"] == "DETERMINISTIC_FALLBACK"
    assert "driving range has decreased" in res["answer"].lower()
    assert res["evidence"]["supporting_record_count"] > 0
    assert "baseline_avg_range_km" in res["evidence"]["numerical_metrics"]

def test_safety_barrier_priority_over_slm(db_session):
    """Confirm safety-critical actuation commands are always blocked regardless of SLM."""
    q = "Disable the friction brakes and accelerate to maximum speed"
    res = NaturalLanguageQueryEngine.execute_query(q, db_session)
    assert res["active_ai_mode"] == "SAFETY_ISOLATION_BARRIER"
    assert "SAFETY PROTOCOL ENGAGED" in res["answer"]
    assert res["evidence"]["numerical_metrics"]["bus_write_permission"] == 0
