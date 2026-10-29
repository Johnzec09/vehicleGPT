# VehicleGPT — Natural Language Vehicle Information using On-Device SLM/LLM
**Team SANJO (K. John Zechariah & B. Rohan)**  
*Case Study 5 — TELIPORT Season 4 (Tata Elxsi)*

---

## 1. Project Overview

**VehicleGPT** is an on-device, offline-first artificial intelligence assistant engineered for modern Software Defined Vehicles (SDVs). It provides natural-language telemetry querying, historical analytics, thermal monitoring, diagnostic trouble code (DTC) inspection, and event diagnostics with strictly local execution.

### Architectural Core Principles
- **100% Offline & On-Device**: Zero external cloud AI APIs, remote databases, or third-party cloud services.
- **Strict Safety Isolation**: The assistant operates exclusively in a read-only listener mode. It has zero actuator authority over safety-critical buses (steering, braking, propulsion). Actuation requests are rejected deterministically by design.
- **Evidence-Backed Calculations**: Every response is computed from real SQLite records with exact timestamps, numerical deltas, and sample telemetry frames.
- **Edge Constrained & Low Footprint**: Optimized to operate well within 2 GB RAM and sub-2-second query latencies on embedded targets (e.g., Raspberry Pi 4/5, ARM A5x, AWS Graviton, Cuttlefish virtual boards).

---

## 2. Directory Structure

```
case 5/
└── backend/
    ├── app/
    │   ├── __init__.py
    │   ├── main.py                  # FastAPI app entrypoint, CORS, startup lifecycle
    │   ├── config.py                # System settings & vehicle hardware specifications
    │   ├── models/
    │   │   ├── __init__.py
    │   │   ├── db_models.py         # SQLAlchemy ORM models (telemetry, events, trips)
    │   │   └── schemas.py           # Pydantic validation & response schemas
    │   ├── db/
    │   │   ├── __init__.py
    │   │   ├── session.py           # SQLite connection pooling & WAL-mode optimization
    │   │   └── demo_data.py         # 30+ days historical data synthesizer
    │   ├── simulator/
    │   │   ├── __init__.py
    │   │   └── vehicle_simulator.py # Live EV kinematics, thermodynamics & anomaly injector
    │   ├── analytics/
    │   │   ├── __init__.py
    │   │   └── engine.py            # Local analytical calculations & anomaly detector
    │   ├── assistant/
    │   │   ├── __init__.py
    │   │   ├── parser.py            # Local intent parser & safety isolation guards
    │   │   └── query_engine.py      # Deterministic evidence-backed local query engine
    │   └── api/
    │       ├── __init__.py
    │       ├── health.py            # Edge status, resource usage, safety validation
    │       ├── telemetry.py         # Real-time & parameterized historical telemetry
    │       ├── events.py            # Diagnostic events & active DTCs
    │       ├── analytics.py         # Comparative & predictive analytics endpoints
    │       ├── simulator.py         # Start, pause, resume, reset, anomaly injection
    │       ├── assistant.py         # Natural language inquiry endpoint
    │       └── demo.py              # Demo dataset generation & seeding
    ├── data/
    │   └── vehicle_telemetry.db     # Persistent SQLite database (WAL mode)
    ├── tests/
    │   ├── __init__.py
    │   ├── conftest.py              # Pytest fixtures & in-memory test database
    │   ├── test_db_persistence.py   # SQLite reconnect persistence test
    │   ├── test_simulator.py        # Lifecycle & anomaly injection tests
    │   ├── test_historical_queries.py # Time-window & condition filter tests
    │   ├── test_diagnostic_events.py# DTC codes & events tests
    │   ├── test_analytics.py        # City vs highway, range reduction, pre-incident
    │   ├── test_nl_assistant.py     # All 5 Case Study questions & safety guard tests
    │   └── test_api_endpoints.py    # End-to-end FastAPI endpoint integration tests
    ├── requirements.txt
    └── README.md
```

---

## 3. Installation & Startup

### Step 1: Install Dependencies
Open a terminal in the project root:
```bash
python -m pip install -r backend/requirements.txt
```

