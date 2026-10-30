# PROJECT_STATUS.md
_Last updated: 2026-10-29_

---

## 1. Existing Components

| File | Location | Purpose |
|------|-----------|---------|
| `taxonomy.py` | `app/` | TRIGGER_TAXONOMY dict — keyword lists for SENSORY, EXECUTIVE, SOCIAL_MASKING |
| `nlp_engine.py` | `app/` | spaCy PhraseMatcher + lemma fallback; `detect_triggers(text)` |
| `semantic_engine.py` | `app/` | SentenceTransformer `all-MiniLM-L6-v2`; `get_similarity_scores(text)` |
| `hybrid_engine.py` | `app/` | Combines keyword + semantic; `analyze(text)` → structured result dict |
| `coping_rules.py` | `app/` | Burnout cue detection + coping strategy generation (rule-based) |
| `test_nlp_engine.py` | `test/` | 10 pytest tests covering keyword engine only |
| `evaluate_trigger_validation_pilot.py` | root | Runs hybrid engine against biased pilot CSV |
| `evaluate.py` | `data/` | Older keyword-only evaluator (expects missing `trigger_dataset.csv`) |
| `evaluate_hybrid.py` | `data/` | Older hybrid evaluator (expects missing `trigger_dataset.csv`) |
| `evaluate_semantic.py` | `data/` | Threshold sweep semantic-only (expects missing `trigger_dataset.csv`) |
| `trigger_model_check_validation_pilot.csv` | `data/` | 104 lexical-candidate sentences (biased pilot) |
| `trigger_model_check_results.csv` | `data/` | Engine predictions on the pilot (not ground truth) |

### Installed packages (venv)
- Python 3.14.3, spacy 3.8.16 + en_core_web_sm 3.8.0
- sentence-transformers 6.2.0, torch 2.14.1
- pandas 3.1.0, pytest 9.1.1, scikit-learn (present)

### Missing files
- `requirements.txt` — not present
- `trigger_dataset.csv` — referenced by 3 scripts but does not exist
- `docs/annotation_guidelines.md` — not present
- `data/trigger_benchmark.csv` — not present
- `scripts/evaluate.py` — not present
- Full `README.md` — placeholder only

---

## 2. Working Functionality

- Keyword detection (phrase matching + lemma fallback) — all 10 tests pass
- Semantic scoring — loads and runs correctly
- Hybrid analysis — returns structured dict
- Burnout/coping module — independent, works correctly
- Pilot evaluator — runs end-to-end on the pilot CSV

---

## 3. Known Bugs and Gaps

| # | Issue | Severity |
|---|-------|----------|
| 1 | Three evaluation scripts expect missing `trigger_dataset.csv` — crash on import | High |
| 2 | No `requirements.txt` | Medium |
| 3 | `test_multiple_categories` asserts SOCIAL_MASKING from "meeting" alone | Medium |
| 4 | No tests for `HybridEngine.analyze()` | Medium |
| 5 | No NONE, empty, schema-consistency, or ambiguous-input tests | Medium |
| 6 | README is a single-line placeholder | Low |

---

## 4. Test Coverage (Before This Session)

10 tests, all pass. Cover: `nlp_engine.detect_triggers()` only.
Not covered: `SemanticEngine`, `HybridEngine`, NONE detection, empty/malformed input, output schema, ambiguous inputs, multi-label via hybrid, repeatability.

---

## 5. Reliability Caveat on Previous Metrics

Reported 64.4% accuracy / 83.5% precision / 73.1% recall / 77.9% F1 were measured against a biased, lexical-candidate-only pilot with no NONE examples and auto-generated weak labels. **These must not be presented as proof of real-world performance.**

---

## 6. Remaining Tasks

| Priority | Task | Status |
|----------|------|--------|
| 1 | `requirements.txt` | Done (this session) |
| 2 | `docs/annotation_guidelines.md` | Done (this session) |
| 3 | `data/trigger_benchmark.csv` (80-120 controlled examples) | Done (this session) |
| 4 | `scripts/evaluate.py` (multi-label, per-category, NONE, REVIEW) | Done (this session) |
| 5 | Extended tests: HybridEngine, NONE, empty, schema, multi-label | Done (this session) |
| 6 | Full `README.md` | Done (this session) |
| 7 | Run benchmark + record results | Done (this session) |
| 8 | Decide on supervised model from benchmark evidence | Pending review |
