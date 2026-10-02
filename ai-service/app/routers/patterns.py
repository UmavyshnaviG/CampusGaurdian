"""
Router: /api/ai/patterns

Stage 6 — Pattern Discovery and Diagnostic endpoints.
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
# Request / response bodies
# ---------------------------------------------------------------------------


class DiscoverPatternsRequest(BaseModel):
    grievances: List[Dict[str, Any]]


class DiagnoseRequest(BaseModel):
    pattern: Dict[str, Any]


# ---------------------------------------------------------------------------
# POST /discover-patterns
# ---------------------------------------------------------------------------


@router.post("/discover-patterns", response_model=AgentResponse)
def discover_patterns(body: DiscoverPatternsRequest) -> AgentResponse:
    """
    Receive a list of grievance dicts (each with aiMetadata.embedding),
    run PatternDiscoveryAgent to cluster them, then run DiagnosticAgent
    on each discovered pattern to enrich with diagnosis.

    Returns AgentResponse.data = { patterns: [...], clusterLabels: {...} }
    """
    from app.agents.pattern_discovery import PatternDiscoveryAgent
    from app.agents.diagnostic import DiagnosticAgent

    agent = PatternDiscoveryAgent()
    diagnostic_agent = DiagnosticAgent()

    grievances = body.grievances
    warnings: List[str] = []

    if not grievances:
        return AgentResponse(
            agent="pattern_discovery",
            status="success",
            data={"patterns": [], "clusterLabels": {}},
            confidence=0.0,
            evidence=[],
            warnings=["No grievances provided."],
        )

    try:
        patterns = agent.discover(grievances)
        cluster_labels = agent.get_cluster_labels()
    except Exception as exc:
        logger.exception("[patterns router] PatternDiscoveryAgent failed: %s", exc)
        return AgentResponse(
            agent="pattern_discovery",
            status="failed",
            data={"patterns": [], "clusterLabels": {}},
            confidence=0.0,
            evidence=[],
            warnings=[f"Pattern discovery failed: {str(exc)}"],
        )

    if not patterns:
        return AgentResponse(
            agent="pattern_discovery",
            status="success",
            data={"patterns": [], "clusterLabels": cluster_labels},
            confidence=0.0,
            evidence=[],
            warnings=[
                "No significant patterns discovered. "
                "Possible reasons: insufficient valid embeddings, "
                "too few grievances, or low cluster quality."
            ],
        )

    # Enrich each pattern with diagnostic output
    for pattern in patterns:
        try:
            diagnosis = diagnostic_agent.diagnose(pattern)
            pattern["diagnosis"] = diagnosis
            pattern["responsibleDepartment"] = diagnosis.get(
                "recommendedDepartment", pattern.get("responsibleDepartment", "")
            )
        except Exception as diag_exc:
            logger.warning(
                "[patterns router] DiagnosticAgent failed for pattern '%s': %s",
                pattern.get("patternKey", "?"),
                diag_exc,
            )
            pattern["diagnosis"] = None
            warnings.append(
                f"Diagnosis failed for pattern '{pattern.get('patternKey', '?')}': {diag_exc}"
            )

    avg_confidence = (
        sum(p.get("avgConfidence", 0.0) for p in patterns) / len(patterns)
        if patterns else 0.0
    )

    return AgentResponse(
        agent="pattern_discovery",
        status="success",
        data={
            "patterns": patterns,
            "clusterLabels": cluster_labels,
            "totalDiscovered": len(patterns),
            "grievancesAnalysed": len(grievances),
        },
        confidence=round(avg_confidence, 4),
        evidence=[p.get("patternKey", "") for p in patterns],
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# POST /diagnose
# ---------------------------------------------------------------------------


@router.post("/diagnose", response_model=AgentResponse)
def diagnose(body: DiagnoseRequest) -> AgentResponse:
    """
    Receive a single pattern dict, run DiagnosticAgent.diagnose(),
    return AgentResponse with diagnosis.
    """
    from app.agents.diagnostic import DiagnosticAgent

    agent = DiagnosticAgent()

    try:
        diagnosis = agent.diagnose(body.pattern)
    except Exception as exc:
        logger.exception("[patterns router] DiagnosticAgent.diagnose failed: %s", exc)
        return AgentResponse(
            agent="diagnostic",
            status="failed",
            data={},
            confidence=0.0,
            evidence=[],
            warnings=[f"Diagnosis failed: {str(exc)}"],
        )

    return AgentResponse(
        agent="diagnostic",
        status="success",
        data={"diagnosis": diagnosis},
        confidence=diagnosis.get("confidence", 0.0),
        evidence=[],
        warnings=diagnosis.get("warnings", []),
    )


# ---------------------------------------------------------------------------
# POST /predict — stub (implemented in Stage 7)
# ---------------------------------------------------------------------------


@router.post("/predict", response_model=AgentResponse)
def predict() -> AgentResponse:
    return AgentResponse(
        agent="prediction",
        status="not_implemented",
        data={},
        confidence=0.0,
        evidence=[],
        warnings=["Prediction agent not yet implemented (Stage 7)."],
    )
