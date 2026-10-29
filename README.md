# 🚗 VehicleGPT — On-Device AI Vehicle Intelligence Assistant
### Natural Language Vehicle Information using On-Device SLM/LLM

> **Case Study 5 — Technical Competition**  
> **Team SANJO:** K. John Zechariah & B. Rohan  
> **Tagline:** *"Your Car's Data. In Your Language."*  
> **Live Demo:** [https://fairy-arena-drove-collectibles.trycloudflare.com](https://fairy-arena-drove-collectibles.trycloudflare.com)

---

## 🌟 Executive Overview

**VehicleGPT** is an on-device Software-Defined Vehicle (SDV) intelligence assistant that enables drivers, fleet operators, and service engineers to query complex vehicle telemetry and diagnostic logs using natural language.

Built to run entirely on automotive edge hardware (~2 GB RAM, 2 CPU cores) without relying on cloud APIs, VehicleGPT guarantees **100% data privacy**, **instant sub-millisecond query responses**, and **air-gapped operation**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       VEHICLEGPT EDGE ARCHITECTURE                          │
├───────────────────────────────┬─────────────────────────────────────────────┤
│   Automotive Bus Adapters     │ CAN-FD, SOME/IP, Android VHAL, QNX slog2    │
│   Virtual Vehicle Physics     │ 1-Hz kinematic simulation & thermodynamics  │
│   Persistent Edge Database    │ SQLite 3.45 with WAL journaling (>4,200 pts)│
│   Deterministic Analytics     │ Exact mathematical evidence extraction      │
│   Local SLM & Fallback        │ Pure-Python GGUF Parser + Grounded Engine   │
│   Safety Isolation Barrier    │ 100% Read-Only (Actuation Authority Blocked)│
│   Automotive HMI Dashboard    │ React 18, Vite, TypeScript, Tailwind CSS    │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

---

## 🛡️ Read-Only Safety Guarantee

VehicleGPT adheres to automotive functional safety principles (ISO 26262):
- **Read-Only Telemetry Bus:** The AI engine is architecturally isolated from the vehicle's powertrain, friction braking, drive-by-wire steering, and chassis actuators.
- **Actuation Rejection Guard:** Any command attempting to manipulate physical vehicle state (e.g., *"Apply emergency braking"*, *"Disable brakes"*, *"Turn steering wheel"*) is intercepted and blocked with a `SAFETY_ISOLATION_BARRIER` signal.

---

## 📊 Key Engineering Capabilities

1. **Realistic Electric Vehicle Telemetry Simulator:**
   - Dynamic stop-and-go city driving, high-speed highway cruising, and DC fast charging.
   - Physical models for battery SOC depletion, IR voltage drop, and motor/battery thermodynamics.
   - Fault injection: Battery thermal runaway (`P0A7F`), stator overheating (`P0A3F`), rapid discharge (`P1A01`), ADAS sensor occlusion (`U0415`), and BMS plausibility errors (`P0A80`).

2. **30-Day Historical Data Engine:**
   - Over 4,200 persistent telemetry records spanning September–October 2026.
   - 53 completed driving trips with comprehensive efficiency metrics.
   - Persists reliably across application restarts.

3. **Deterministic Math & Grounded Evidence:**
   - Answers are never hallucinated. Every response is backed by exact timestamps, numerical values, and SQLite table provenance.
   - City vs. Highway comparisons (+73.6% higher consumption at highway speeds).
   - 14-day range degradation analysis (-18.5% drop due to ambient cold soak and cabin climate load).
   - 15-minute chronological pre-incident telemetry traces preceding thermal alarms.

4. **Edge Hardware Compliance (~2 GB RAM Budget):**
   - **Target RAM:** 2048 MB | **Measured:** ~64 MB (Baseline) / ~412 MB (With 0.5B Q4_K_M weights).
   - **Target Latency:** < 2000 ms | **Measured:** **0.44 ms – 1.93 ms** server latency (< 20 ms HTTP round-trip).

---

## 💻 Tech Stack

- **Backend:** Python 3.11, FastAPI, SQLite 3 (WAL mode), Pydantic v1, SQLAlchemy, Psutil.
- **Local Model Subsystem:** Pure-Python GGUF binary v3 parser (`gguf_reader.py`), grounded RAG pipeline, deterministic analytics fallback.
- **Frontend Dashboard:** React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
- **Testing:** Pytest automated test suite (34 passing unit/integration tests).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+

### 2. Backend Setup
```bash
# Clone the repository
git clone https://github.com/Johnzec09/vehicleGPT.git
cd vehicleGPT

# Install backend dependencies
python -m pip install -r backend/requirements.txt

# Start FastAPI server on port 8000
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
*Backend API will be running at `http://127.0.0.1:8000` (Interactive Docs: `http://127.0.0.1:8000/docs`)*

### 3. Frontend Setup
```bash
# Open a second terminal
cd frontend

# Install frontend dependencies
npm install

# Start Vite development server on port 3000
npm run dev
```
*Frontend Dashboard will be accessible at `http://127.0.0.1:3000`*

---

## 🧪 Automated Testing & Verification

Run the test suite:
```bash
# Run all 34 backend unit & integration tests
python -m pytest backend/tests -v

# Run the automated 14-point competition audit suite
python comprehensive_audit.py
```

---

## 📱 Eight Interactive Dashboard Pages

1. **Overview Dashboard:** Real-time EV instrument cluster with speed, SOC, power flow, and system health gauges.
2. **Live Vehicle:** Interactive simulator controls (Start, Pause, Resume, Reset) and live fault injections.
3. **AI Assistant:** Evidence-backed natural language query interface with visual mode badges (`Local SLM` vs `Verified Analytics Engine`).
4. **Analytics & Insights:** Deep comparative graphs (City vs. Highway, SOC depletion trends, thermal curves).
5. **Diagnostics & Events:** Complete DTC logs, fault severity rankings, and pre-incident telemetry viewers.
6. **Historical Data:** Filterable multi-week driving log with condition filters, pagination, and trip summaries.
7. **Data Sources:** Automotive protocol adapters status (CAN-FD, SOME/IP, Android VHAL, QNX slog2) with instant CSV export.
8. **System & Privacy:** Edge hardware resource telemetry, GGUF model inspector, and license verification.

---

## 👥 Team SANJO Details
- **Lead Software Engineer:** K. John Zechariah
- **Edge AI & Systems Engineer:** B. Rohan
- **Competition:** Case Study 5 — Technical Competition (VehicleGPT)
- **License:** MIT License
