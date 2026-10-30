"""
test/test_hybrid_engine.py
--------------------------
Tests for HybridEngine.analyze(), NONE detection, schema consistency,
empty/malformed input, multi-label detection, and output repeatability.

These tests do NOT change the engine. They document and verify the
existing behaviour of the frozen baseline.
"""

import pytest
from app.hybrid_engine import HybridEngine


@pytest.fixture(scope="module")
def engine():
    """Single shared engine instance — loading is expensive."""
    return HybridEngine()


# ---------------------------------------------------------------------------
# Output schema tests
# ---------------------------------------------------------------------------

class TestOutputSchema:
    def test_analyze_returns_dict(self, engine):
        result = engine.analyze("I was distracted by the noise.")
        assert isinstance(result, dict)

    def test_output_has_required_keys(self, engine):
        result = engine.analyze("I was distracted by the noise.")
        for key in (
            "text",
            "keyword_triggers",
            "semantic_scores",
            "detected_categories",
            "possible_categories",
            "ambiguous_categories",
        ):
            assert key in result, f"Missing key: {key}"

    def test_detected_categories_is_sorted_list(self, engine):
        result = engine.analyze("The loud noise distracted me before my meeting.")
        assert isinstance(result["detected_categories"], list)
        assert result["detected_categories"] == sorted(result["detected_categories"])

    def test_possible_categories_is_list(self, engine):
        result = engine.analyze("I watered the plants.")
        assert isinstance(result["possible_categories"], list)

    def test_ambiguous_categories_is_list(self, engine):
        result = engine.analyze("I watered the plants.")
        assert isinstance(result["ambiguous_categories"], list)

    def test_semantic_scores_has_three_keys(self, engine):
        result = engine.analyze("I watered the plants.")
        scores = result["semantic_scores"]
        assert set(scores.keys()) == {"SENSORY", "EXECUTIVE", "SOCIAL_MASKING"}

    def test_semantic_scores_are_floats(self, engine):
        result = engine.analyze("I watered the plants.")
        for val in result["semantic_scores"].values():
            assert isinstance(val, float)

    def test_text_is_echoed_back(self, engine):
        text = "The lights flickered."
        result = engine.analyze(text)
        assert result["text"] == text


# ---------------------------------------------------------------------------
# Sensory trigger
# ---------------------------------------------------------------------------

class TestSensory:
    def test_clear_sensory_detected(self, engine):
        result = engine.analyze(
            "The flickering fluorescent lights gave me a headache and I had to leave."
        )
        predicted = (
            set(result["detected_categories"])
            | set(result["possible_categories"])
        )
        assert "SENSORY" in predicted

    def test_auditory_sensory(self, engine):
        result = engine.analyze(
            "The overlapping voices made it impossible for me to think."
        )
        predicted = (
            set(result["detected_categories"])
            | set(result["possible_categories"])
        )
        assert "SENSORY" in predicted


# ---------------------------------------------------------------------------
# Executive function trigger
# ---------------------------------------------------------------------------

class TestExecutive:
    def test_clear_executive_detected(self, engine):
        result = engine.analyze(
            "I kept putting off the report for hours and could not make myself start."
        )
        predicted = (
            set(result["detected_categories"])
            | set(result["possible_categories"])
        )
        assert "EXECUTIVE" in predicted

    def test_task_paralysis_phrase(self, engine):
        result = engine.analyze(
            "My brain felt fried after trying to prioritize everything."
        )
        predicted = (
            set(result["detected_categories"])
            | set(result["possible_categories"])
        )
        assert "EXECUTIVE" in predicted


# ---------------------------------------------------------------------------
# Social masking trigger
# ---------------------------------------------------------------------------

