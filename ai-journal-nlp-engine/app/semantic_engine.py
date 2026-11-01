import os
from sentence_transformers import SentenceTransformer
from sentence_transformers.util import cos_sim

LOCAL_EMBEDDING_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "../models/hub/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/1110a243fdf4706b3f48f1d95db1a4f5529b4d41",
    )
)
DEFAULT_MODEL_NAME = (
    LOCAL_EMBEDDING_DIR
    if os.path.isdir(LOCAL_EMBEDDING_DIR)
    else "sentence-transformers/all-MiniLM-L6-v2"
)

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
    def __init__(self, model_name=None):
        target_model = model_name or DEFAULT_MODEL_NAME
        self.model = SentenceTransformer(target_model)

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
