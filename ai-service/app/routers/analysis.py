"""
Router: /api/ai/analysis

Endpoints
---------
POST /analyze-one          — process a single grievance
POST /batch-analyze        — process up to 2000 grievances
POST /inspect-schema       — Agent 1: inspect an uploaded dataset file
POST /process-batch        — Agent 1: convert a dataset file to GrievanceInput rows
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from fastapi import APIRouter
from pydantic import BaseModel

from app.agents.data_understanding import DataUnderstandingAgent
from app.agents.feedback_intelligence import FeedbackIntelligenceAgent
from app.core.schemas import AgentResponse, GrievanceInput

logger = logging.getLogger(__name__)
router = APIRouter()

# Module-level agent instances — models loaded once
_agent = FeedbackIntelligenceAgent()
_du_agent = DataUnderstandingAgent()


# ---------------------------------------------------------------------------
# Request bodies for dataset endpoints
# ---------------------------------------------------------------------------


class InspectSchemaRequest(BaseModel):
    filepath: str


class ProcessBatchRequest(BaseModel):
    filepath: str
    columnMappings: Dict[str, str] = {}


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


# ---------------------------------------------------------------------------
# POST /inspect-schema  — Agent 1: dataset schema inspection
# ---------------------------------------------------------------------------


@router.post("/inspect-schema", response_model=AgentResponse)
def inspect_schema(payload: InspectSchemaRequest) -> AgentResponse:
    """
    Inspect a CSV or XLSX file and return a detailed schema profile.
    Used by the admin Upload Dataset UI (Step 2).
    """
    try:
        result = _du_agent.inspect_schema(payload.filepath)

        if 'error' in result:
            return AgentResponse(
                agent="data_understanding",
                status="failed",
                data={},
                confidence=0.0,
                evidence=[],
                warnings=[result['error']],
            )

        return AgentResponse(
            agent="data_understanding",
            status="success",
            data=result,
            confidence=result.get('dataQualityScore', 0.0),
            evidence=[],
            warnings=[],
        )
    except Exception as exc:
        logger.exception("inspect_schema failed for filepath=%s", payload.filepath)
        return AgentResponse(
            agent="data_understanding",
            status="failed",
            data={},
            confidence=0.0,
            evidence=[],
            warnings=[str(exc)],
        )


# ---------------------------------------------------------------------------
# POST /process-batch  — Agent 1: convert dataset rows to GrievanceInput list
# ---------------------------------------------------------------------------


@router.post("/process-batch", response_model=AgentResponse)
def process_batch(payload: ProcessBatchRequest) -> AgentResponse:
    """
    Apply confirmed column mappings to a file and return a list of
    GrievanceInput-compatible dicts ready for batch AI analysis.
    """
    try:
        rows = _du_agent.process_batch(payload.filepath, payload.columnMappings)
        return AgentResponse(
            agent="data_understanding",
            status="success",
            data={"rows": rows, "count": len(rows)},
            confidence=1.0,
            evidence=[],
            warnings=[],
        )
    except Exception as exc:
        logger.exception("process_batch failed for filepath=%s", payload.filepath)
        return AgentResponse(
            agent="data_understanding",
            status="failed",
            data={},
            confidence=0.0,
            evidence=[],
            warnings=[str(exc)],
        )
