"""
scripts/evaluate.py
-------------------
Reproducible evaluation of the frozen hybrid engine baseline against
data/trigger_benchmark.csv.

Usage (from ai-journal-nlp-engine/):
    python scripts/evaluate.py

Output:
    - Console: aggregated metrics
    - data/benchmark_results.csv: per-example detail for error analysis

Label schema in the benchmark:
    - Single:  SENSORY | EXECUTIVE | SOCIAL_MASKING | NONE | REVIEW
    - Multi:   SENSORY|EXECUTIVE  etc. (pipe-separated, uppercase)
    - REVIEW rows are excluded from metrics and counted separately.
    - NONE rows contribute to NONE-specific metrics (engine must predict
      an empty set to be correct).

IMPORTANT: Do not use these results to tune the engine. Evaluate once,
document, then make a decision about next steps.
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

# Allow running from both the project root and scripts/
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.hybrid_engine import HybridEngine  # noqa: E402

BENCHMARK_PATH = PROJECT_ROOT / "data" / "trigger_benchmark.csv"
RESULTS_PATH = PROJECT_ROOT / "data" / "benchmark_results.csv"

VALID_CATEGORIES = {"SENSORY", "EXECUTIVE", "SOCIAL_MASKING"}


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def parse_gold_labels(raw: str) -> frozenset[str]:
    """
    Parse the gold_label cell into a frozenset of category strings.

    'NONE' → frozenset()
    'REVIEW' → frozenset({'REVIEW'})   (caller filters these out)
    'SENSORY|EXECUTIVE' → frozenset({'SENSORY', 'EXECUTIVE'})
    """
    parts = {p.strip().upper() for p in raw.split("|") if p.strip()}
    if parts == {"NONE"}:
        return frozenset()
    return frozenset(parts)


def prediction_from_result(result: dict) -> frozenset[str]:
    """
    Combine detected_categories and possible_categories from the hybrid
    engine into a single set of predicted categories.

    ambiguous_categories are intentionally excluded from the primary
    prediction — they represent cases where the engine is not confident
    enough to commit.
    """
    predicted = (
        set(result.get("detected_categories", []))
        | set(result.get("possible_categories", []))
    )
    # Keep only valid categories in case future engine versions add others
    return frozenset(predicted & VALID_CATEGORIES)


# ---------------------------------------------------------------------------
# Per-category counters
# ---------------------------------------------------------------------------

def empty_counters() -> dict:
    return {cat: {"tp": 0, "fp": 0, "fn": 0} for cat in VALID_CATEGORIES}


def precision_recall_f1(tp: int, fp: int, fn: int) -> tuple[float, float, float]:
    p = tp / (tp + fp) if tp + fp else 0.0
    r = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * p * r / (p + r) if p + r else 0.0
    return p, r, f1


# ---------------------------------------------------------------------------
# Main evaluation
# ---------------------------------------------------------------------------

def evaluate() -> None:
    if not BENCHMARK_PATH.exists():
        print(f"ERROR: Benchmark file not found: {BENCHMARK_PATH}", file=sys.stderr)
        sys.exit(1)

    with BENCHMARK_PATH.open("r", encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))

    print(f"Loaded {len(rows)} benchmark examples.")

    engine = HybridEngine()

    review_count = 0
    none_tp = 0   # predicted empty AND gold is empty
    none_fp = 0   # predicted non-empty AND gold is empty
    none_fn = 0   # predicted empty AND gold is non-empty (NONE as missed-trigger proxy)

    exact_matches = 0
    total_evaluated = 0

    counters = empty_counters()
    per_example = []

    for row in rows:
        raw_gold = row["gold_label"].strip()
        gold = parse_gold_labels(raw_gold)

        if "REVIEW" in gold:
            review_count += 1
            per_example.append({
                "id": row["id"],
                "text": row["text"],
                "gold_label": raw_gold,
                "predicted_label": "REVIEW_EXCLUDED",
                "exact_match": "",
                "tp": "", "fp": "", "fn": "",
                "semantic_scores": "",
                "keyword_triggers": "",
                "notes": row.get("notes", ""),
            })
            continue

        total_evaluated += 1
        result = engine.analyze(row["text"])
        predicted = prediction_from_result(result)

        # None-specific accounting
        if not gold and not predicted:
            none_tp += 1
        elif not gold and predicted:
            none_fp += 1
        elif gold and not predicted:
            none_fn += 1

        # Per-category token-level accounting
        for cat in VALID_CATEGORIES:
            in_gold = cat in gold
            in_pred = cat in predicted
            if in_gold and in_pred:
                counters[cat]["tp"] += 1
            elif not in_gold and in_pred:
                counters[cat]["fp"] += 1
            elif in_gold and not in_pred:
                counters[cat]["fn"] += 1

        exact = (gold == predicted)
        if exact:
            exact_matches += 1

        # Keyword trigger phrase list for the CSV
        kw_str = "; ".join(
            f"{t['phrase']}({t['category']})"
            for t in result.get("keyword_triggers", [])
        )

        per_example.append({
            "id": row["id"],
            "text": row["text"],
            "gold_label": raw_gold,
            "predicted_label": "|".join(sorted(predicted)) if predicted else "NONE",
            "exact_match": str(exact),
            "tp": len(gold & predicted),
            "fp": len(predicted - gold),
            "fn": len(gold - predicted),
            "semantic_scores": str(result.get("semantic_scores", {})),
            "keyword_triggers": kw_str,
            "notes": row.get("notes", ""),
        })

    # -------------------------------------------------------------------
    # Aggregate metrics
    # -------------------------------------------------------------------

    print("\n" + "=" * 60)
    print("EVALUATION RESULTS  (frozen baseline, no tuning)")
    print("=" * 60)
    print(f"Total examples in benchmark : {len(rows)}")
    print(f"REVIEW (excluded)           : {review_count}")
    print(f"Evaluated                   : {total_evaluated}")
    print(f"Exact-match accuracy        : {exact_matches}/{total_evaluated} "
          f"({exact_matches/total_evaluated:.1%})")

    print("\n--- Per-Category Metrics ---")
    macro_p = macro_r = macro_f1 = 0.0
    micro_tp = micro_fp = micro_fn = 0

    for cat in sorted(VALID_CATEGORIES):
        tp = counters[cat]["tp"]
        fp = counters[cat]["fp"]
        fn = counters[cat]["fn"]
        p, r, f1 = precision_recall_f1(tp, fp, fn)
        macro_p += p
        macro_r += r
        macro_f1 += f1
        micro_tp += tp
        micro_fp += fp
        micro_fn += fn
        print(f"  {cat:<20}  P={p:.3f}  R={r:.3f}  F1={f1:.3f}  "
              f"(TP={tp} FP={fp} FN={fn})")

    n = len(VALID_CATEGORIES)
    print(f"\n  {'Macro average':<20}  P={macro_p/n:.3f}  "
          f"R={macro_r/n:.3f}  F1={macro_f1/n:.3f}")

    micro_p, micro_r, micro_f1 = precision_recall_f1(micro_tp, micro_fp, micro_fn)
    print(f"  {'Micro average':<20}  P={micro_p:.3f}  "
          f"R={micro_r:.3f}  F1={micro_f1:.3f}")

    print(f"\n  Total FP category predictions : {micro_fp}")
    print(f"  Total FN (missed) categories  : {micro_fn}")

    # NONE-specific metrics
    none_precision = none_tp / (none_tp + none_fp) if (none_tp + none_fp) else 0.0
    none_recall = none_tp / (none_tp + none_fn) if (none_tp + none_fn) else 0.0
    none_f1 = (2 * none_precision * none_recall / (none_precision + none_recall)
               if (none_precision + none_recall) else 0.0)

    print(f"\n--- NONE Detection (no-trigger class) ---")
    print(f"  True negatives (both empty)  : {none_tp}")
    print(f"  False positives (over-detect): {none_fp}")
    print(f"  False negatives (under-detect): {none_fn}")
    print(f"  NONE precision : {none_precision:.3f}")
    print(f"  NONE recall    : {none_recall:.3f}")
    print(f"  NONE F1        : {none_f1:.3f}")

    print("\n" + "=" * 60)
    print("LIMITATIONS")
    print("=" * 60)
    print("- Benchmark is a controlled synthetic set, NOT real-world journal data.")
    print("- Gold labels were constructed by the project team, not independently verified.")
    print("- Semantic scores are cosine similarities from a general pretrained model,")
    print("  NOT calibrated probabilities.")
    print("- These results describe behaviour on controlled examples only.")
    print("  Real-world performance may differ substantially.")

    # -------------------------------------------------------------------
    # Save per-example results
    # -------------------------------------------------------------------

    fieldnames = [
        "id", "text", "gold_label", "predicted_label", "exact_match",
        "tp", "fp", "fn", "semantic_scores", "keyword_triggers", "notes",
    ]

    with RESULTS_PATH.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(per_example)

    print(f"\nPer-example results saved to: {RESULTS_PATH}")


if __name__ == "__main__":
    evaluate()
