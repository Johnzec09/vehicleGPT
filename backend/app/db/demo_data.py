import json
import math
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.db_models import TelemetryRecord, DiagnosticEvent, TripSummary
from app.config import settings

def generate_demo_dataset(db: Session, force: bool = False, days: int = 30):
    """
    Generates 30+ days of coherent, realistic EV historical data.
    Guarantees all Case Study 5 scenarios are mathematically supported:
    1. Range reduction over last 2 weeks (due to weather drop & aggressive highway usage).
    2. Exact date of largest efficiency drop (sport mode / heavy grade towing).
    3. ADAS disengagement events yesterday.
    4. Pre-incident telemetry preceding a Battery Overheating warning.
    5. Clean statistical distinction between City and Highway driving.
    """
    existing_count = db.query(TelemetryRecord).count()
    if existing_count > 0 and not force:
        return {
            "status": "skipped",
            "message": f"Database already populated with {existing_count} telemetry records.",
            "record_count": existing_count
        }

    # Clean existing data if force=True
    if force:
        db.query(TelemetryRecord).delete()
        db.query(DiagnosticEvent).delete()
        db.query(TripSummary).delete()
        db.commit()

    # Anchor time: Current UTC time rounded to hour
    now = datetime.now(timezone.utc).replace(microsecond=0)
    start_date = now - timedelta(days=days)
    
    current_odometer = 12450.0  # Initial odometer in km
    records_to_insert = []
    events_to_insert = []
    trips_to_insert = []

    # Scenario parameters
    # Days 0-15: Baseline efficiency (mild weather 22-26°C, mostly calm city/mixed driving)
    # Days 16-30 (last 2 weeks): Efficiency drops / range decreases (colder weather 8-14°C, more highway, HVAC usage)
    
    trip_counter = 1

    for day_offset in range(days):
        day_date = start_date + timedelta(days=day_offset)
        is_last_two_weeks = day_offset >= (days - 14)
        is_yesterday = (day_offset == days - 2)
        is_five_days_ago = (day_offset == days - 5)
        is_eight_days_ago = (day_offset == days - 8)

        # Baseline vs recent weather
        if is_last_two_weeks:
            base_ambient_temp = 10.0 + random.uniform(-2.0, 3.0)
            avg_consumption_modifier = 1.35  # ~35% higher consumption due to cabin heating & air density
        else:
            base_ambient_temp = 24.0 + random.uniform(-2.0, 3.0)
            avg_consumption_modifier = 1.0

        # Daily schedule: Morning commute (08:00), Evening commute (17:30), Night charging (22:00)
        # Weekends (e.g., day_offset % 7 in (5, 6)): Highway trip
        is_weekend = (day_date.weekday() >= 5)

        daily_trips = []
        if is_weekend:
            daily_trips.append({
                "start": day_date.replace(hour=10, minute=30, second=0),
                "duration_min": 65,
                "type": "HIGHWAY",
                "speed_avg": 92.0,
                "speed_max": 118.0
            })
        else:
            daily_trips.append({
                "start": day_date.replace(hour=8, minute=15, second=0),
                "duration_min": 35,
                "type": "CITY",
                "speed_avg": 32.0,
                "speed_max": 54.0
            })
            daily_trips.append({
                "start": day_date.replace(hour=17, minute=45, second=0),
                "duration_min": 40,
                "type": "CITY",
                "speed_avg": 29.0,
                "speed_max": 51.0
            })

        # Check special anomaly day: 8 days ago had the largest efficiency drop
        if is_eight_days_ago:
            daily_trips.append({
                "start": day_date.replace(hour=13, minute=0, second=0),
                "duration_min": 50,
                "type": "HIGHWAY",
                "speed_avg": 115.0,
                "speed_max": 145.0,
                "special": "MAX_EFFICIENCY_DROP"
            })

        current_soc = 85.0 - random.uniform(0, 10)

        for trip_info in daily_trips:
            t_start = trip_info["start"]
            duration = trip_info["duration_min"]
            t_type = trip_info["type"]
            is_special_drop = trip_info.get("special") == "MAX_EFFICIENCY_DROP"

            trip_distance = 0.0
            trip_records = []
            start_soc_trip = current_soc

            # Step interval of 3 minutes per sample to have realistic granular data without bloating
            steps = max(5, duration // 3)
            step_duration_sec = (duration * 60) / steps

            base_consumption = 145.0 if t_type == "CITY" else 198.0
            if is_last_two_weeks:
                base_consumption *= avg_consumption_modifier

            if is_special_drop:
                base_consumption = 295.0  # Massive consumption spike!

            battery_temp = base_ambient_temp + random.uniform(5.0, 8.0)
            motor_temp = base_ambient_temp + 15.0

            for step in range(steps):
                sample_time = t_start + timedelta(seconds=int(step * step_duration_sec))
                progress = step / float(steps)

                # Speed model
                if t_type == "CITY":
                    # stop and go cycles
                    speed = max(0.0, trip_info["speed_avg"] + 15.0 * math.sin(progress * 12.0) + random.uniform(-4, 4))
                else:
                    # highway cruising
                    speed = max(40.0, trip_info["speed_avg"] + 10.0 * math.cos(progress * 6.0) + random.uniform(-3, 3))

                if is_special_drop:
                    speed = min(150.0, speed + 25.0)

                dist_delta_km = (speed * (step_duration_sec / 3600.0))
                trip_distance += dist_delta_km
                current_odometer += dist_delta_km

                # Energy consumption & current
                sample_consumption = base_consumption + (speed * 0.45) + random.uniform(-8, 8)
                current_a = (sample_consumption * speed) / (settings.NOMINAL_VOLTAGE_V * 1.0)
                if speed < 3.0:
                    current_a = 2.5  # Idle auxiliary load

                # Battery SOC discharge
                kwh_used = (sample_consumption * dist_delta_km) / 1000.0
                soc_delta = (kwh_used / settings.BATTERY_CAPACITY_KWH) * 100.0
                current_soc = max(10.0, current_soc - soc_delta)

                battery_voltage = 330.0 + (current_soc / 100.0) * 75.0 - (current_a * 0.04)

                # Temperatures rise with load
                battery_temp += (current_a * 0.005) - (0.003 * (battery_temp - base_ambient_temp))
                motor_temp += (current_a * 0.015) - (0.01 * (motor_temp - base_ambient_temp))

                # Estimated range based on current SOC and rolling consumption
                est_range = (current_soc / 100.0) * (settings.BATTERY_CAPACITY_KWH / (sample_consumption / 1000.0))
                est_range = min(settings.MAX_DESIGN_RANGE_KM, max(5.0, est_range))

                rec = TelemetryRecord(
                    vehicle_id=settings.VEHICLE_ID,
                    timestamp=sample_time,
                    speed_kmh=round(speed, 1),
                    battery_soc_pct=round(current_soc, 1),
                    battery_voltage_v=round(battery_voltage, 1),
                    battery_current_a=round(current_a, 1),
                    battery_temp_c=round(battery_temp, 1),
                    motor_temp_c=round(motor_temp, 1),
                    energy_consumption_wh_km=round(sample_consumption, 1),
                    estimated_range_km=round(est_range, 1),
                    odometer_km=round(current_odometer, 2),
                    driving_mode="SPORT" if is_special_drop else ("ECO" if t_type == "CITY" and not is_last_two_weeks else "NORMAL"),
                    driving_condition=t_type,
                    ambient_temp_c=round(base_ambient_temp, 1),
                    is_charging=False,
                    is_simulated=True
                )
                trip_records.append(rec)
                records_to_insert.append(rec)

            # Record trip summary
            trip_summary = TripSummary(
                trip_id=f"TRIP-{t_start.strftime('%Y%m%d')}-{trip_counter:04d}",
                start_time=t_start,
                end_time=t_start + timedelta(minutes=duration),
                distance_km=round(trip_distance, 2),
                duration_minutes=float(duration),
                avg_speed_kmh=round(trip_distance / (duration / 60.0), 1),
                max_speed_kmh=round(trip_info["speed_max"], 1),
                avg_consumption_wh_km=round(base_consumption, 1),
                driving_condition=t_type,
                start_soc_pct=round(start_soc_trip, 1),
                end_soc_pct=round(current_soc, 1),
                ambient_temp_avg_c=round(base_ambient_temp, 1),
                is_simulated=True
            )
            trips_to_insert.append(trip_summary)
            trip_counter += 1

            # Check if largest efficiency drop event
            if is_special_drop:
                events_to_insert.append(DiagnosticEvent(
                    vehicle_id=settings.VEHICLE_ID,
                    timestamp=t_start + timedelta(minutes=15),
                    event_type="ENERGY_CONSUMPTION_SURGE",
                    severity="WARNING",
                    title="Abnormal Energy Consumption Surge",
                    description=(
                        "Sudden efficiency drop detected: Consumption surged to 295.4 Wh/km (+54% vs 30-day baseline) "
                        "during sustained high-speed driving (avg 115 km/h, max 145 km/h) in SPORT mode."
                    ),
                    source_subsystem="POWERTRAIN",
                    dtc_code="P1A01",
                    supporting_telemetry=json.dumps({
                        "avg_speed_kmh": 115.0,
                        "consumption_wh_km": 295.4,
                        "driving_mode": "SPORT",
                        "trip_distance_km": round(trip_distance, 1)
                    }),
                    is_simulated=True
                ))

        # Check: 5 days ago pre-incident battery overheating scenario
        if is_five_days_ago:
            # Overheat incident at 15:45
            overheat_time = day_date.replace(hour=15, minute=45, second=0)
            
            # Insert leading pre-incident telemetry (15 minutes prior)
            for m in range(15):
                pre_time = overheat_time - timedelta(minutes=(15 - m))
                # Rapidly climbing current and battery temperature
                pre_curr = 120.0 + (m * 4.5)
                pre_btemp = 36.5 + (m * 0.95)  # Reaches ~50°C
                pre_mtemp = 55.0 + (m * 1.8)
                pre_rec = TelemetryRecord(
                    vehicle_id=settings.VEHICLE_ID,
                    timestamp=pre_time,
                    speed_kmh=128.0,
                    battery_soc_pct=round(current_soc, 1),
                    battery_voltage_v=372.0,
                    battery_current_a=round(pre_curr, 1),
                    battery_temp_c=round(pre_btemp, 1),
                    motor_temp_c=round(pre_mtemp, 1),
                    energy_consumption_wh_km=265.0,
                    estimated_range_km=round((current_soc / 100.0) * 260.0, 1),
                    odometer_km=round(current_odometer, 2),
                    driving_mode="SPORT",
                    driving_condition="HIGHWAY",
                    ambient_temp_c=34.0,  # Hot ambient day
                    is_charging=False,
                    is_simulated=True
                )
                records_to_insert.append(pre_rec)

            # The Overheating Warning Event itself
            events_to_insert.append(DiagnosticEvent(
                vehicle_id=settings.VEHICLE_ID,
                timestamp=overheat_time,
                event_type="BATTERY_OVERHEAT_WARNING",
                severity="CRITICAL",
                title="BMS Cell Temperature Exceeded Thermal Warning Threshold",
                description=(
                    "Battery pack temperature reached 50.8°C (threshold: 48.0°C) after sustained high-current draw "
                    "(165A peak) during high ambient temperature (34°C) driving. BMS initiated active thermal throttling."
                ),
                source_subsystem="BMS",
                dtc_code="P0A7F",
                supporting_telemetry=json.dumps({
                    "peak_battery_temp_c": 50.8,
                    "peak_current_a": 165.2,
                    "ambient_temp_c": 34.0,
                    "motor_temp_c": 82.0,
                    "bms_derate_pct": 30.0
                }),
                is_simulated=True
            ))

        # Check: Yesterday ADAS Disengagement Events
        if is_yesterday:
            events_to_insert.append(DiagnosticEvent(
                vehicle_id=settings.VEHICLE_ID,
                timestamp=day_date.replace(hour=8, minute=32, second=10),
                event_type="ADAS_DISENGAGEMENT",
                severity="WARNING",
                title="Lane Keeping Assist (LKA) Disengaged",
                description="ADAS disengaged automatically: Camera optical contrast reduced due to heavy sun glare and faded lane markings.",
                source_subsystem="ADAS",
                dtc_code="U0415",
                supporting_telemetry=json.dumps({
                    "speed_kmh": 48.5,
                    "disengagement_cause": "Sun Glare & Weak Lane Markings",
                    "steering_angle_deg": 1.2,
                    "driver_hands_on": True
                }),
                is_simulated=True
            ))
            events_to_insert.append(DiagnosticEvent(
                vehicle_id=settings.VEHICLE_ID,
                timestamp=day_date.replace(hour=18, minute=12, second=45),
                event_type="ADAS_DISENGAGEMENT",
                severity="INFO",
                title="Adaptive Cruise Control (ACC) Manual Override",
                description="Driver manual brake intervention caused immediate safe disengagement of ACC system.",
                source_subsystem="ADAS",
                dtc_code=None,
                supporting_telemetry=json.dumps({
                    "speed_kmh": 36.0,
                    "disengagement_cause": "Driver Brake Tap Override",
                    "brake_pressure_bar": 18.5
                }),
                is_simulated=True
            ))

        # Regular Charging Session at night (22:00)
        charging_start = day_date.replace(hour=22, minute=0, second=0)
        charge_added_pct = min(100.0 - current_soc, 65.0)
        current_soc = min(95.0, current_soc + charge_added_pct)

        records_to_insert.append(TelemetryRecord(
            vehicle_id=settings.VEHICLE_ID,
            timestamp=charging_start,
            speed_kmh=0.0,
            battery_soc_pct=round(current_soc, 1),
            battery_voltage_v=398.5,
            battery_current_a=-32.0,  # Negative current indicates charging
            battery_temp_c=26.0,
            motor_temp_c=23.0,
            energy_consumption_wh_km=0.0,
            estimated_range_km=round((current_soc / 100.0) * settings.MAX_DESIGN_RANGE_KM, 1),
            odometer_km=round(current_odometer, 2),
            driving_mode="ECO",
            driving_condition="CHARGING",
            ambient_temp_c=round(base_ambient_temp - 4.0, 1),
            is_charging=True,
            is_simulated=True
        ))

    # Commit all batch records in chunks
    db.bulk_save_objects(records_to_insert)
    db.bulk_save_objects(events_to_insert)
    db.bulk_save_objects(trips_to_insert)
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully generated {len(records_to_insert)} telemetry records, {len(events_to_insert)} diagnostic events, and {len(trips_to_insert)} trips.",
        "telemetry_count": len(records_to_insert),
        "events_count": len(events_to_insert),
        "trips_count": len(trips_to_insert),
        "days_covered": days
    }
