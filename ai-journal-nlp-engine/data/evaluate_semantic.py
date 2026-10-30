
import csv

from sentence_transformers import SentenceTransformer
from sentence_transformers.util import cos_sim

DATASET_PATH = "data/trigger_dataset.csv"

categories = {
    "SENSORY": (
        "Sensitivity to bright lights, loud noises, "
        "uncomfortable textures, smells, or sensory overload."
    ),
    "EXECUTIVE": (
        "Difficulty starting tasks, planning, organizing thoughts, "
        "managing deadlines, or concentrating."
    ),
    "SOCIAL_MASKING": (
        "Hiding discomfort, pretending to fit in, forcing social "
        "behaviour, or feeling exhausted after social interactions."
    ),
}

THRESHOLDS = [0.15, 0.20, 0.25, 0.30, 0.35]

print("Loading model...")
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

category_names = list(categories.keys())
category_descriptions = list(categories.values())

category_embeddings = model.encode(
    category_descriptions,
    convert_to_tensor=True
)

# Load the existing evaluation dataset
with open(DATASET_PATH, "r", encoding="utf-8-sig", newline="") as file:
    reader = csv.DictReader(file)
    rows = list(reader)

print(f"Loaded {len(rows)} examples.")

# Calculate semantic scores once for every journal entry
results = []

for row in rows:
    text = row["text"]
    expected = {
        label.strip()
        for label in row["label"].split("|")
        if label.strip() != "NONE"
    }

    entry_embedding = model.encode(
        text,
        convert_to_tensor=True
    )

    scores = cos_sim(
        entry_embedding,
        category_embeddings
    )[0]

    score_by_category = {
        category: scores[i].item()
        for i, category in enumerate(category_names)
    }

    results.append({
        "text": text,
        "expected": expected,
        "scores": score_by_category,
    })

# Evaluate different thresholds using exact category-set matches
for threshold in THRESHOLDS:
    exact_matches = 0
    true_positive = 0
    false_positive = 0
    false_negative = 0

    for result in results:
        predicted = {
            category
            for category, score in result["scores"].items()
            if score >= threshold
        }

        expected = result["expected"]

        if predicted == expected:
            exact_matches += 1

        true_positive += len(predicted & expected)
        false_positive += len(predicted - expected)
        false_negative += len(expected - predicted)

    total = len(results)
    accuracy = exact_matches / total if total else 0

    precision = (
        true_positive / (true_positive + false_positive)
        if true_positive + false_positive else 0
    )

    recall = (
        true_positive / (true_positive + false_negative)
        if true_positive + false_negative else 0
    )

    print(f"\n--- Threshold: {threshold:.2f} ---")
    print(f"Exact category-set accuracy: {accuracy:.1%}")
    print(f"Precision: {precision:.1%}")
    print(f"Recall: {recall:.1%}")
    print(f"False positives: {false_positive}")
    print(f"Missed categories: {false_negative}")

print("\nEvaluation complete. Journal entries were not modified.")
