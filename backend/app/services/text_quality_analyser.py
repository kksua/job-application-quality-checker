import re
from collections import Counter

VAGUE_PHRASES = {
    "hard working",
    "hard-working",
    "team player",
    "results driven",
    "detail oriented",
    "good communication skills",
    "excellent communication skills",
    "responsible for",
    "worked on",
    "helped with",
    "various tasks",
    "multiple projects",
}

STOP_WORDS = {
    "about",
    "after",
    "also",
    "been",
    "being",
    "from",
    "have",
    "into",
    "more",
    "that",
    "their",
    "them",
    "then",
    "there",
    "these",
    "they",
    "this",
    "using",
    "very",
    "were",
    "with",
    "worked",
    "experience",
}


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def find_vague_phrases(text: str) -> list[str]:
    normalized_text = normalize_text(text)

    return sorted(phrase for phrase in VAGUE_PHRASES if phrase in normalized_text)


def extract_words(text: str) -> list[str]:
    return re.findall(r"\b[a-zA-Z]{4,}\b", text.lower())


def find_repeated_words(
    text: str,
    minimum_count: int = 3,
) -> dict[str, int]:
    words = extract_words(text)
    counts = Counter(word for word in words if word not in STOP_WORDS)

    return {
        word: count for word, count in sorted(counts.items()) if count >= minimum_count
    }
