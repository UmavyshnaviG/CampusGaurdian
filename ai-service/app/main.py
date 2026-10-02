"""
Campus Guardian 360 — AI Service
FastAPI application entry point.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Startup / shutdown lifecycle
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[override]
    """Load the sentence-transformer model and NLTK data on startup."""
    # 1. Load sentence-transformer model
    from app.core.model_manager import model_manager

    logger.info("AI Service starting — loading model: %s", settings.MODEL_NAME)
    model_manager.load(settings.MODEL_NAME)
    app.state.model_name = settings.MODEL_NAME

    # 2. Download required NLTK data (safe to call if already present)
    import nltk  # type: ignore

    for resource in ["punkt", "stopwords", "vader_lexicon", "punkt_tab"]:
        try:
            nltk.download(resource, quiet=True)
        except Exception as exc:  # pragma: no cover
            logger.warning("NLTK download '%s' failed: %s", resource, exc)

    logger.info("AI Service ready.")
    yield  # application runs here

    logger.info("AI Service shutting down.")


# ---------------------------------------------------------------------------
# Application instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Campus Guardian 360 AI Service",
    description="Multi-agent AI pipeline for campus feedback intelligence",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — permissive for development; tighten in production
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Include routers
# ---------------------------------------------------------------------------

from app.routers import analysis, patterns, actions, evaluation  # noqa: E402

app.include_router(analysis.router, prefix="/api/ai")
app.include_router(patterns.router, prefix="/api/ai")
app.include_router(actions.router, prefix="/api/ai")
app.include_router(evaluation.router, prefix="/api/ai")

# ---------------------------------------------------------------------------
# Core endpoints
# ---------------------------------------------------------------------------


@app.get("/")
def root() -> dict:
    return {
        "service": "Campus Guardian 360 AI Service",
        "version": "1.0.0",
    }


@app.get("/api/ai/health")
def health() -> dict:
    model_name = getattr(app.state, "model_name", settings.MODEL_NAME)
    return {
        "status": "ok",
        "model": model_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
