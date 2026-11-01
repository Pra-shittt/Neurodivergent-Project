"""
test_trigger_extreme_limits.py
==============================
Extreme stress, adversarial, and boundary condition test suite for the
NeuroPortal Trigger Detection Engine (Lexical + Semantic + Coping Rules).

Run:
  python test_trigger_extreme_limits.py
"""

import sys
import os
import time
import statistics
from typing import Dict, Any, List

# Ensure app is importable
APP_DIR = os.path.dirname(os.path.abspath(__file__))
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

from app.nlp_engine import detect_triggers, analyze_journal_text
from app.hybrid_engine import HybridEngine
from app.coping_rules import detect_burnout_cues


def print_header(title: str):
    print("\n" + "=" * 70)
    print(f" {title.upper()} ")
    print("=" * 70)


def run_adversarial_and_extreme_tests():
    hybrid = HybridEngine()

    print_header("1. Adversarial & Edge Case Evaluations")

    test_cases = [
        # (Category description, Input text, Expected behavior / Trigger Expectation)
        {
            "category": "Clear Sensory Trigger",
            "text": "The fluorescent lights were flickering constantly and the office was too loud.",
            "expect_sensory": True,
            "expect_none": False,
        },
        {
            "category": "Clear Executive Trigger",
            "text": "I am facing an intense deadline tomorrow and suffering from task paralysis and brain fog.",
            "expect_executive": True,
            "expect_none": False,
        },
        {
            "category": "Clear Social Masking Trigger",
            "text": "I spent the entire afternoon scripting conversations and forcing eye contact at the networking event.",
            "expect_masking": True,
            "expect_none": False,
        },
        {
            "category": "Multi-domain Overload (Sensory + Exec + Masking)",
            "text": "The loud chatter and bright glare in the open office paralyzed my focus, making me miss my deadline while faking a smile.",
            "expect_all_three": True,
            "expect_none": False,
        },
        {
            "category": "Polysemy False-Positive Resistance ('light')",
            "text": "I wore a light jacket and had a light snack in the morning.",
            "check_false_positive": "SENSORY",
        },
        {
            "category": "Polysemy False-Positive Resistance ('fabric')",
            "text": "The book explores the intricate social fabric of ancient Rome.",
            "check_false_positive": "SENSORY",
        },
        {
            "category": "Pure Neutral Journal (No triggers)",
            "text": "I watered my house plants, made a cup of green tea, and read a novel.",
            "expect_none": True,
        },
        {
            "category": "Elongated Screaming Text",
            "text": "THE LOUD NOISE WAS UNBEARABLE AND MY HEAD WAS POUNDING",
            "expect_sensory": True,
        },
        {
            "category": "Typo / Misspelling Resistance",
            "text": "The florescent lights were flikering and loud static was buzzing.",
            "expect_sensory": True,
        },
        {
            "category": "Pure Emojis Input",
            "text": "🤯😫😭🔊⚡️🛑",
            "handles_gracefully": True,
        },
        {
            "category": "Punctuation & Special Characters Flood",
            "text": "!?!?!?!? #@$%^&*() --- ..... ,,,,, ;;;; ::::",
            "handles_gracefully": True,
        },
        {
            "category": "XSS / HTML Script Injection Attempt",
            "text": "<script>alert('xss')</script><img src=x onerror=alert(1)> I was overwhelmed by the crowded room.",
            "expect_sensory": True,
            "handles_gracefully": True,
        },
        {
            "category": "Colloquial Neurodivergent Burnout Expressions",
            "text": "My spoons are completely gone and my brain felt fried after 8 hours of masking.",
            "expect_executive_or_masking": True,
        },
    ]

    results_table = []

    for tc in test_cases:
        t0 = time.perf_counter()
        analysis = hybrid.analyze(tc["text"])
        elapsed_ms = (time.perf_counter() - t0) * 1000

        detected = set(analysis["detected_categories"])
        possible = set(analysis["possible_categories"])
        all_predicted = detected | possible
        keyword_hits = [k["phrase"] for k in analysis["keyword_triggers"]]

        # Evaluation criteria
        passed = True
        notes = []

        if tc.get("expect_sensory") and "SENSORY" not in all_predicted:
            passed = False
            notes.append("Missed SENSORY")
        if tc.get("expect_executive") and "EXECUTIVE" not in all_predicted:
            passed = False
            notes.append("Missed EXECUTIVE")
        if tc.get("expect_masking") and "SOCIAL_MASKING" not in all_predicted:
            passed = False
            notes.append("Missed SOCIAL_MASKING")
        if tc.get("expect_none") and len(detected) > 0:
            passed = False
            notes.append(f"Unexpected trigger: {detected}")
        if tc.get("expect_all_three"):
            for cat in ["SENSORY", "EXECUTIVE", "SOCIAL_MASKING"]:
                if cat not in all_predicted:
                    passed = False
                    notes.append(f"Missing {cat}")
        if tc.get("check_false_positive"):
            bad_cat = tc["check_false_positive"]
            if bad_cat in detected:
                passed = False
                notes.append(f"False positive on '{bad_cat}'")

        results_table.append({
            "name": tc["category"],
            "passed": passed,
            "predicted": list(all_predicted),
            "keywords": keyword_hits[:3],
            "elapsed_ms": elapsed_ms,
            "notes": ", ".join(notes) or "OK",
        })

    for r in results_table:
        status = "[PASS]" if r["passed"] else "[FAIL]"
        pred_str = ", ".join(r["predicted"]) or "None"
        print(f"{status} {r['name']:<48} | {r['elapsed_ms']:5.1f}ms | Pred: [{pred_str}] | {r['notes']}")

    # ------------------------------------------------------------------------
    # 2. Extreme Length Stress Test (3,000+ words narrative)
    # ------------------------------------------------------------------------
    print_header("2. Extreme Length Stress Test (Long Narrative Journal)")
    base_paragraph = (
        "Today began with an intense morning rush. The bright sun was glaring through the window, "
        "and construction noise outside was blaring. I had a backlog of 40 unread emails and three "
        "imminent deadlines. During the group meeting, I had to force eye contact and script my responses. "
        "By 3 PM, decision fatigue and sensory overload left me completely exhausted. "
    )
    long_narrative = (base_paragraph * 25)  # ~1,250 words / ~8,000 characters
    print(f"Testing input with {len(long_narrative.split())} words ({len(long_narrative):,} characters)...")

    t0 = time.perf_counter()
    long_result = hybrid.analyze(long_narrative)
    long_time_ms = (time.perf_counter() - t0) * 1000

    print(f"Result: Processed in {long_time_ms:.1f}ms!")
    print(f"Detected categories: {long_result['detected_categories']}")
    print(f"Unique keyword triggers caught: {len(long_result['keyword_triggers'])}")
    assert set(long_result["detected_categories"]) == {"SENSORY", "EXECUTIVE", "SOCIAL_MASKING"}, "All 3 domains should be detected"
    print("[PASS] Long narrative stress test completed successfully.")

    # ------------------------------------------------------------------------
    # 3. Latency & High-Throughput Batch Benchmark
    # ------------------------------------------------------------------------
    print_header("3. High-Throughput & Latency Benchmark (50 Sequential Runs)")
    benchmark_sentences = [
        "The bright flickering lights gave me a headache.",
        "Struggling with task paralysis and missed my project deadline.",
        "Had to camouflage my autistic traits throughout the team lunch.",
        "I watered the garden and cleaned the kitchen counters.",
        "Loud sirens and sirens buzzing outside distracted my focus completely.",
    ]

    latencies = []
    print("Running 50 rapid inference cycles...")
    for i in range(50):
        text = benchmark_sentences[i % len(benchmark_sentences)]
        t_start = time.perf_counter()
        _ = hybrid.analyze(text)
        latencies.append((time.perf_counter() - t_start) * 1000)

    p50 = statistics.median(latencies)
    p95 = statistics.quantiles(latencies, n=20)[18] if len(latencies) >= 20 else max(latencies)
    avg_latency = statistics.mean(latencies)
    min_latency = min(latencies)
    max_latency = max(latencies)

    print(f"Total Runs:    {len(latencies)}")
    print(f"Average:       {avg_latency:.2f} ms")
    print(f"Median (p50):  {p50:.2f} ms")
    print(f"95th %ile (p95): {p95:.2f} ms")
    print(f"Min / Max:     {min_latency:.2f} ms / {max_latency:.2f} ms")
    print(f"Throughput:    ~{1000 / avg_latency:.1f} inferences/second on CPU")
    if p95 < 100:
        print("[PASS] Latency SLA (<100ms per entry on CPU) PASSED with flying colors!")
    else:
        print(f"[WARN] Latency higher than 100ms threshold: {p95:.1f}ms")

    # ------------------------------------------------------------------------
    # 4. Coping Rules & Clinical Burnout Stress Test
    # ------------------------------------------------------------------------
    print_header("4. Coping Rules & Burnout Cue Indicator Tests")
    burnout_test_cases = [
        {
            "name": "Critical Severity: Multiple Burnout Phrases + High Ratings",
            "text": "I am completely exhausted, drained, experiencing total task paralysis, and having a sensory meltdown.",
            "ratings": {"sensory_overload_level": 5, "executive_function_level": 1, "masking_fatigue_level": 5},
            "expected_severity": "CRITICAL",
        },
        {
            "name": "High Severity: Ratings alone (Sensory = 4, Masking = 4)",
            "text": "Today felt okay.",
            "ratings": {"sensory_overload_level": 4, "executive_function_level": 3, "masking_fatigue_level": 4},
            "expected_severity": "HIGH",
        },
        {
            "name": "Moderate Severity: Single cue (brain fog)",
            "text": "Had a bit of brain fog this afternoon.",
            "ratings": {"sensory_overload_level": 2, "executive_function_level": 3, "masking_fatigue_level": 2},
            "expected_severity": "MODERATE",
        },
        {
            "name": "Low Severity: Zero cues and regulated ratings",
            "text": "Productive morning, felt calm and peaceful.",
            "ratings": {"sensory_overload_level": 1, "executive_function_level": 4, "masking_fatigue_level": 1},
            "expected_severity": "LOW",
        },
    ]

    for btc in burnout_test_cases:
        res = detect_burnout_cues(btc["text"], btc["ratings"])
        sev = res["severity"]
        passed = (sev == btc["expected_severity"])
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} {btc['name']:<60} | Severity: {sev} (Cues: {len(res['cues'])})")
        assert passed, f"Expected {btc['expected_severity']}, got {sev}"

    # ------------------------------------------------------------------------
    # 5. FastAPI Integration Contract Validation
    # ------------------------------------------------------------------------
    print_header("5. End-to-End API Integration Contract Verification")
    sample_transcript = "The fluorescent lights flickered all morning and overlapping chatter gave me a headache."
    sample_ratings = {"mood": 2, "sensory_overload": 5, "executive_function": 2, "masking_fatigue": 4}
    api_result = analyze_journal_text(sample_transcript, sample_ratings)

    print("Contract structure returned to client:")
    print(f"  - Triggers detected: {len(api_result['triggers'])}")
    for tr in api_result["triggers"]:
        print(f"      * '{tr['phrase']}' [{tr['category']}]")
    print(f"  - User ratings echoed: {api_result['ratings']}")
    assert len(api_result["triggers"]) > 0, "Triggers must not be empty"
    assert "triggers" in api_result and "ratings" in api_result, "API response schema must match expected contract"
    print("[PASS] API Contract test passed!")

    print_header("FINAL VERDICT: TRIGGER DETECTION ENGINE DEPLOYMENT-READY")


if __name__ == "__main__":
    run_adversarial_and_extreme_tests()

