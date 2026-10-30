import pandas as pd
from app.hybrid_engine import HybridEngine

DATASET_PATH = "data/trigger_model_check_validation_pilot.csv"

def parse_labels(value):
    if pd.isna(value) or not str(value).strip():
        return set()
    return {item.strip() for item in str(value).split("|") if item.strip()}

def main():
    df = pd.read_csv(DATASET_PATH)
    engine = HybridEngine()

    exact_correct = 0
    expected_total = 0
    predicted_total = 0
    true_positive = 0
    false_positive = 0
    false_negative = 0
    details = []

    for _, row in df.iterrows():
        expected = parse_labels(row["label"])
        result = engine.analyze(str(row["text"]))
        predicted = set(result.get("detected_categories", []))
        predicted |= set(result.get("possible_categories", []))

        exact = expected == predicted
        exact_correct += int(exact)
        true_positive += len(expected & predicted)
        false_positive += len(predicted - expected)
        false_negative += len(expected - predicted)
        expected_total += len(expected)
        predicted_total += len(predicted)

        details.append({
            "text": row["text"],
            "expected": "|".join(sorted(expected)) or "NONE",
            "predicted": "|".join(sorted(predicted)) or "NONE",
            "exact_match": exact,
            "semantic_scores": str(result.get("semantic_scores", {})),
            "source_class": row.get("source_class", "")
        })

    precision = true_positive / predicted_total if predicted_total else 0.0
    recall = true_positive / expected_total if expected_total else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0
    accuracy = exact_correct / len(df) if len(df) else 0.0

    print(f"Examples evaluated: {len(df)}")
    print(f"Exact-match accuracy: {accuracy:.1%}")
    print(f"Category precision:   {precision:.1%}")
    print(f"Category recall:      {recall:.1%}")
    print(f"Category F1:          {f1:.1%}")
    print(f"False-positive category predictions: {false_positive}")
    print(f"Missed category predictions:         {false_negative}")
    print("\nWARNING: This is a lexical-candidate pilot, not independently verified ground truth.")
    print("The set contains positive trigger candidates only; it cannot reliably measure NONE detection.")
    pd.DataFrame(details).to_csv("data/trigger_model_check_results.csv", index=False)
    print("Detailed results saved to data/trigger_model_check_results.csv")

if __name__ == "__main__":
    main()
