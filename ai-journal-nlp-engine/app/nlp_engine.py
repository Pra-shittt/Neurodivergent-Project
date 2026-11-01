
import spacy
from spacy.matcher import PhraseMatcher

from app.taxonomy import TRIGGER_TAXONOMY


nlp = spacy.load("en_core_web_sm")

# Exact phrase matching, case-insensitive
matcher = PhraseMatcher(nlp.vocab, attr="LOWER")

for category, keywords in TRIGGER_TAXONOMY.items():
    patterns = [
        nlp.make_doc(keyword.lower())
        for keyword in keywords
    ]
    matcher.add(category, patterns)


# Store lemmas for single-word variation matching
SINGLE_WORD_LEMMAS = {}

for category, keywords in TRIGGER_TAXONOMY.items():
    for keyword in keywords:
        keyword_doc = nlp(keyword.lower())

        if len(keyword_doc) == 1:
            lemma = keyword_doc[0].lemma_
            SINGLE_WORD_LEMMAS.setdefault(
                (category, lemma), keyword
            )


def get_lemmas(text):
    doc = nlp(text.lower())

    return [
        token.lemma_
        for token in doc
        if not token.is_punct and not token.is_space
    ]


def detect_triggers(text):
    doc = nlp(text.lower())
    matches = matcher(doc)

    found = []
    seen = set()

    # First: exact single-word and multi-word phrase matches
    for match_id, start, end in matches:
        category = nlp.vocab.strings[match_id]
        phrase = doc[start:end].text

        key = (phrase, category)

        if key not in seen:
            found.append({
                "phrase": phrase,
                "category": category
            })
            seen.add(key)

    # Second: lemma fallback for single-word variations
    for token in doc:
        if token.is_punct or token.is_space:
            continue

        for category in TRIGGER_TAXONOMY:
            key = (category, token.lemma_)

            if key in SINGLE_WORD_LEMMAS:
                phrase_key = (token.text, category)

                if phrase_key not in seen:
                    found.append({
                        "phrase": token.text,
                        "category": category
                    })
                    seen.add(phrase_key)

    return found


def analyze_journal_text(transcript: str, ratings: dict):
    """Combine NLP triggers with user ratings.

    Args:
        transcript: The raw text from the audio transcription.
        ratings: Dictionary with keys `mood`, `sensory_overload`, `executive_function`,
                 and `masking_fatigue` (as used in the FastAPI endpoint).

    Returns:
        A dict containing:
            - `triggers`: list of detected trigger dicts (phrase & category).
            - `ratings`: echo of the supplied ratings.
    """
    triggers = detect_triggers(transcript)
    return {"triggers": triggers, "ratings": ratings}

if __name__ == "__main__":
    examples = [
        "The lights were flickering.",
        "The lights flickered yesterday.",
        "The room had overlapping voices and loud noise.",
        "My deadline changed before a meeting.",
        "I felt overwhelmed by the crowded office.",
        "I couldn't get anything done because my brain felt fried."
    ]

    for sentence in examples:
        print("\nJournal:", sentence)
        print("Lemmas:", get_lemmas(sentence))
        print("Detected triggers:")

        for trigger in detect_triggers(sentence):
            print(trigger)
