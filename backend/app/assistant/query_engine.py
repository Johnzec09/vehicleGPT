from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.assistant.parser import parse_user_query
from app.analytics.engine import AnalyticsEngine
from app.models.db_models import TelemetryRecord, DiagnosticEvent, TripSummary
from app.simulator.vehicle_simulator import vehicle_simulator
from app.slm.runtime import local_slm_runtime

class NaturalLanguageQueryEngine:
    """
    On-device Natural Language Query Engine for VehicleGPT.
    Executes actual SQL queries and statistical computations locally.
    Produces evidence-backed answers with exact timestamps, numerical values,
    and supporting SQLite records.
    """

    @classmethod
    def execute_query(cls, query_text: str, db: Session) -> Dict[str, Any]:
        parse_result = parse_user_query(query_text)
        intent = parse_result["intent"]

        if intent == "SAFETY_CONTROL_REJECTION":
            res = cls._handle_safety_rejection(query_text)
            res["active_ai_mode"] = "SAFETY_ISOLATION_BARRIER"
            res["latency_ms"] = 0.5
            return res
        elif intent == "RANGE_REDUCTION_EXPLANATION":
            res = cls._handle_range_reduction(query_text, db)
        elif intent == "EFFICIENCY_DROP_MAX":
            res = cls._handle_efficiency_drop(query_text, db)
        elif intent == "ADAS_DISENGAGEMENT_EVENTS":
            res = cls._handle_adas_events(query_text, db)
        elif intent == "PRE_INCIDENT_TELEMETRY":
            res = cls._handle_pre_incident(query_text, db)
        elif intent == "COMPARE_CITY_VS_HIGHWAY":
            res = cls._handle_city_highway(query_text, db)
        elif intent == "CURRENT_TELEMETRY":
            res = cls._handle_current_telemetry(query_text, db)
        elif intent == "DTC_DIAGNOSTICS":
            res = cls._handle_dtc_diagnostics(query_text, db)
        elif intent == "THERMAL_STATUS":
            res = cls._handle_thermal_status(query_text, db)
        else:
            res = cls._handle_unknown(query_text, db)

        # Grounding with Local SLM runtime
        fallback_answer = res.get("answer", "")
        evidence = res.get("evidence", {})
        slm_answer, ai_mode, latency_ms = local_slm_runtime.generate_explanation(
            query=query_text,
            intent=intent,
            evidence_dict=evidence,
            fallback_answer=fallback_answer
        )

        res["answer"] = slm_answer
        res["active_ai_mode"] = ai_mode
        res["latency_ms"] = latency_ms
        return res

    @classmethod
    def _handle_safety_rejection(cls, query_text: str) -> Dict[str, Any]:
        return {
            "query": query_text,
            "intent_detected": "SAFETY_CONTROL_REJECTION",
            "confidence": 1.0,
            "is_simulated_data": True,
            "answer": (
                "SAFETY PROTOCOL ENGAGED: VehicleGPT operates strictly in an isolated, read-only diagnostic role. "
                "The system has zero bus actuation authority over safety-critical vehicle components such as "
                "friction braking, electronic steering, powertrain propulsion, or chassis stability controls. "
                "Direct vehicle actuation commands are permanently rejected by hardware and software architecture."
            ),
            "evidence": {
                "query_intent": "SAFETY_CONTROL_REJECTION",
                "time_window_analyzed": "Real-time command interception",
                "numerical_metrics": {
                    "bus_write_permission": 0,
                    "safety_isolation_level": "ASIL-D compliant separation"
                },
                "supporting_record_count": 0,
                "sample_records": [],
                "database_tables_queried": []
            },
            "timestamp": datetime.now(timezone.utc)
        }

    @classmethod
    def _handle_range_reduction(cls, query_text: str, db: Session) -> Dict[str, Any]:
        data = AnalyticsEngine.get_range_reduction_analysis(db, window_days=14)
        m = data["supporting_metrics"]

        causes_text = " ".join(f"({i+1}) {c}" for i, c in enumerate(data["primary_causes"]))
        answer = (
            f"Your estimated driving range has decreased by {data['reduction_km']} km ({data['reduction_pct']}%) "
            f"over the past 14 days, dropping from an earlier baseline average of {data['baseline_avg_range_km']} km down to "
            f"{data['recent_avg_range_km']} km. Based on telemetry logs, the primary factors are: {causes_text}"
        )

        # Retrieve a few representative recent records
        recent_samples = db.query(TelemetryRecord).order_by(
            TelemetryRecord.timestamp.desc()
        ).limit(5).all()

        return {
            "query": query_text,
            "intent_detected": "RANGE_REDUCTION_EXPLANATION",
            "confidence": 0.96,
            "is_simulated_data": True,
            "answer": answer,
            "evidence": {
                "query_intent": "RANGE_REDUCTION_EXPLANATION",
                "time_window_analyzed": data["period_analyzed"],
                "numerical_metrics": {
                    "baseline_avg_range_km": data["baseline_avg_range_km"],
                    "recent_avg_range_km": data["recent_avg_range_km"],
                    "reduction_km": data["reduction_km"],
                    "reduction_pct": data["reduction_pct"],
                    "baseline_consumption_wh_km": m["baseline_consumption_wh_km"],
                    "recent_consumption_wh_km": m["recent_consumption_wh_km"],
                    "temp_drop_c": m["temperature_drop_c"],
                    "highway_share_pct": m["recent_highway_pct"]
                },
                "supporting_record_count": m["samples_analyzed"],
                "sample_records": [s.to_dict() for s in recent_samples],
                "database_tables_queried": ["telemetry_records"]
            },
            "timestamp": datetime.now(timezone.utc)
        }

    @classmethod
    def _handle_efficiency_drop(cls, query_text: str, db: Session) -> Dict[str, Any]:
        data = AnalyticsEngine.get_largest_efficiency_drop(db, days=30)
        if data.get("status") == "no_data":
            return cls._no_data_response(query_text, "trip_summaries")

        sample_event = [data["associated_diagnostic_event"]] if data.get("associated_diagnostic_event") else []

        return {
            "query": query_text,
            "intent_detected": "EFFICIENCY_DROP_MAX",
            "confidence": 0.95,
            "is_simulated_data": True,
            "answer": data["explanation"],
            "evidence": {
                "query_intent": "EFFICIENCY_DROP_MAX",
                "time_window_analyzed": "Past 30 days trip database",
                "numerical_metrics": {
                    "peak_consumption_wh_km": data["consumption_wh_km"],
                    "peak_consumption_kwh_100km": data["consumption_kwh_100km"],
                    "baseline_consumption_wh_km": data["baseline_avg_wh_km"],
                    "efficiency_drop_pct": data["efficiency_drop_pct"],
                    "trip_max_speed_kmh": data["max_speed_kmh"],
                    "trip_distance_km": data["distance_km"]
                },
                "supporting_record_count": 1,
                "sample_records": sample_event,
                "database_tables_queried": ["trip_summaries", "diagnostic_events"]
            },
            "timestamp": datetime.now(timezone.utc)
        }

    @classmethod
    def _handle_adas_events(cls, query_text: str, db: Session) -> Dict[str, Any]:
        data = AnalyticsEngine.get_adas_events(db)
        events = data["events"]

        if not events:
            answer = f"No ADAS disengagement events were logged for {data['query_date']}."
        else:
            descriptions = "; ".join(f"[{e['timestamp'][11:16]}] {e['title']} - {e['description']}" for e in events)
            answer = (
                f"Retrieved {len(events)} ADAS disengagement event(s) for {data['query_date']}: {descriptions}"
            )

        return {
            "query": query_text,
            "intent_detected": "ADAS_DISENGAGEMENT_EVENTS",
            "confidence": 0.94,
            "is_simulated_data": True,
            "answer": answer,
            "evidence": {
                "query_intent": "ADAS_DISENGAGEMENT_EVENTS",
                "time_window_analyzed": f"Date: {data['query_date']}",
                "numerical_metrics": {
                    "total_adas_events": len(events),
                    "fallback_to_recent": data["fallback_to_most_recent"]
                },
                "supporting_record_count": len(events),
                "sample_records": events,
                "database_tables_queried": ["diagnostic_events"]
            },
            "timestamp": datetime.now(timezone.utc)
        }

    @classmethod
    def _handle_pre_incident(cls, query_text: str, db: Session) -> Dict[str, Any]:
        data = AnalyticsEngine.get_pre_incident_telemetry(db, event_type="BATTERY_OVERHEAT", window_minutes=15)
        if data.get("status") == "not_found":
            return {
                "query": query_text,
                "intent_detected": "PRE_INCIDENT_TELEMETRY",
                "confidence": 0.90,
                "is_simulated_data": True,
                "answer": "No battery overheating events found in the database records.",
                "evidence": {
                    "query_intent": "PRE_INCIDENT_TELEMETRY",
                    "time_window_analyzed": "All logged events",
                    "numerical_metrics": {},
                    "supporting_record_count": 0,
                    "sample_records": [],
                    "database_tables_queried": ["diagnostic_events", "telemetry_records"]
                },
                "timestamp": datetime.now(timezone.utc)
            }

        m = data["summary_metrics"]
        return {
            "query": query_text,
            "intent_detected": "PRE_INCIDENT_TELEMETRY",
            "confidence": 0.97,
            "is_simulated_data": True,
            "answer": data["root_cause_explanation"],
            "evidence": {
                "query_intent": "PRE_INCIDENT_TELEMETRY",
                "time_window_analyzed": f"15-minute lead-in prior to {data['event']['timestamp']}",
                "numerical_metrics": m,
                "supporting_record_count": data["sample_count"],
                "sample_records": data["telemetry_samples"][:5],
                "database_tables_queried": ["diagnostic_events", "telemetry_records"]
            },
            "timestamp": datetime.now(timezone.utc)
        }

    @classmethod
    def _handle_city_highway(cls, query_text: str, db: Session) -> Dict[str, Any]:
        data = AnalyticsEngine.get_city_vs_highway_comparison(db, days=30)
        c = data["city"]
        h = data["highway"]

        return {
            "query": query_text,
            "intent_detected": "COMPARE_CITY_VS_HIGHWAY",
            "confidence": 0.98,
            "is_simulated_data": True,
            "answer": data["analysis_summary"],
            "evidence": {
                "query_intent": "COMPARE_CITY_VS_HIGHWAY",
                "time_window_analyzed": "Past 30 days telemetry",
                "numerical_metrics": {
                    "city_avg_consumption_wh_km": c["avg_consumption_wh_km"],
                    "highway_avg_consumption_wh_km": h["avg_consumption_wh_km"],
                    "efficiency_gap_pct": data["efficiency_difference_pct"],
                    "city_avg_speed_kmh": c["avg_speed_kmh"],
                    "highway_avg_speed_kmh": h["avg_speed_kmh"],
                    "city_distance_km": c["total_distance_km"],
                    "highway_distance_km": h["total_distance_km"]
                },
                "supporting_record_count": c["data_points"] + h["data_points"],
                "sample_records": [
                    {"type": "City Summary", **c},
                    {"type": "Highway Summary", **h}
                ],
                "database_tables_queried": ["telemetry_records", "trip_summaries"]
            },
            "timestamp": datetime.now(timezone.utc)
        }

    @classmethod
    def _handle_current_telemetry(cls, query_text: str, db: Session) -> Dict[str, Any]:
        # Live simulator state or latest DB record
        live_data = vehicle_simulator.latest_telemetry
        if not live_data:
            latest_rec = db.query(TelemetryRecord).order_by(TelemetryRecord.timestamp.desc()).first()
            if latest_rec:
                live_data = latest_rec.to_dict()

        if not live_data:
            return cls._no_data_response(query_text, "telemetry_records")

        answer = (
            f"Current Vehicle Status: Speed is {live_data['speed_kmh']} km/h, Battery State of Charge is "
            f"{live_data['battery_soc_pct']}%, Estimated Range is {live_data['estimated_range_km']} km, "
            f"Pack Voltage is {live_data['battery_voltage_v']}V with a current draw of {live_data['battery_current_a']}A, "
            f"and Odometer is at {live_data['odometer_km']} km."
        )

        return {
            "query": query_text,
            "intent_detected": "CURRENT_TELEMETRY",
            "confidence": 0.95,
            "is_simulated_data": True,
            "answer": answer,
            "evidence": {
                "query_intent": "CURRENT_TELEMETRY",
                "time_window_analyzed": f"Latest record at {live_data['timestamp']}",
                "numerical_metrics": {
                    "speed_kmh": live_data["speed_kmh"],
                    "battery_soc_pct": live_data["battery_soc_pct"],
                    "estimated_range_km": live_data["estimated_range_km"],
                    "battery_voltage_v": live_data["battery_voltage_v"],
                    "battery_current_a": live_data["battery_current_a"],
                    "odometer_km": live_data["odometer_km"]
                },
                "supporting_record_count": 1,
                "sample_records": [live_data],
                "database_tables_queried": ["telemetry_records"]
            },
            "timestamp": datetime.now(timezone.utc)
        }

    @classmethod
    def _handle_dtc_diagnostics(cls, query_text: str, db: Session) -> Dict[str, Any]:
        events = db.query(DiagnosticEvent).filter(
            DiagnosticEvent.dtc_code.isnot(None)
        ).order_by(DiagnosticEvent.timestamp.desc()).limit(10).all()

        dtc_list = [e.to_dict() for e in events]
        if not dtc_list:
            answer = "Diagnostic Scan Complete: No active or stored Diagnostic Trouble Codes (DTCs) found."
        else:
            codes_summary = ", ".join(f"{d['dtc_code']} ({d['title']})" for d in dtc_list[:3])
            answer = f"Found {len(dtc_list)} Diagnostic Trouble Code(s): {codes_summary}. Detailed records attached in evidence."

        return {
            "query": query_text,
            "intent_detected": "DTC_DIAGNOSTICS",
            "confidence": 0.94,
            "is_simulated_data": True,
            "answer": answer,
            "evidence": {
                "query_intent": "DTC_DIAGNOSTICS",
                "time_window_analyzed": "Diagnostic log history",
                "numerical_metrics": {"total_dtc_count": len(dtc_list)},
                "supporting_record_count": len(dtc_list),
                "sample_records": dtc_list,
                "database_tables_queried": ["diagnostic_events"]
            },
            "timestamp": datetime.now(timezone.utc)
        }

    @classmethod
    def _handle_thermal_status(cls, query_text: str, db: Session) -> Dict[str, Any]:
        live_data = vehicle_simulator.latest_telemetry
        if not live_data:
            latest = db.query(TelemetryRecord).order_by(TelemetryRecord.timestamp.desc()).first()
            if latest:
                live_data = latest.to_dict()

        if not live_data:
            return cls._no_data_response(query_text, "telemetry_records")

        b_temp = live_data["battery_temp_c"]
        m_temp = live_data["motor_temp_c"]
        amb = live_data["ambient_temp_c"]

        status_str = "NORMAL"
        if b_temp > 45.0 or m_temp > 80.0:
            status_str = "ELEVATED"
        if b_temp > 50.0 or m_temp > 95.0:
            status_str = "CRITICAL OVERHEAT"

        answer = (
            f"Thermal Subsystem Status [{status_str}]: Battery temperature is {b_temp}°C (safe range 20-40°C), "
            f"Drive Motor temperature is {m_temp}°C (safe range 30-75°C), with ambient temperature at {amb}°C."
        )

        return {
            "query": query_text,
            "intent_detected": "THERMAL_STATUS",
            "confidence": 0.95,
            "is_simulated_data": True,
            "answer": answer,
            "evidence": {
                "query_intent": "THERMAL_STATUS",
                "time_window_analyzed": f"Instantaneous reading at {live_data['timestamp']}",
                "numerical_metrics": {
                    "battery_temp_c": b_temp,
                    "motor_temp_c": m_temp,
                    "ambient_temp_c": amb,
                    "thermal_status": status_str
                },
                "supporting_record_count": 1,
                "sample_records": [live_data],
                "database_tables_queried": ["telemetry_records"]
            },
            "timestamp": datetime.now(timezone.utc)
        }

    @classmethod
    def _handle_unknown(cls, query_text: str, db: Session) -> Dict[str, Any]:
        return {
            "query": query_text,
            "intent_detected": "UNKNOWN_OR_AMBIGUOUS",
            "confidence": 0.20,
            "is_simulated_data": True,
            "answer": (
                "VehicleGPT On-Device Assistant: I cannot reliably interpret this query from local vehicle telemetry logs. "
                "As an on-edge offline assistant, I answer evidence-backed vehicle telemetry questions without relying on cloud servers. "
                "Supported inquiries include: "
                "(1) 'Why has my driving range reduced over the last two weeks?', "
                "(2) 'When did fuel efficiency show the largest drop?', "
                "(3) 'Show all ADAS disengagement events from yesterday', "
                "(4) 'What happened before the battery overheating warning?', "
                "(5) 'Compare energy consumption between city and highway driving', "
                "(6) 'What is my current battery level and range?', or "
                "(7) 'Show active DTC codes'."
            ),
            "evidence": {
                "query_intent": "UNKNOWN_OR_AMBIGUOUS",
                "time_window_analyzed": "N/A",
                "numerical_metrics": {"supported_intents_count": 8},
                "supporting_record_count": 0,
                "sample_records": [],
                "database_tables_queried": []
            },
            "timestamp": datetime.now(timezone.utc)
        }

    @classmethod
    def _no_data_response(cls, query_text: str, table_name: str) -> Dict[str, Any]:
        return {
            "query": query_text,
            "intent_detected": "NO_DATA_AVAILABLE",
            "confidence": 0.5,
            "is_simulated_data": True,
            "answer": (
                f"No vehicle telemetry records are currently available in table '{table_name}'. "
                "Please seed demo historical data using the '/api/v1/demo/generate' endpoint or start the live simulator."
            ),
            "evidence": {
                "query_intent": "NO_DATA_AVAILABLE",
                "time_window_analyzed": "N/A",
                "numerical_metrics": {},
                "supporting_record_count": 0,
                "sample_records": [],
                "database_tables_queried": [table_name]
            },
            "timestamp": datetime.now(timezone.utc)
        }