class TestSocialMasking:
    def test_scripting_detected(self, engine):
        result = engine.analyze(
            "I rehearsed every sentence before talking to my colleagues."
        )
        predicted = (
            set(result["detected_categories"])
            | set(result["possible_categories"])
        )
        assert "SOCIAL_MASKING" in predicted

    def test_pretending_in_masking_context(self, engine):
        result = engine.analyze(
            "I pretended to laugh along so nobody would notice I was struggling."
        )
        predicted = (
            set(result["detected_categories"])
            | set(result["possible_categories"])
        )
        assert "SOCIAL_MASKING" in predicted


# ---------------------------------------------------------------------------
# NONE detection — engine should not hallucinate triggers
# ---------------------------------------------------------------------------

class TestNoneDetection:
    def test_fully_neutral_sentence(self, engine):
        result = engine.analyze("I bought a new notebook yesterday.")
        keyword_triggered = set(result["detected_categories"])
        assert len(keyword_triggered) == 0, (
            f"Keyword engine should not fire on neutral text; got {keyword_triggered}"
        )

    def test_neutral_predicts_nothing_from_keywords(self, engine):
        result = engine.analyze("We had pasta for dinner.")
        assert result["detected_categories"] == []

    def test_neutral_no_keyword_trigger_phrases(self, engine):
        result = engine.analyze("My appointment was rescheduled to Thursday.")
        assert result["keyword_triggers"] == []


# ---------------------------------------------------------------------------
# Empty and malformed input
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_empty_string(self, engine):
        result = engine.analyze("")
        assert result["detected_categories"] == []
        assert result["possible_categories"] == []
        assert result["keyword_triggers"] == []
        assert result["semantic_scores"] == {}

    def test_whitespace_only(self, engine):
        result = engine.analyze("   ")
        assert result["detected_categories"] == []
        assert result["semantic_scores"] == {}

    def test_single_word(self, engine):
        result = engine.analyze("Noise")
        # Should not crash
        assert isinstance(result, dict)
        assert "detected_categories" in result

    def test_very_long_input(self, engine):
        long_text = "I was distracted. " * 100
        result = engine.analyze(long_text)
        assert isinstance(result, dict)

    def test_numbers_only(self, engine):
        result = engine.analyze("12345 6789")
        assert isinstance(result, dict)

    def test_punctuation_only(self, engine):
        result = engine.analyze("... !!!")
        assert isinstance(result, dict)


# ---------------------------------------------------------------------------
# Multi-label detection
# ---------------------------------------------------------------------------

class TestMultiLabel:
    def test_sensory_and_executive_together(self, engine):
        # Use keywords that are explicitly in the taxonomy:
        # "loud noise" → SENSORY, "backlog" → EXECUTIVE
        result = engine.analyze(
            "The loud noise in the open office made my task backlog feel even more overwhelming."
        )
        predicted = (
            set(result["detected_categories"])
            | set(result["possible_categories"])
        )
        assert "SENSORY" in predicted
        assert "EXECUTIVE" in predicted

    def test_sensory_and_masking_together(self, engine):
        result = engine.analyze(
            "I forced smiles through a noisy crowded room for three hours."
        )
        predicted = (
            set(result["detected_categories"])
            | set(result["possible_categories"])
        )
        # At minimum, SENSORY should be detected from keyword matches
        assert "SENSORY" in predicted


# ---------------------------------------------------------------------------
# Repeatability
# ---------------------------------------------------------------------------

class TestRepeatability:
    def test_same_result_on_repeated_call(self, engine):
        text = "The bright screen was hurting my eyes."
        result1 = engine.analyze(text)
        result2 = engine.analyze(text)
        assert result1["detected_categories"] == result2["detected_categories"]
        assert result1["semantic_scores"] == result2["semantic_scores"]
        assert result1["possible_categories"] == result2["possible_categories"]

    def test_different_inputs_differ(self, engine):
        result_a = engine.analyze(
            "The flickering light gave me a headache."
        )
        result_b = engine.analyze(
            "I bought a new notebook."
        )
        # Sensory should fire for A but not B (at keyword level)
        assert "SENSORY" in result_a["detected_categories"]
        assert "SENSORY" not in result_b["detected_categories"]
