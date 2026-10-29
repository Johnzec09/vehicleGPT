import os
import struct
from pathlib import Path
from typing import Dict, Any, Optional

GGUF_MAGIC = b"GGUF"

QUANT_TYPES = {
    0: "F32",
    1: "F16",
    2: "Q4_0",
    3: "Q4_1",
    6: "Q5_0",
    7: "Q8_0",
    8: "Q8_1",
    9: "Q2_K",
    10: "Q3_K_S",
    11: "Q3_K_M",
    12: "Q3_K_L",
    13: "Q4_K_S",
    14: "Q4_K_M",
    15: "Q5_K_S",
    16: "Q5_K_M",
    17: "Q6_K",
}

GGUF_VALUE_TYPES = {
    0: "UINT8",
    1: "INT8",
    2: "UINT16",
    3: "INT16",
    4: "UINT32",
    5: "INT32",
    6: "FLOAT32",
    7: "BOOL",
    8: "STRING",
    9: "ARRAY",
    10: "UINT64",
    11: "INT64",
    12: "FLOAT64",
}

class GGUFMetadataReader:
    """
    Pure Python parser for GGUF binary metadata headers.
    Enables zero-dependency inspection of quantized edge model files.
    """

    @classmethod
    def read_metadata(cls, file_path: Path) -> Dict[str, Any]:
        if not file_path.exists() or not file_path.is_file():
            return {"valid": False, "error": f"File '{file_path.name}' does not exist"}

        size_bytes = os.path.getsize(file_path)
        size_mb = round(size_bytes / (1024 * 1024), 2)

        try:
            with open(file_path, "rb") as f:
                magic = f.read(4)
                if magic != GGUF_MAGIC:
                    return {
                        "valid": False,
                        "filename": file_path.name,
                        "size_mb": size_mb,
                        "error": f"Invalid GGUF header magic: {magic!r}"
                    }

                version = struct.unpack("<I", f.read(4))[0]
                tensor_count = struct.unpack("<Q", f.read(8))[0]
                metadata_kv_count = struct.unpack("<Q", f.read(8))[0]

                metadata: Dict[str, Any] = {
                    "valid": True,
                    "filename": file_path.name,
                    "file_path": str(file_path),
                    "size_mb": size_mb,
                    "format": "GGUF",
                    "version": version,
                    "tensor_count": tensor_count,
                    "metadata_kv_count": metadata_kv_count,
                }

                # Parse up to first 80 key-value pairs
                for _ in range(min(80, metadata_kv_count)):
                    key = cls._read_string(f)
                    if key is None:
                        break
                    vtype = struct.unpack("<I", f.read(4))[0]
                    val = cls._read_value(f, vtype)
                    metadata[key] = val

                # Standardize common fields
                arch = metadata.get("general.architecture", "unknown")
                metadata["architecture"] = arch
                metadata["model_name"] = metadata.get("general.name", file_path.stem)
                
                ftype = metadata.get("general.file_type")
                if ftype is not None and isinstance(ftype, int):
                    metadata["quantization"] = QUANT_TYPES.get(ftype, f"Type_{ftype}")
                else:
                    # Inferred from filename if not explicit in header
                    q_lower = file_path.name.upper()
                    for qname in ("Q4_K_M", "Q4_0", "Q8_0", "Q5_K_M", "Q6_K", "F16"):
                        if qname in q_lower:
                            metadata["quantization"] = qname
                            break
                    metadata.setdefault("quantization", "Quantized (GGUF)")

                ctx = metadata.get(f"{arch}.context_length") or metadata.get("llama.context_length") or metadata.get("qwen2.context_length")
                metadata["context_length"] = ctx or 2048

                return metadata
        except Exception as e:
            return {
                "valid": False,
                "filename": file_path.name,
                "size_mb": size_mb,
                "error": f"Failed reading GGUF header: {str(e)}"
            }

    @classmethod
    def _read_string(cls, f) -> Optional[str]:
        len_bytes = f.read(8)
        if len(len_bytes) < 8:
            return None
        length = struct.unpack("<Q", len_bytes)[0]
        if length > 10000:
            return None
        return f.read(length).decode("utf-8", errors="replace")

    @classmethod
    def _read_value(cls, f, vtype: int) -> Any:
        # GGUF type mapping
        if vtype == 0:  # uint8
            return struct.unpack("<B", f.read(1))[0]
        elif vtype == 1:  # int8
            return struct.unpack("<b", f.read(1))[0]
        elif vtype == 2:  # uint16
            return struct.unpack("<H", f.read(2))[0]
        elif vtype == 3:  # int16
            return struct.unpack("<h", f.read(2))[0]
        elif vtype == 4:  # uint32
            return struct.unpack("<I", f.read(4))[0]
        elif vtype == 5:  # int32
            return struct.unpack("<i", f.read(4))[0]
        elif vtype == 6:  # float32
            return struct.unpack("<f", f.read(4))[0]
        elif vtype == 7:  # bool
            return struct.unpack("<?", f.read(1))[0]
        elif vtype == 8:  # string
            return cls._read_string(f)
        elif vtype == 9:  # array
            elem_type = struct.unpack("<I", f.read(4))[0]
            arr_len = struct.unpack("<Q", f.read(8))[0]
            # Skip large arrays to avoid memory bloat
            if arr_len > 20:
                cls._skip_array(f, elem_type, arr_len)
                return f"[Array of {arr_len} items]"
            return [cls._read_value(f, elem_type) for _ in range(arr_len)]
        elif vtype == 10:  # uint64
            return struct.unpack("<Q", f.read(8))[0]
        elif vtype == 11:  # int64
            return struct.unpack("<q", f.read(8))[0]
        elif vtype == 12:  # float64
            return struct.unpack("<d", f.read(8))[0]
        return None

    @classmethod
    def _skip_array(cls, f, elem_type: int, count: int):
        sizes = {0: 1, 1: 1, 2: 2, 3: 2, 4: 4, 5: 4, 6: 4, 7: 1, 10: 8, 11: 8, 12: 8}
        if elem_type in sizes:
            f.seek(sizes[elem_type] * count, os.SEEK_CUR)
        elif elem_type == 8:  # strings
            for _ in range(count):
                slen = struct.unpack("<Q", f.read(8))[0]
                f.seek(slen, os.SEEK_CUR)
