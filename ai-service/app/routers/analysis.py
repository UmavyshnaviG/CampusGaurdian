"""
Router: /api/ai/analysis

Endpoints
---------
POST /analyze-one   — process a single grievance
POST /batch-analyze — process up to 2000 grievances
"""
from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter

from app.agents.feedback_intelligence import FeedbackIntelligenceAgent
from app.core.schemas import AgentResponse, GrievanceInput

logger = logging.getLogger(__name__)
router = APIRouter()

# Module-level agent instance — model loaded once
_agent = FeedbackIntelligenceAgent()


# ---------------------------------------------------------------------------
# POST /analyze-one
# ---------------------------------------------------------------------------


@router.post("/analyze-one", response_model=AgentResponse)
def analyze_one(payload: GrievanceInput) -> AgentResponse:
    """
    Run the Feedback Intelligence Agent for a single grievance.
    Never raises — failures are returned as status='failed'.
    """
    try:
        metadata = _agent.analyze(payload)
        return AgentResponse(
            agent="feedback_intelligence",
            status="success",
            data={"metadata": metadata.model_dump()},
            confidence=metadata.confidence,
            evidence=[],
            warnings=[],
        )
    except Exception as exc:
        logger.exception("analyze_one failed for grievanceId=%s", payload.grievanceId)
        return AgentResponse(
            agent="feedback_intelligence",
            status="failed",
            data={},
            confidence=0.0,
            evidence=[],
            warnings=[str(exc)],
        )


# ---------------------------------------------------------------------------
# POST /batch-analyze
# ---------------------------------------------------------------------------


@router.post("/batch-analyze", response_model=List[AgentResponse])
def batch_analyze(payloads: List[GrievanceInput]) -> List[AgentResponse]:
    """
    Process up to 2 000 grievances in one call.
    Each item is processed independently; one failure does not block others.
    """
    if len(payloads) > 2000:
        payloads = payloads[:2000]

    results: List[AgentResponse] = []
    for idx, item in enumerate(payloads):
        try:
            metadata = _agent.analyze(item)
            results.append(
                AgentResponse(
                    agent="feedback_intelligence",
                    status="success",
                    data={
                        "metadata": metadata.model_dump(),
                        "index": idx,
                        "grievanceId": item.grievanceId,
                    },
                    confidence=metadata.confidence,
                    evidence=[],
                    warnings=[],
                )
            )
        except Exception as exc:
            logger.exception(
                "batch_analyze failed at index=%d grievanceId=%s", idx, item.grievanceId
            )
            results.append(
                AgentResponse(
                    agent="feedback_intelligence",
                    status="failed",
                    data={"index": idx, "grievanceId": item.grievanceId},
                    confidence=0.0,
                    evidence=[],
                    warnings=[str(exc)],
                )
            )

    return results
