import re
from typing import Dict, Any

SAFETY_CONTROL_KEYWORDS = [
    r"\b(brake|brakes|braking)\b.*\b(disable|turn off|stop|override|cut|apply|engage|activate|now|immediately)\b",
    r"\b(disable|turn off|stop|override|cut|apply|engage|activate)\b.*\b(brake|brakes|braking)\b",
    r"\b(emergency\s+braking|hard\s+brake)\b",
    r"\b(accelerate|propel|throttle|speed up|increase speed)\b",
    r"\b(steer|steering|turn\s+(wheel\s+)?(left|right)|turn\s+the\s+wheel)\b",
    r"\b(turn|rotate|adjust)\b.*\b(wheel|steering)\b",
    r"\b(kill|shut down|disable)\b.*\b(motor|engine|inverter)\b",
    r"\b(motor|engine|inverter)\b.*\b(kill|shut down|disable)\b",
    r"\b(unlock|open doors?)\b.*\b(at speed|while driving)\b"
]

INTENT_PATTERNS = [
    (
        "RANGE_REDUCTION_EXPLANATION",
        [
            r"why.*(driving\s+)?range.*(reduced|decreased|dropped|fallen|lower)",
            r"range.*(drop|decrease|reduction|loss).*(last|past)?.*(two|2)\s+weeks",
            r"(reason|cause).*(for)?.*(reduced|lower|dropping).*range",
            r"why\s+is\s+my\s+range\s+so\s+low",
        ]
    ),
    (
        "EFFICIENCY_DROP_MAX",
        [
            r"(when|which\s+day).*(fuel\s+efficiency|energy\s+efficiency|efficiency).*(largest|biggest|maximum|worst).*(drop|fall|decrease)",
            r"(largest|worst|highest).*(drop|spike|surge).*(in\s+efficiency|energy\s+consumption|power\s+draw)",
            r"when\s+did\s+(fuel\s+efficiency|efficiency)\s+show\s+the\s+largest\s+drop",
            r"peak\s+energy\s+consumption\s+spike",
        ]
    ),
    (
        "ADAS_DISENGAGEMENT_EVENTS",
        [
            r"(show|list|get|any).*(adas|driver\s+assist|autopilot|lane\s+keeping|acc).*(disengagement|override|disconnect|cancel)",
            r"adas.*(yesterday|events|warnings)",
            r"disengagement\s+events",
            r"show\s+all\s+adas\s+disengagement\s+events",
        ]
    ),
    (
        "PRE_INCIDENT_TELEMETRY",
        [
            r"what\s+happened\s+before.*(battery|motor)?.*(overheating|overheat|warning|thermal|alarm)",
            r"(telemetry|events|data|conditions)\s+before.*(battery\s+overheat|warning)",
            r"prior\s+to.*(battery\s+overheat|overheating\s+warning)",
            r"pre-incident.*battery",
        ]
    ),
    (
        "COMPARE_CITY_VS_HIGHWAY",
        [
            r"compare.*(energy\s+consumption|efficiency|power|consumption|range).*(between|in)?.*(city\s+and\s+highway|highway\s+and\s+city)",
            r"(city\s+vs\s+highway|highway\s+vs\s+city)",
            r"which.*uses\s+more\s+(energy|power|battery).*(city|highway)",
            r"difference\s+between\s+city\s+and\s+highway\s+consumption",
        ]
    ),
    (
        "CURRENT_TELEMETRY",
        [
            r"(what\s+is|show|tell\s+me|current).*(battery\s+level|soc|charge|remaining\s+range|speed|odometer|telemetry)",
            r"how\s+much\s+(range|battery)\s+(do\s+i\s+have|left|remaining)",
            r"^telemetry$",
            r"^status$",
        ]
    ),
    (
        "DTC_DIAGNOSTICS",
        [
            r"(show|list|are\s+there\s+any|check).*(dtc|diagnostic\s+trouble\s+codes?|fault\s+codes?|trouble\s+codes?)",
            r"active\s+dtcs?",
            r"diagnostics?",
        ]
    ),
    (
        "THERMAL_STATUS",
        [
            r"(what\s+is|check|show).*(battery|motor|powertrain)\s+temp(erature)?",
            r"is\s+the\s+battery\s+(hot|overheating|cool)",
            r"thermal\s+status",
        ]
    ),
]

def parse_user_query(query_text: str) -> Dict[str, Any]:
    """
    Deterministically parses user natural language into an intent structure.
    Also guards safety isolation boundaries.
    """
    clean_text = query_text.strip().lower()

    # Safety guard check
    for pattern in SAFETY_CONTROL_KEYWORDS:
        if re.search(pattern, clean_text, re.IGNORECASE):
            return {
                "intent": "SAFETY_CONTROL_REJECTION",
                "matched_pattern": pattern,
                "confidence": 1.0,
                "is_safety_violation": True
            }

    # Match predefined domain intents
    for intent_name, patterns in INTENT_PATTERNS:
        for p in patterns:
            if re.search(p, clean_text, re.IGNORECASE):
                return {
                    "intent": intent_name,
                    "matched_pattern": p,
                    "confidence": 0.95,
                    "is_safety_violation": False
                }

    # Fallback to general intent analysis
    return {
        "intent": "UNKNOWN_OR_AMBIGUOUS",
        "matched_pattern": None,
        "confidence": 0.2,
        "is_safety_violation": False
    }
