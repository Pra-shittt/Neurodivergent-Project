
from app.nlp_engine import detect_triggers
from app.semantic_engine import SemanticEngine


class HybridEngine:
    def __init__(self):
        self.semantic_engine = SemanticEngine()

        self.minimum_similarity = 0.20
        self.minimum_margin = 0.05

    def analyze(self, text):
        # Explicit keyword detections are preserved
        keyword_triggers = detect_triggers(text)

        semantic_scores = (
            self.semantic_engine.get_similarity_scores(text)
        )

        detected_categories = {
            trigger["category"]
            for trigger in keyword_triggers
        }

        # Sort semantic categories by score, highest first
        ranked_categories = sorted(
            semantic_scores.items(),
            key=lambda item: item[1],
            reverse=True
        )

        possible_categories = set()
        ambiguous_categories = set()

        if ranked_categories:
            best_category, best_score = ranked_categories[0]

            second_score = (
                ranked_categories[1][1]
                if len(ranked_categories) > 1
                else 0.0
            )

            margin = best_score - second_score

            if best_score >= self.minimum_similarity:
                if margin >= self.minimum_margin:
                    # Stronger separation: add the best category
                    if best_category not in detected_categories:
                        possible_categories.add(best_category)
                else:
                    # Close scores: preserve both as ambiguous candidates
                    for category, score in ranked_categories:
                        if (
                            score >= self.minimum_similarity
                            and category not in detected_categories
                        ):
                            ambiguous_categories.add(category)

        return {
            "text": text,
            "keyword_triggers": keyword_triggers,
            "semantic_scores": semantic_scores,
            "detected_categories": sorted(detected_categories),
            "possible_categories": sorted(possible_categories),
            "ambiguous_categories": sorted(ambiguous_categories),
        }


if __name__ == "__main__":
    engine = HybridEngine()

    examples = [
        "The constant buzzing made it hard to concentrate.",
        "I rehearsed every sentence before talking to my colleagues.",
        "Everything felt like too much to handle today.",
        "I watered the plants this morning.",
    ]

    for example in examples:
        result = engine.analyze(example)

        print("\n" + "=" * 55)
        print("Journal:", result["text"])
        print("Keyword detections:", result["detected_categories"])
        print("Semantic scores:", result["semantic_scores"])
        print("Possible categories:", result["possible_categories"])
        print("Ambiguous categories:", result["ambiguous_categories"])
