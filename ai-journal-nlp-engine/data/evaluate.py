
import csv
from pathlib import Path

from app.nlp_engine import detect_triggers


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASET_PATH = PROJECT_ROOT / "data" / "trigger_dataset.csv"

CATEGORIES = {
    "SENSORY",
    "EXECUTIVE",
    "SOCIAL_MASKING",
}


def get_predicted_categories(text):
    triggers = detect_triggers(text)

    return {
        trigger["category"]
        for trigger in triggers
        if trigger["category"] in CATEGORIES
    }


def evaluate():
    total = 0
    exact_matches = 0
    results = []

    with DATASET_PATH.open(
        "r", encoding="utf-8", newline=""
    ) as file:
        reader = csv.DictReader(file)

        for row in reader:
            text = row["text"]
            expected = {
                label.strip()
                for label in row["label"].split("|")
            }

            if "NONE" in expected:
                expected = set()

            predicted = get_predicted_categories(text)

            correct = expected == predicted

            total += 1
            exact_matches += int(correct)

            results.append({
                "text": text,
                "expected": expected,
                "predicted": predicted,
                "correct": correct,
            })

    print("\n--- EVALUATION RESULTS ---")

    for item in results:
        status = "PASS" if item["correct"] else "MISS"

        print(f"\n[{status}] {item['text']}")
        print("Expected:", item["expected"] or {"NONE"})
        print("Predicted:", item["predicted"] or {"NONE"})

    accuracy = exact_matches / total if total else 0

    print("\n--- SUMMARY ---")
    print(f"Total examples: {total}")
    print(f"Exact matches: {exact_matches}")
    print(f"Exact-set accuracy: {accuracy:.2%}")


if __name__ == "__main__":
    evaluate()