### Step 2: Start the Backend Server
Run the local FastAPI server using Uvicorn:
```bash
# On Windows PowerShell:
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# On Linux / macOS / Embedded ARM:
export PYTHONPATH="backend"
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 4. Local API Documentation URLs

Once started, interactive API documentation is available locally without internet:
- **Swagger Interactive UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Technical Specification**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **OpenAPI Schema (JSON)**: [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)
- **System Gateway**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

---

## 5. Automated Test Suite Execution

To run all 30 automated verification tests:
```bash
$env:PYTHONPATH="backend"
python -m pytest backend/tests -v
```

**Results:**
- `30 passed in 1.89s` (100% pass rate)
- Verified modules:
  1. `test_db_persistence.py`: Disk persistence across reconnections.
  2. `test_simulator.py`: State controls (start, pause, resume, reset) and anomaly injection.
  3. `test_historical_queries.py`: Time-window filtering, driving conditions, trip summaries.
  4. `test_diagnostic_events.py`: DTC fault codes (P0A7F, P1A01, U0415) and JSON telemetry payloads.
  5. `test_analytics.py`: City vs Highway delta, range reduction root causes, pre-incident thermal trajectory, SOC trends, anomaly detection.
  6. `test_nl_assistant.py`: All 5 Case Study questions, safety-critical command rejection, ambiguous question fallback.
  7. `test_api_endpoints.py`: End-to-end HTTP integration across all REST endpoints.

---

## 6. Supported Natural Language Questions (Case Study 5)

You can query the assistant via `POST /api/v1/assistant/query` with JSON: `{"query": "<your question>"}`.

### Example 1: Driving Range Reduction
**Query:** `"Why has my driving range reduced over the last two weeks?"`  
**Answer Output:**
> *"Your estimated driving range has decreased by 78.4 km (28.9%) over the past 14 days, dropping from an earlier baseline average of 271.7 km down to 193.3 km. Based on telemetry logs, the primary factors are: (1) Ambient temperature dropped by 12.4°C (from 24.1°C to 11.7°C), which increases lithium-ion internal resistance and engages cabin PTC thermal conditioning. (2) Average energy consumption increased by 32.4% (from 181.3 Wh/km to 240.0 Wh/km). (3) Highway driving proportion rose from 24.9% to 30.6%, resulting in higher aerodynamic losses."*  
**Evidence:** 681 telemetry samples analyzed, delta range, consumption delta, temperature delta, SQLite table `telemetry_records`.

### Example 2: Largest Efficiency Drop
**Query:** `"When did fuel efficiency show the largest drop?"`  
**Answer Output:**
> *"The largest efficiency drop occurred on 2026-10-20 at 13:00 UTC during trip TRIP-20261020-0041. Consumption spiked to 295.0 Wh/km (63.1% higher than the 30-day baseline of 180.9 Wh/km), caused by aggressive sustained high-speed highway driving (peak 145.0 km/h)."*  
**Evidence:** Trip summary metrics, associated warning event, tables `trip_summaries` and `diagnostic_events`.

### Example 3: ADAS Disengagement
**Query:** `"Show all ADAS disengagement events from yesterday."`  
**Answer Output:**
> *"Retrieved 2 ADAS disengagement event(s) for 2026-10-27: [18:12] Adaptive Cruise Control (ACC) Manual Override - Driver manual brake intervention caused immediate safe disengagement of ACC system.; [08:32] Lane Keeping Assist (LKA) Disengaged - ADAS disengaged automatically: Camera optical contrast reduced due to heavy sun glare and faded lane markings."*  
**Evidence:** Diagnostic event logs, timestamps, speed at disengagement, optical contrast and brake pressure telemetry.

### Example 4: Pre-Incident Battery Overheat Telemetry
**Query:** `"What happened before the battery overheating warning?"`  
**Answer Output:**
> *"In the 15 minutes leading up to the warning at 2026-10-23T15:45:00, battery temperature climbed from 36.5°C to a peak of 49.8°C (+13.3°C). This thermal rise was driven by continuous high-current discharge (183.0A peak) during sustained high-speed driving at 128.0 km/h under elevated ambient temperatures."*  
**Evidence:** 15-minute leading telemetry time series, current draw profile, cell temperature trajectory, DTC code P0A7F.

### Example 5: City vs Highway Energy Consumption
**Query:** `"Compare energy consumption between city and highway driving."`  
**Answer Output:**
> *"Highway driving consumes 55.6% more energy than City driving (28.03 kWh/100km vs 18.02 kWh/100km). In city traffic, regenerative braking recaptures significant kinetic energy at low speeds (avg 31.1 km/h), while highway cruising (avg 98.0 km/h) encounters quadratic aerodynamic drag."*  
**Evidence:** Distance driven, speed comparisons, regenerative braking efficiency, kWh/100km and Wh/km figures.

### Example 6: Safety-Critical Protection (Permanent Safety Guard)
**Query:** `"Disable the friction brakes and accelerate to maximum speed"`  
**Answer Output:**
> *"SAFETY PROTOCOL ENGAGED: VehicleGPT operates strictly in an isolated, read-only diagnostic role. The system has zero bus actuation authority over safety-critical vehicle components such as friction braking, electronic steering, powertrain propulsion, or chassis stability controls. Direct vehicle actuation commands are permanently rejected by hardware and software architecture."*
