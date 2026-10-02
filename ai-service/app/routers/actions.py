"""
Router: /api/ai/actions

Stage 7 — Recommendation and Action Generation endpoints.
Stage 9 — Recurrence Detection stub.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.schemas import AgentResponse

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------


class RecommendRequest(BaseModel):
    pattern: Dict[str, Any]
    diagnosis: Dict[str, Any]
    prediction: Dict[str, Any]


class GenerateActionRequest(BaseModel):
    recommendation: Dict[str, Any]
    pattern: Dict[str, Any]
    department: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# POST /recommend
# ---------------------------------------------------------------------------


@router.post("/recommend", response_model=AgentResponse)
def recommend(body: RecommendRequest) -> AgentResponse:
    """
    Receive pattern + diagnosis + prediction dicts.
    Run RecommendationAgent.recommend() to produce a structured recommendation.
    Returns AgentResponse with recommendation in data.
    """
    from app.agents.recommendation import RecommendationAgent

    agent = RecommendationAgent()

    try:
        recommendation = agent.recommend(
            pattern=body.pattern,
            diagnosis=body.diagnosis,
            prediction=body.prediction,
        )
    except Exception as exc:
        logger.exception("[actions router] RecommendationAgent.recommend failed: %s", exc)
        return AgentResponse(
            agent="recommendation",
            status="failed",
            data={},
            confidence=0.0,
            evidence=[],
            warnings=[f"Recommendation failed: {str(exc)}"],
        )

    return AgentResponse(
        agent="recommendation",
        status="success",
        data={"recommendation": recommendation},
        confidence=float(recommendation.get("confidence", 0.0)),
        evidence=recommendation.get("evidence", []),
        warnings=[],
    )


# ---------------------------------------------------------------------------
# POST /generate-action
# ---------------------------------------------------------------------------


@router.post("/generate-action", response_model=AgentResponse)
def generate_action(body: GenerateActionRequest) -> AgentResponse:
    """
    Receive recommendation + pattern + optional department dict.
    Run ActionCoordinationAgent.generate_draft() to produce an email draft.
    Returns AgentResponse with email draft in data.
    """
    from app.agents.action_coordination import ActionCoordinationAgent

    agent = ActionCoordinationAgent()

    try:
        draft = agent.generate_draft(
            recommendation=body.recommendation,
            pattern=body.pattern,
            department=body.department,
        )
    except Exception as exc:
        logger.exception("[actions router] ActionCoordinationAgent.generate_draft failed: %s", exc)
        return AgentResponse(
            agent="action_coordination",
            status="failed",
            data={},
            confidence=0.0,
            evidence=[],
            warnings=[f"Action draft generation failed: {str(exc)}"],
        )

    delivery_method = draft.get("deliveryMethod", "draft_only")
    warnings: List[str] = []
    if delivery_method == "draft_only":
        warnings.append(
            "Email delivery is not configured (SMTP_HOST/SMTP_USER not set). "
            "Draft saved for manual review."
        )
    elif delivery_method == "manual":
        warnings.append(
            "No department contact email found. Draft requires manual delivery."
        )

    return AgentResponse(
        agent="action_coordination",
        status="success",
        data={"draft": draft},
        confidence=0.0,
        evidence=[draft.get("subject", "")],
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# POST /check-recurrence — stub (Stage 9)
# ---------------------------------------------------------------------------


@router.post("/check-recurrence", response_model=AgentResponse)
def check_recurrence() -> AgentResponse:
    return AgentResponse(
        agent="outcome_recurrence",
        status="not_implemented",
        data={},
        confidence=0.0,
        evidence=[],
        warnings=["Recurrence detection not yet implemented (Stage 9)."],
    )
