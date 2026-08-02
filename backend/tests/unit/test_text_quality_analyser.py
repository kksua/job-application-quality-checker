from app.services.text_quality_analyser import (
    extract_words,
    find_repeated_words,
    find_vague_phrases,
)


def test_find_vague_phrases_returns_detected_phrases() -> None:
    text = "I am a hard-working team player who was responsible for various tasks."

    result = find_vague_phrases(text)

    assert result == [
        "hard-working",
        "responsible for",
        "team player",
        "various tasks",
    ]


def test_find_vague_phrases_returns_empty_list() -> None:
    text = "Built a FastAPI service that reduced manual review time by 60%."

    result = find_vague_phrases(text)

    assert result == []


def test_extract_words_ignores_short_words() -> None:
    result = extract_words("Built an API with React and Python")

    assert result == ["built", "with", "react", "python"]


def test_find_repeated_words_returns_frequent_words() -> None:
    text = (
        "Developed a Python API. Python was used for automation. "
        "The Python service reduced manual work."
    )

    result = find_repeated_words(text)

    assert result == {"python": 3}


def test_find_repeated_words_ignores_stop_words() -> None:
    text = (
        "Experience with Python using React. "
        "Experience with Python using React. "
        "Experience with Python using React."
    )

    result = find_repeated_words(text)

    assert result == {
        "python": 3,
        "react": 3,
    }
