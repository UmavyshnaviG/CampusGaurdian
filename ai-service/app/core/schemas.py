"""
Shared Pydantic v2 schemas used across the AI service.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Input
# ---------------------------------------------------------------------------


class GrievanceInput(BaseModel):
    grievanceId: str
    text: str
    category: str
    severity: str  # 'Low', 'Medium', 'High', 'Critical'
    userId: Optional[str] = None
    anonymous: bool = False
    location: Optional[str] = None
    createdAt: Optional[str] = None


# ---------------------------------------------------------------------------
# AI Metadata produced per grievance
# ---------------------------------------------------------------------------


class AIMetadata(BaseModel):
    topic: str
    subTopic: str
    issueType: str
    keywords: List[str]
    sentiment: str  # 'positive', 'negative', 'neutral'
    sentimentScore: float
    urgency: float  # 0.0–1.0
    embedding: List[float]  # 384 dimensions
    duplicateProbability: float
    similarityGroup: Optional[str] = None
    clusterId: Optional[str] = None
    recurrenceIndicator: bool
    priorityRecommendation: str
    confidence: float
    sensitiveFlag: bool


# ---------------------------------------------------------------------------
# Generic agent response wrapper
# ---------------------------------------------------------------------------


class AgentResponse(BaseModel):
    agent: str
    status: str  # 'success', 'partial', 'failed'
    data: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 0.0
    evidence: List[Any] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
