# AI Journal NLP Engine

A hybrid trigger-detection engine for neurodivergent journal entries. It analyses free-text journal
sentences and identifies three categories of potential triggers:

| Category | Description |
|----------|-------------|
| **SENSORY** | Distress caused by sensory stimuli (loud sounds, bright lights, rough textures, strong smells, crowded spaces) |
| **EXECUTIVE** | Difficulty with task initiation, planning, organising, prioritising, time management, or task completion |
| **SOCIAL_MASKING** | Deliberately hiding, suppressing, or modifying natural behaviour to conform to social expectations |

The engine also recognises:
- **NONE** — no trigger is supported by the text.
- **REVIEW** — the sentence is ambiguous or lacks sufficient context for confident labelling (annotation status only; not a trigger category).

---

## Architecture

```
app/
├── taxonomy.py          # TRIGGER_TAXONOMY: keyword lists for each category
├── nlp_engine.py        # spaCy PhraseMatcher + lemma fallback → keyword triggers
├── semantic_engine.py   # SentenceTransformer (all-MiniLM-L6-v2) → cosine similarity scores
├── hybrid_engine.py     # Combines keyword matches + semantic scores → final result
└── coping_rules.py      # Independent burnout cue detection + coping strategy generation
```

### Component responsibilities

**`nlp_engine.py` — Keyword engine**
Uses spaCy `PhraseMatcher` (case-insensitive) to match taxonomy phrases exactly.
Falls back to lemma comparison for single-word variations (e.g., "flickered" matches "flickering").
Returns a list of `{phrase, category}` dicts.

**`semantic_engine.py` — Semantic engine**
Encodes three hand-crafted category descriptions using `sentence-transformers/all-MiniLM-L6-v2`.
At inference time, encodes the input sentence and computes cosine similarity against each description.
Returns `{SENSORY: float, EXECUTIVE: float, SOCIAL_MASKING: float}`.

> **Important:** The semantic model is a general pretrained sentence encoder. It has **not** been
> fine-tuned on our trigger dataset. Cosine similarity scores are **not** calibrated probabilities.

**`hybrid_engine.py` — Decision layer**
- Any category matched by keyword → `detected_categories`
- Semantic: if best score ≥ `minimum_similarity` (0.20) and margin over second-best ≥ `minimum_margin` (0.05) → `possible_categories`
- Semantic: if best score ≥ threshold but margin is small → `ambiguous_categories`
- Primary prediction = `detected_categories` ∪ `possible_categories`

---

## Installation

```bash
# Clone / navigate to the engine directory
cd ai-journal-nlp-engine

# Create and activate a virtual environment (Python 3.10+)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

The spaCy model is pinned in `requirements.txt` as a direct URL dependency and will be
installed automatically.

---

## Running the engine

```python
from app.hybrid_engine import HybridEngine

engine = HybridEngine()
result = engine.analyze("The overlapping voices made it impossible to focus on anything.")

