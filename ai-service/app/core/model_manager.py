"""
ModelManager — singleton wrapper around sentence-transformers.

Lazy-loads the model on first use so import time stays fast.
"""
from __future__ import annotations

import logging
from typing import List

import numpy as np

logger = logging.getLogger(__name__)


class ModelManager:
    """Singleton that owns the SentenceTransformer instance."""

    _instance: "ModelManager | None" = None
    _model = None  # SentenceTransformer loaded lazily

    def __new__(cls) -> "ModelManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------

    def load(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        """Load (or reload) the sentence-transformer model."""
        from sentence_transformers import SentenceTransformer  # type: ignore

        logger.info("Loading sentence-transformer model: %s", model_name)
        self._model = SentenceTransformer(model_name)
        logger.info("Model loaded successfully.")

    @property
    def model(self):
        if self._model is None:
            self.load()
        return self._model

    # ------------------------------------------------------------------
    # Encoding
    # ------------------------------------------------------------------

    def encode(self, texts: List[str]) -> np.ndarray:
        """Return (N, 384) float32 embedding matrix."""
        return self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False)

    def encode_one(self, text: str) -> List[float]:
        """Return a single 384-dim embedding as a plain Python list."""
        vec: np.ndarray = self.encode([text])[0]
        return vec.tolist()

    # ------------------------------------------------------------------
    # Similarity helpers
    # ------------------------------------------------------------------

    @staticmethod
    def cosine_sim(vec_a: List[float], vec_b: List[float]) -> float:
        """
        Cosine similarity between two vectors.
        Returns 0.0 for zero-magnitude inputs to avoid division by zero.
        """
        a = np.array(vec_a, dtype=np.float32)
        b = np.array(vec_b, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    @staticmethod
    def compare_one_to_many(
        query_vec: List[float], corpus_vecs: List[List[float]]
    ) -> List[float]:
        """
        Cosine similarity of *query_vec* against every vector in *corpus_vecs*.
        Returns a list of float scores in the same order as corpus_vecs.
        """
        if not corpus_vecs:
            return []
        q = np.array(query_vec, dtype=np.float32)
        c = np.array(corpus_vecs, dtype=np.float32)  # (N, D)
        norm_q = np.linalg.norm(q)
        norms_c = np.linalg.norm(c, axis=1)  # (N,)
        if norm_q == 0.0:
            return [0.0] * len(corpus_vecs)
        # Avoid /0 for corpus zero-vectors
        with np.errstate(invalid="ignore", divide="ignore"):
            scores = np.dot(c, q) / (norms_c * norm_q)
            scores = np.where(norms_c == 0.0, 0.0, scores)
        return scores.tolist()


# Module-level singleton instance
model_manager = ModelManager()
