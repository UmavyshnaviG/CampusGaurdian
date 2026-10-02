"""
Router: /api/ai/actions

Stubs for Stages 7-9 (Recommendation, Action Generation, Recurrence Detection).
"""
from __future__ import annotations

from fastapi import APIRouter

from app.core.schemas import AgentResponse

router = APIRouter()


@router.post("/recommend", response_model=AgentResponse)
def recommend() -> AgentResponse:
    return AgentResponse(
        agent="recommendation",
        status="not_implemented",
        data={},
        confidence=0.0,
        evidence=[],
        warnings=["Recommendation agent not yet implemented"],
    )


@router.post("/generate-action", response_model=AgentResponse)
def generate_action() -> AgentResponse:
    return AgentResponse(
        agent="action_coordination",
        status="not_implemented",
        data={},
        confidence=0.0,
        evidence=[],
        warnings=["Action generation not yet implemented"],
    )


@router.post("/check-recurrence", response_model=AgentResponse)
def check_recurrence() -> AgentResponse:
    return AgentResponse(
        agent="outcome_recurrence",
        status="not_implemented",
        data={},
        confidence=0.0,
        evidence=[],
        warnings=["Recurrence detection not yet implemented"],
    )
