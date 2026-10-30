
from sentence_transformers import SentenceTransformer
from sentence_transformers.util import cos_sim



CATEGORIES = {
    "SENSORY": (
        "Physical or sensory discomfort caused by environmental "
        "stimuli such as loud sounds, background conversations, "
        "multiple people talking simultaneously, bright lights, "
        "strong smells, rough textures, or crowded noisy spaces. "
        "The person feels overwhelmed by what they hear, see, "
        "smell, or physically feel."
    ),

    "EXECUTIVE": (
        "Difficulty initiating tasks, switching between tasks, "
        "planning, organizing, prioritizing, managing time, "
        "meeting deadlines, maintaining focus, or completing work. "
        "The person struggles to decide what to do or how to do it."
    ),

    "SOCIAL_MASKING": (
        "Consciously hiding one's natural behaviour or discomfort "
        "to fit into social situations. Examples include rehearsing "
        "conversations, monitoring facial expressions, pretending "
        "to understand jokes, copying other people's behaviour, "
        "changing one's speech to avoid standing out, and forcing "
        "oneself to appear cheerful or socially comfortable."
    ),
}


class SemanticEngine:
    def __init__(self):
        self.model = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

        self.category_names = list(CATEGORIES.keys())

        descriptions = list(CATEGORIES.values())

        self.category_embeddings = self.model.encode(
            descriptions,
            convert_to_tensor=True
        )

    def get_similarity_scores(self, text):
        if not text or not text.strip():
            return {}

        embedding = self.model.encode(
            text,
            convert_to_tensor=True
        )

        scores = cos_sim(
            embedding,
            self.category_embeddings
        )[0]

        return {
            category: round(scores[index].item(), 3)
            for index, category in enumerate(
                self.category_names
            )
        }


if __name__ == "__main__":
    engine = SemanticEngine()

    example = "Everything felt like too much to handle today."

    print("Journal:", example)
    print("Similarity scores:")
    print(engine.get_similarity_scores(example))
