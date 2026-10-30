
from app.semantic_engine import SemanticEngine

engine = SemanticEngine()

examples = [
    "The sound of people talking made it difficult to think.",
    "Several people talking at once felt overwhelming.",
    "I rehearsed every sentence before talking to my colleagues.",
    "I changed how I spoke to avoid standing out in the group.",
]

for text in examples:
    print("\nJournal:", text)

    scores = engine.get_similarity_scores(text)

    for category, score in sorted(
        scores.items(),
        key=lambda item: item[1],
        reverse=True
    ):
        print(f"{category}: {score}")
