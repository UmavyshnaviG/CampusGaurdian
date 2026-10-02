"""
Router: /api/ai/search

Semantic search over a provided corpus of grievance embeddings.
"""
from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.schemas import AgentResponse
from app.core.model_manager import model_manager

router = APIRouter()


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class CorpusItem(BaseModel):
    id: str
    embedding: List[float]


class SearchRequest(BaseModel):
    query: str
    limit: int = 10
    corpus: List[CorpusItem] = []


# ---------------------------------------------------------------------------
# POST /search
# ---------------------------------------------------------------------------


@router.post("/search")
def semantic_search(body: SearchRequest) -> AgentResponse:
    """Rank corpus items by cosine similarity to the query embedding."""

    if not body.corpus:
        return AgentResponse(
            agent="semantic_search",
            status="success",
            data={"results": []},
            confidence=0.0,
            evidence=[],
            warnings=[
                "No corpus provided — pass grievance embeddings in the corpus field."
            ],
        )

    # Encode the query string into a vector
    query_vec: List[float] = model_manager.encode_one(body.query)

    # Extract corpus embeddings
    corpus_vecs: List[List[float]] = [item.embedding for item in body.corpus]

    # Compute cosine similarities
    scores: List[float] = model_manager.compare_one_to_many(query_vec, corpus_vecs)

    # Zip, sort descending, take top-limit
    ranked = sorted(zip(scores, body.corpus), key=lambda x: x[0], reverse=True)
    top_results = ranked[: body.limit]

    results = [
        {"grievanceId": item.id, "score": round(score, 4)}
        for score, item in top_results
    ]

    return AgentResponse(
        agent="semantic_search",
        status="success",
        data={"results": results},
        confidence=1.0,
        evidence=[body.query],
        warnings=[],
    )
