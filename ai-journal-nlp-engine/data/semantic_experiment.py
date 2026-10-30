
from sentence_transformers import SentenceTransformer
from sentence_transformers.util import cos_sim

print("Loading model...")
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# Representative descriptions of our trigger categories
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
    )
}

# Example journal entries to test
journal_entries = [
    "The harsh lighting hurt my eyes.",
    "Everything felt like too much to handle today.",
    "I pretended to understand the joke so I could fit in.",
    "I watered the plants this morning."
]

# Starting threshold for experimentation (not validated)
THRESHOLD = 0.30

# Encode category descriptions once
category_names = list(categories.keys())
category_descriptions = list(categories.values())

category_embeddings = model.encode(
    category_descriptions,
    convert_to_tensor=True
)

# Compare each journal entry with every category
for entry in journal_entries:
    entry_embedding = model.encode(
        entry,
        convert_to_tensor=True
    )

    scores = cos_sim(entry_embedding, category_embeddings)[0]

    print("\nJournal:", entry)
    print("Category similarity scores:")

    for index, category in enumerate(category_names):
        print(f"  {category}: {scores[index].item():.3f}")

    best_index = scores.argmax().item()
    best_score = scores[best_index].item()

    if best_score >= THRESHOLD:
        print("Potential trigger:", category_names[best_index])
        print(f"Similarity: {best_score:.3f}")
    else:
        print("No confident category match")
        print(f"Best similarity: {best_score:.3f}")
