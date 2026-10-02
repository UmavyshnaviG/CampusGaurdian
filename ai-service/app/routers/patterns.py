"""
Router: /api/ai/patterns

Stubs for Stage 6 (Pattern Discovery Agent, Diagnostic Agent, Prediction Agent).
"""
from __future__ import annotations

from fastapi import APIRouter

from app.core.schemas import AgentResponse

router = APIRouter()

_NOT_IMPLEMENTED = "Pattern discovery not yet implemented"


@router.post("/discover-patterns", response_model=AgentResponse)
def discover_patterns() -> AgentResponse:
    return AgentResponse(
        agent="pattern_discovery",
        status="not_implemented",
        data={},
        confidence=0.0,
        evidence=[],
        warnings=[_NOT_IMPLEMENTED],
    )


@router.post("/diagnose", response_model=AgentResponse)
def diagnose() -> AgentResponse:
    return AgentResponse(
        agent="diagnostic",
        status="not_implemented",
        data={},
        confidence=0.0,
        evidence=[],
        warnings=["Diagnostic agent not yet implemented"],
    )


@router.post("/predict", response_model=AgentResponse)
def predict() -> AgentResponse:
    return AgentResponse(
        agent="prediction",
        status="not_implemented",
        data={},
        confidence=0.0,
        evidence=[],
        warnings=["Prediction agent not yet implemented"],
    )
