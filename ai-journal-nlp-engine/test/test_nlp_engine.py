
from app.nlp_engine import detect_triggers


def test_sensory_trigger():
    result = detect_triggers(
        "The office lights were too bright."
    )

    assert any(
        item["category"] == "SENSORY"
        for item in result
    )


def test_executive_trigger():
    result = detect_triggers(
        "My deadline is tomorrow."
    )

    assert any(
        item["category"] == "EXECUTIVE"
        for item in result
    )


def test_social_trigger():
    result = detect_triggers(
        "I was nervous during the meeting."
    )

    assert any(
        item["category"] == "SOCIAL_MASKING"
        for item in result
    )


def test_no_trigger():
    result = detect_triggers(
        "I ate an apple for breakfast."
    )

    assert result == []


def test_flickered_variant():
    result = detect_triggers(
        "The lights flickered yesterday."
    )

    assert any(
        item["category"] == "SENSORY"
        for item in result
    )


def test_multiple_categories():
    result = detect_triggers(
        "The loud noise distracted me before my meeting."
    )

    categories = {
        item["category"] for item in result
    }

    assert "SENSORY" in categories
    assert "EXECUTIVE" in categories
    assert "SOCIAL_MASKING" in categories


# New tests

def test_brain_felt_fried():
    result = detect_triggers(
        "My brain felt fried after work."
    )

    assert any(
        item["phrase"] == "brain felt fried"
        and item["category"] == "EXECUTIVE"
        for item in result
    )


def test_couldnt_get_anything_done():
    result = detect_triggers(
        "I couldn't get anything done today."
    )

    assert any(
        item["phrase"] == "couldn't get anything done"
        and item["category"] == "EXECUTIVE"
        for item in result
    )


def test_multiword_sensory_phrase():
    result = detect_triggers(
        "The overlapping voices were distracting."
    )

    assert any(
        item["phrase"] == "overlapping voices"
        and item["category"] == "SENSORY"
        for item in result
    )


def test_unrelated_sentence_stays_empty():
    result = detect_triggers(
        "I enjoyed reading a book in the garden."
    )

    assert result == []
