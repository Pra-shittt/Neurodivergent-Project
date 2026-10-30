
import csv

from app.nlp_engine import detect_triggers
from app.hybrid_engine import HybridEngine

DATASET_PATH = "data/trigger_dataset.csv"

print("Loading hybrid engine...")
hybrid_engine = HybridEngine()

# Load the existing labelled dataset
with open(DATASET_PATH, "r", encoding="utf-8-sig", newline="") as file:
    rows = list(csv.DictReader(file))

print(f"Loaded {len(rows)} examples.")


def expected_categories(label):
    if label.strip().upper() == "NONE":
        return set()

    return {
        category.strip()
        for category in label.split("|")
        if category.strip()
    }


def calculate_metrics(predictions, expected_sets):
    exact_matches = 0
    true_positive = 0
    false_positive = 0
    false_negative = 0

    for predicted, expected in zip(predictions, expected_sets):
        if predicted == expected:
            exact_matches += 1

        true_positive += len(predicted & expected)
        false_positive += len(predicted - expected)
        false_negative += len(expected - predicted)

    total = len(expected_sets)

    accuracy = exact_matches / total if total else 0

    precision = (
        true_positive / (true_positive + false_positive)
        if true_positive + false_positive else 0
    )

    recall = (
        true_positive / (true_positive + false_negative)
        if true_positive + false_negative else 0
    )

    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "false_positives": false_positive,
        "missed_categories": false_negative,
    }


expected_sets = []
keyword_predictions = []
hybrid_predictions = []

print("\nEvaluating examples...")

for row in rows:
    text = row["text"]
    expected = expected_categories(row["label"])

    # Existing keyword-only engine
    keyword_results = detect_triggers(text)
    keyword_categories = {
        trigger["category"]
        for trigger in keyword_results
    }

    # Hybrid engine
    hybrid_result = hybrid_engine.analyze(text)

    # Combine explicit keyword matches and semantic candidates
    combined_categories = (
        set(hybrid_result["detected_categories"])
        | set(hybrid_result["possible_categories"])
    )

    expected_sets.append(expected)
    keyword_predictions.append(keyword_categories)
    hybrid_predictions.append(combined_categories)

    print(f"\nJournal: {text}")
    print(f"Expected: {sorted(expected) if expected else ['NONE']}")
    print(f"Keyword:  {sorted(keyword_categories) if keyword_categories else ['NONE']}")
    print(f"Hybrid:   {sorted(combined_categories) if combined_categories else ['NONE']}")

# Error analysis for the hybrid engine
print("\n" + "=" * 55)
print("HYBRID ENGINE ERROR ANALYSIS")
print("=" * 55)

for index, row in enumerate(rows):
    expected = expected_sets[index]
    predicted = hybrid_predictions[index]

    false_positives = predicted - expected
    missed = expected - predicted

    if false_positives or missed:
        print(f"\nJournal: {row['text']}")
        print(f"Expected: {sorted(expected) if expected else ['NONE']}")
        print(f"Predicted: {sorted(predicted) if predicted else ['NONE']}")

        if false_positives:
            print("False positives:", sorted(false_positives))

        if missed:
            print("Missed categories:", sorted(missed))

# Calculate metrics for both approaches
keyword_metrics = calculate_metrics(
    keyword_predictions, expected_sets
)

hybrid_metrics = calculate_metrics(
    hybrid_predictions, expected_sets
)

print("\n" + "=" * 55)
print("FINAL COMPARISON")
print("=" * 55)

for name, metrics in [
    ("Keyword-only", keyword_metrics),
    ("Hybrid", hybrid_metrics),
]:
    print(f"\n{name}:")
    print(f"  Exact-match accuracy: {metrics['accuracy']:.1%}")
    print(f"  Precision:            {metrics['precision']:.1%}")
    print(f"  Recall:               {metrics['recall']:.1%}")
    print(f"  False positives:      {metrics['false_positives']}")
    print(f"  Missed categories:    {metrics['missed_categories']}")

print("\nEvaluation complete. Dataset and journal entries were not modified.")
