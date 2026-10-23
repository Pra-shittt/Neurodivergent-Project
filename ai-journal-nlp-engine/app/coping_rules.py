
import re
from typing import List, Dict, Any, Optional


# 1. Categorized burnout cues
BURNOUT_KEYWORD_CUES = {
    "Exhaustion & Fatigue": [
        "exhausted",
        "drained",
        "running on empty",
        "empty tank",
        "zero energy",
        "spent",
        "wiped out",
        "wired but tired",
        "depleted"
    ],
    "Cognitive & Executive Shutdown": [
        "brain fog",
        "shut down",
        "can't think",
        "cannot think",
        "paralyzed",
        "task paralysis",
        "can't focus",
        "cannot focus",
        "stuck",
        "blank",
        "numb"
    ],
    "Sensory & Emotional Distress": [
        "meltdown",
        "overwhelmed",
        "overstimulated",
        "crying",
        "hitting a wall",
        "dissociating",
        "non-verbal",
        "snapping"
    ]
}


# 2. Detect burnout cues and calculate a rule-based indicator
def detect_burnout_cues(
    text: str,
    ratings: Optional[Dict[str, int]] = None
) -> Dict[str, Any]:

    clean_text = text.lower()
    detected_cues = []
    matched_categories = set()

    # Match complete words and phrases, avoiding substring matches
    for category, phrases in BURNOUT_KEYWORD_CUES.items():
        for phrase in phrases:
            pattern = r"\b" + re.escape(phrase) + r"\b"

            if re.search(pattern, clean_text):
                detected_cues.append(phrase.title())
                matched_categories.add(category)

    # Ratings can independently indicate relevant categories
    if ratings:
        if ratings.get("sensory_overload_level", 0) >= 4:
            detected_cues.append("High Sensory Overload")
            matched_categories.add("Sensory & Emotional Distress")

        if ratings.get("executive_function_level", 5) <= 2:
            detected_cues.append("Severe Executive Dysfunction")
            matched_categories.add("Cognitive & Executive Shutdown")

        if ratings.get("masking_fatigue_level", 0) >= 4:
            detected_cues.append("High Masking Strain")
            matched_categories.add("Social Masking & Fatigue")

    # Remove duplicate cues while preserving order
    unique_cues = list(dict.fromkeys(detected_cues))

    # Rule-based indicator, not a clinical assessment
    cue_count = len(unique_cues)

    if (
        cue_count >= 4
        or (
            ratings
            and ratings.get("sensory_overload_level", 0) == 5
        )
    ):
        severity = "CRITICAL"
    elif cue_count >= 2:
        severity = "HIGH"
    elif cue_count == 1:
        severity = "MODERATE"
    else:
        severity = "LOW"

    return {
        "cues": unique_cues,
        "severity": severity,
        "categories_triggered": sorted(matched_categories)
    }


# 3. Generate a multi-step coping plan
def generate_coping_strategy(
    triggers: List[Dict[str, str]],
    ratings: Optional[Dict[str, int]] = None
) -> List[str]:

    categories = {
        trigger.get("category")
        for trigger in triggers
        if trigger.get("category")
    }

    ratings = ratings or {}
    micro_actions = []

    # Sensory support
    if (
        "SENSORY" in categories
        or ratings.get("sensory_overload_level", 0) >= 4
    ):
        micro_actions.append(
            "Sensory Relief: If comfortable, reduce brightness "
            "or move somewhere quieter. Headphones may help "
            "if sound is the main difficulty."
        )

    # Executive function support
    if (
        "EXECUTIVE" in categories
        or ratings.get("executive_function_level", 5) <= 2
    ):
        micro_actions.append(
            "Task Chunking: Choose one tiny, manageable action. "
            "Write it down and ignore the remaining tasks for "
            "the moment."
        )

    # Social masking support
    if (
        "SOCIAL_MASKING" in categories
        or ratings.get("masking_fatigue_level", 0) >= 4
    ):
        micro_actions.append(
            "Social Recovery: If possible, take a break from "
            "social demands and spend some time in a comfortable "
            "environment. You do not need to force small talk."
        )

    # General fallback
    if not micro_actions:
        micro_actions.append(
            "Micro-Break: Pause briefly, drink some water if "
            "you need it, and choose one manageable next step."
        )

    return micro_actions


# 4. Run a sample test
if __name__ == "__main__":

    journal_text = (
        "The office was so loud and the flickering lights "
        "made me feel completely wiped out and paralyzed."
    )

    user_ratings = {
        "sensory_overload_level": 5,
        "executive_function_level": 2,
        "masking_fatigue_level": 3
    }

    sample_triggers = [
        {"phrase": "flickering lights", "category": "SENSORY"},
        {"phrase": "task backlog", "category": "EXECUTIVE"}
    ]

    print("--- BURNOUT ANALYSIS ---")

    analysis = detect_burnout_cues(
        journal_text,
        user_ratings
    )

    print(f"Severity Indicator: {analysis['severity']}")
    print(f"Detected Cues: {analysis['cues']}")
    print(
        f"Symptom Categories: "
        f"{analysis['categories_triggered']}"
    )

    print("\n--- COMPOSITE COPING PLAN ---")

    coping_plan = generate_coping_strategy(
        sample_triggers,
        user_ratings
    )

    for step in coping_plan:
        print(f"- {step}")
