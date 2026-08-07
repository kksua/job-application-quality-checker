from dataclasses import dataclass


@dataclass(frozen=True)
class CriterionScore:
    name: str
    score: float | None
    weight: float


@dataclass(frozen=True)
class WeightedScoreResult:
    final_score: int
    evaluated_weight: float
    total_weight: float


def calculate_weighted_score(
    criteria: list[CriterionScore],
) -> WeightedScoreResult:
    if not criteria:
        raise ValueError("At least one scoring criterion is required.")

    for criterion in criteria:
        if criterion.weight < 0:
            raise ValueError(f"Weight for '{criterion.name}' cannot be negative.")

        if criterion.score is not None and not 0 <= criterion.score <= 100:
            raise ValueError(f"Score for '{criterion.name}' must be between 0 and 100.")

    total_weight = sum(criterion.weight for criterion in criteria)

    if total_weight <= 0:
        raise ValueError("The total criterion weight must be greater than zero.")

    evaluated_criteria = [
        criterion
        for criterion in criteria
        if criterion.score is not None and criterion.weight > 0
    ]

    evaluated_weight = sum(criterion.weight for criterion in evaluated_criteria)

    if evaluated_weight == 0:
        return WeightedScoreResult(
            final_score=0,
            evaluated_weight=0,
            total_weight=total_weight,
        )

    weighted_total = sum(
        criterion.score * criterion.weight
        for criterion in evaluated_criteria
        if criterion.score is not None
    )

    final_score = round(weighted_total / evaluated_weight)

    return WeightedScoreResult(
        final_score=final_score,
        evaluated_weight=evaluated_weight,
        total_weight=total_weight,
    )
