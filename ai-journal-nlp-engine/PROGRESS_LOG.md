# PROGRESS_LOG.md
_Session continuation log — read this first before analyzing project state._

---

## Session 1 — 2026-10-29

### What was done
1. **Full repository inspection** — read all source files, checked existing tests, identified installed packages, located existing CSVs.
2. **Pre-session test run** — 10/10 tests in `test/test_nlp_engine.py` passed.
3. **Wrote `PROJECT_STATUS.md`** — documents all components, gaps, and remaining tasks.
4. **Created `requirements.txt`** — pinned key package versions.
5. **Created `docs/annotation_guidelines.md`** — formal annotation rules for all labels.
6. **Created `data/trigger_benchmark.csv`** — 100 controlled examples (SENSORY/EXECUTIVE/SOCIAL_MASKING/NONE/REVIEW/multi-label).
7. **Created `scripts/evaluate.py`** — reproducible multi-label evaluation with per-category metrics, NONE performance, REVIEW count, per-example CSV output.
8. **Extended `test/test_hybrid_engine.py`** — new test file covering HybridEngine, NONE, empty/malformed input, output schema, multi-label, consistency.
9. **Ran benchmark evaluation** — results saved to `data/benchmark_results.csv`. Actual numbers:
   - Evaluated: 96 (4 REVIEW excluded)
   - Exact-match accuracy: 63/96 = **65.6%**
   - SENSORY: P=0.833 R=0.962 F1=**0.893**
   - EXECUTIVE: P=0.609 R=0.583 F1=**0.596**
   - SOCIAL_MASKING: P=0.710 R=0.846 F1=**0.772**
   - Macro F1: **0.754** | Micro F1: **0.762**
   - NONE detection: P=0.583 R=0.560 F1=**0.571**
   - FP category predictions: 23 | FN (missed): 15
   - Key finding: EXECUTIVE is the weakest category — low precision (many false positives from generic words like "transition", "late", "focus") and low recall. NONE detection is unreliable. SENSORY performs best.
10. **Updated `README.md`** — project overview, architecture, installation, usage, evaluation, limitations.

### Decisions frozen this session
- Engine baseline (taxonomy, nlp_engine, semantic_engine, hybrid_engine) is NOT modified.
- minimum_similarity = 0.20, minimum_margin = 0.05 remain unchanged.
- Category descriptions in semantic_engine.py remain unchanged.
- Supervised model decision deferred to after reviewing benchmark results.

### Known issues carried forward
- `data/evaluate.py`, `data/evaluate_hybrid.py`, `data/evaluate_semantic.py` still reference the non-existent `trigger_dataset.csv`; they are legacy scripts, left untouched.
- `test_multiple_categories` in the original test suite asserts SOCIAL_MASKING from "meeting" — this reflects keyword engine behavior, left as-is.

### Next session — what to do
1. **Read PROGRESS_LOG.md first** (this file).
2. Check `data/benchmark_results.csv` for actual metrics.
3. Decide supervised model: if benchmark shows systematic recall failures not explained by implementation bugs, implement TF-IDF + One-vs-Rest logistic regression (see §9 of handoff spec).
4. If implementing supervised model: use only benchmark training split, do NOT re-use evaluation examples as training data.
5. Run `.\venv\Scripts\python.exe -m pytest test\ -v` to confirm tests still pass before any changes.
6. Do NOT change thresholds or category descriptions speculatively.
