"""
Router: /api/ai/evaluation

Stub for AI performance evaluation metrics (implemented in a later stage).
"""
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/evaluate")
def evaluate() -> dict:
    return {
        "metrics": {
            "classification": {"status": "Not evaluated"},
            "sentiment": {"status": "Not evaluated"},
            "clustering": {"status": "Not evaluated"},
            "prediction": {"status": "Not evaluated"},
            "recommendation": {"status": "Not evaluated"},
            "system": {
                "api_latency_ms": "Not measured",
                "error_rate": "Not measured",
            },
        }
    }
