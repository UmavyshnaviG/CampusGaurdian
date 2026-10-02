"""
Router: /api/ai/outcomes

Stage 9 — Outcome Measurement endpoint.
POST /measure-outcome: Compute deterministic before/after metrics for a pattern action.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.schemas import AgentResponse

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request body
# ---------------------------------------------------------------------------


class MeasureOutcomeRequest(BaseModel):
    beforeGrievances: List[Dict[str, Any]]
    afterGrievances: List[Dict[str, Any]]
    action: Dict[str, Any]


# ---------------------------------------------------------------------------
# POST /measure-outcome
# ---------------------------------------------------------------------------


@router.post("/measure-outcome", response_model=AgentResponse)
def measure_outcome(body: MeasureOutcomeRequest) -> AgentResponse:
    """
    Receive before/after grievance lists and the action dict.
    Run OutcomeRecurrenceAgent.measure_outcome() to produce deterministic metrics.
    Returns AgentResponse with outcome data.
    """
    from app.agents.outcome_recurrence import OutcomeRecurrenceAgent

    agent = OutcomeRecurrenceAgent()

    try:
        result = agent.measure_outcome(
            before_grievances=body.beforeGrievances,
            after_grievances=body.afterGrievances,
            action=body.action,
        )
    except Exception as exc:
        logger.exception("[outcomes router] OutcomeRecurrenceAgent.measure_outcome failed: %s", exc)
        return AgentResponse(
            agent="outcome_recurrence",
            status="failed",
            data={},
            confidence=0.0,
            evidence=[],
            warnings=[f"Outcome measurement failed: {str(exc)}"],
        )

    return AgentResponse(
        agent="outcome_recurrence",
        status="success",
        data={"outcome": result},
        confidence=1.0,
        evidence=[result.get("observationText", "")],
        warnings=[],
    )