print(result["detected_categories"])   # keyword matches
print(result["possible_categories"])   # semantic candidates
print(result["semantic_scores"])       # raw cosine similarities
print(result["keyword_triggers"])      # matched phrases with their categories
```

### Output schema

```json
{
  "text": "<original input>",
  "keyword_triggers": [{"phrase": "overlapping voices", "category": "SENSORY"}],
  "semantic_scores": {
    "SENSORY": 0.412,
    "EXECUTIVE": 0.231,
    "SOCIAL_MASKING": 0.187
  },
  "detected_categories": ["SENSORY"],
  "possible_categories": [],
  "ambiguous_categories": []
}
```

---

## Running the tests

```bash
# From ai-journal-nlp-engine/
venv\Scripts\python.exe -m pytest test\ -v
```

Test files:
- `test/test_nlp_engine.py` — 10 keyword-engine tests
- `test/test_hybrid_engine.py` — 30+ hybrid engine, schema, NONE, edge-case, and repeatability tests

---

## Running the evaluation

```bash
# From ai-journal-nlp-engine/
venv\Scripts\python.exe scripts/evaluate.py
```

The script:
1. Loads `data/trigger_benchmark.csv` (100 controlled examples).
2. Runs the frozen hybrid engine without modifying any configuration.
3. Prints per-category precision, recall, and F1; micro and macro averages; exact-match accuracy; NONE performance; and REVIEW example count.
4. Saves per-example results to `data/benchmark_results.csv`.

---

## Benchmark and evaluation results

### Baseline results on controlled benchmark

> ⚠️ Results are on a **controlled synthetic benchmark only**. See limitations below.

| Metric | Value |
|--------|-------|
| Examples evaluated | 96 (4 REVIEW excluded) |
| Exact-match accuracy | 65.6% |
| **SENSORY F1** | **0.893** (P=0.833, R=0.962) |
| **EXECUTIVE F1** | **0.596** (P=0.609, R=0.583) |
| **SOCIAL_MASKING F1** | **0.772** (P=0.710, R=0.846) |
| Macro F1 | 0.754 |
| Micro F1 | 0.762 |
| NONE F1 | 0.571 (P=0.583, R=0.560) |
| FP category predictions | 23 |
| FN (missed) categories | 15 |

**Key observations:**
- SENSORY performs best — well-supported by specific, unambiguous taxonomy phrases.
- EXECUTIVE is the weakest — generic keywords (e.g., "late", "focus", "transition") cause both false positives and false negatives.
- NONE detection is unreliable (F1 0.571) — the engine has no explicit NONE path; it infers NONE by absence of detections, which fails when ambiguous keywords are present.
- These numbers cannot be extrapolated to real-world journal text.



### Limitations of these results

- The benchmark is **synthetic and controlled**. It was designed by the project team, not drawn from real-world journal entries.
- Gold labels were constructed according to `docs/annotation_guidelines.md` but have **not been independently verified** by a second annotator.
- Semantic similarity scores are **not calibrated probabilities**. Do not interpret them as confidence values.
- These results cannot be used to claim real-world performance. Real-world performance requires a separately collected, independently labelled dataset.

---

## Annotation guidelines

See [`docs/annotation_guidelines.md`](docs/annotation_guidelines.md) for the complete labelling rules used to construct the benchmark and for any future human annotation tasks.

---

## Known limitations

1. **Keyword over-triggering.** Generic words in the taxonomy (e.g., "meeting", "fabric", "noise") can produce false positives when the keyword appears in a non-trigger context. The semantic layer partially compensates for this but does not fully eliminate the problem.
2. **Semantic model not fine-tuned.** The `all-MiniLM-L6-v2` model was trained on general sentence-pair tasks, not on neurodivergent journal entries. Category descriptions are hand-crafted proxies.
3. **NONE detection is asymmetric.** The engine has no explicit NONE classification path; NONE is inferred from the absence of detections. This means the engine cannot confidently abstain when evidence is weak.
4. **No negation handling.** "I won't pretend to understand X" can match the "pretending" keyword even though it is a negated expression.
5. **Threshold tuning is frozen.** `minimum_similarity` and `minimum_margin` have not been optimised against a verified dataset. They represent a reasonable starting point, not a calibrated operating point.

---

## Future improvements (evidence-required before implementing)

- Collect and independently verify a real-world journal dataset.
- Evaluate a supervised TF-IDF + One-vs-Rest logistic regression classifier against the frozen baseline using the same benchmark.
- Add negation detection to the keyword engine.
- Fine-tune a sentence encoder on verified trigger examples if sufficient labelled data exists.

---

## Project structure

```
ai-journal-nlp-engine/
├── app/                              # Core engine modules
├── data/
│   ├── trigger_benchmark.csv         # Controlled evaluation benchmark (100 examples)
│   ├── benchmark_results.csv         # Per-example evaluation output (generated)
│   ├── trigger_model_check_validation_pilot.csv   # Legacy biased pilot (do not treat as ground truth)
│   └── trigger_model_check_results.csv            # Legacy pilot results
├── docs/
│   └── annotation_guidelines.md     # Labelling rules
├── scripts/
│   └── evaluate.py                   # Reproducible evaluation script
├── test/
│   ├── test_nlp_engine.py            # Keyword engine tests
│   └── test_hybrid_engine.py         # Hybrid engine + edge-case tests
├── PROJECT_STATUS.md                 # Inspection report and task tracker
├── PROGRESS_LOG.md                   # Session-by-session progress log
├── requirements.txt
└── README.md
```
