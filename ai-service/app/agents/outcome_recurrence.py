"""
Agent 8 — Outcome Measurement and Recurrence Detection Agent

Responsibilities
----------------
* measure_outcome: Deterministic before/after comparison using numpy/statistics.
* detect_recurrence: Semantic similarity-based recurrence detection using stored embeddings.

All calculations are deterministic (numpy/statistics — NO LLM for numbers).
Cautious language templates are used for all observations.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Severity numeric mapping
# ---------------------------------------------------------------------------
SEVERITY_MAP: Dict[str, int] = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}

# Recurrence similarity threshold
RECURRENCE_THRESHOLD = 0.65


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _severity_score(g: Dict[str, Any]) -> int:
    """Convert rawSeverity string to numeric 1-4."""
    raw = str(g.get("rawSeverity") or g.get("severity") or "Low").lower().strip()
    return SEVERITY_MAP.get(raw, 1)


def _sentiment_score(g: Dict[str, Any]) -> float:
    """Extract sentimentScore from aiMetadata."""
    ai = g.get("aiMetadata") or {}
    try:
        return float(ai.get("sentimentScore") or 0.0)
    except (TypeError, ValueError):
        return 0.0


def _parse_date(raw: Any) -> Optional[datetime]:
    """Best-effort datetime parse from string, int (epoch ms), or datetime."""
    if raw is None:
        return None
    if isinstance(raw, datetime):
        return raw
    if isinstance(raw, (int, float)):
        try:
            return datetime.fromtimestamp(raw / 1000.0, tz=timezone.utc)
        except (OSError, OverflowError, ValueError):
            return None
    raw_str = str(raw).strip()
    for fmt in (
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            return datetime.strptime(raw_str[:26], fmt)
        except ValueError:
            continue
    return None


def _get_embedding(g: Dict[str, Any]) -> Optional[np.ndarray]:
    """Extract 384-dim embedding from grievance aiMetadata."""
    ai = g.get("aiMetadata") or {}
    emb = ai.get("embedding")
    if not isinstance(emb, (list, tuple)):
        return None
    if len(emb) != 384:
        return None
    try:
        arr = np.array([float(v) for v in emb], dtype=np.float32)
        return arr
    except (TypeError, ValueError):
        return None


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two 1-D vectors."""
    norm_a = float(np.linalg.norm(a))
    norm_b = float(np.linalg.norm(b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def _n_weeks(grievances: List[Dict[str, Any]]) -> float:
    """Return number of weeks spanned by grievances (min 1)."""
    dates = [_parse_date(g.get("createdAt")) for g in grievances]
    dates = [d for d in dates if d is not None]
    if len(dates) < 2:
        return 1.0
    span_days = (max(dates) - min(dates)).days
    weeks = span_days / 7.0
    return max(weeks, 1.0)


def _compute_metrics(grievances: List[Dict[str, Any]]) -> Dict[str, float]:
    """Compute deterministic aggregate metrics from a list of grievances."""
    count = len(grievances)
    if count == 0:
        return {
            "complaintCount": 0,
            "avgSeverity": 0.0,
            "avgSentiment": 0.0,
            "weeklyFrequency": 0.0,
        }

    severities = [_severity_score(g) for g in grievances]
    sentiments = [_sentiment_score(g) for g in grievances]
    n_weeks = _n_weeks(grievances)

    avg_severity = float(np.mean(severities))
    avg_sentiment = float(np.mean(sentiments))
    weekly_frequency = count / n_weeks

    return {
        "complaintCount": count,
        "avgSeverity": round(avg_severity, 4),
        "avgSentiment": round(avg_sentiment, 4),
        "weeklyFrequency": round(weekly_frequency, 4),
    }


# ===========================================================================
# OutcomeRecurrenceAgent
# ===========================================================================

class OutcomeRecurrenceAgent:
    """
    Deterministic outcome measurement and semantic recurrence detection agent.
    """

    AGENT_NAME = "outcome_recurrence"

    # ------------------------------------------------------------------
    # measure_outcome
    # ------------------------------------------------------------------

    def measure_outcome(
        self,
        before_grievances: List[Dict[str, Any]],
        after_grievances: List[Dict[str, Any]],
        action: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Compute deterministic before/after metrics and change indicators.

        Parameters
        ----------
        before_grievances : grievances from the period before the action
        after_grievances  : grievances from the period after the action
        action            : action dict (used for context only, not for calculations)

        Returns
        -------
        dict with beforeMetrics, afterMetrics, changeMetrics, observationText
        """
        # ---- 1. Before metrics ----
        before_metrics = _compute_metrics(before_grievances)

        # ---- 2. After metrics ----
        after_metrics = _compute_metrics(after_grievances)

        # ---- 3. Change metrics (deterministic arithmetic) ----
        count_change = after_metrics["complaintCount"] - before_metrics["complaintCount"]
        before_count_safe = max(before_metrics["complaintCount"], 1)
        count_change_pct = (count_change / before_count_safe) * 100.0

        severity_change = after_metrics["avgSeverity"] - before_metrics["avgSeverity"]
        frequency_change = after_metrics["weeklyFrequency"] - before_metrics["weeklyFrequency"]
        before_freq_safe = max(before_metrics["weeklyFrequency"], 0.001)
        frequency_change_pct = (frequency_change / before_freq_safe) * 100.0

        change_metrics = {
            "countChange": count_change,
            "countChangePct": round(count_change_pct, 2),
            "severityChange": round(severity_change, 4),
            "frequencyChange": round(frequency_change, 4),
            "frequencyChangePct": round(frequency_change_pct, 2),
        }

        # ---- 4. Observation text (cautious language, deterministic string construction) ----
        observation_text = self._build_observation_text(count_change_pct)

        # ---- 5. Outcome classification (deterministic) ----
        if count_change_pct < -20:
            outcome_direction = "Improved"
        elif count_change_pct > 20:
            outcome_direction = "Worsened"
        else:
            outcome_direction = "Stable"

        return {
            "beforeMetrics": before_metrics,
            "afterMetrics": after_metrics,
            "changeMetrics": change_metrics,
            "observationText": observation_text,
            "outcomeDirection": outcome_direction,
        }

    # ------------------------------------------------------------------
    # detect_recurrence
    # ------------------------------------------------------------------

    def detect_recurrence(
        self,
        pattern: Dict[str, Any],
        new_grievances: List[Dict[str, Any]],
        historical_embeddings: List[List[float]],
        historical_cluster_id: str,
    ) -> Dict[str, Any]:
        """
        Detect whether a previously resolved pattern is recurring.

        Parameters
        ----------
        pattern               : pattern dict from MongoDB
        new_grievances        : all grievances submitted after pattern.timeWindow.lastSeen
        historical_embeddings : embeddings from the original cluster members
        historical_cluster_id : clusterId of the original pattern

        Returns
        -------
        recurrence analysis dict
        """
        # ---- 1. Filter new grievances to only those after pattern's last_seen ----
        last_seen_raw = (pattern.get("timeWindow") or {}).get("lastSeen")
        last_seen = _parse_date(last_seen_raw)

        if last_seen is not None:
            filtered_new = [
                g for g in new_grievances
                if (_parse_date(g.get("createdAt")) or datetime.min.replace(tzinfo=timezone.utc))
                > last_seen.replace(tzinfo=timezone.utc) if last_seen.tzinfo is None
                else last_seen
            ]
        else:
            filtered_new = list(new_grievances)

        # ---- 2. Compute cluster centroid from historical embeddings ----
        valid_hist: List[np.ndarray] = []
        for emb in historical_embeddings:
            if isinstance(emb, (list, tuple)) and len(emb) == 384:
                try:
                    arr = np.array([float(v) for v in emb], dtype=np.float32)
                    valid_hist.append(arr)
                except (TypeError, ValueError):
                    continue

        if not valid_hist:
            # No historical embeddings — cannot compute similarity
            return self._empty_recurrence_result(pattern)

        centroid = np.mean(np.stack(valid_hist), axis=0)

        # ---- 3. Compute cosine similarity for each new grievance ----
        sim_scores: List[float] = []
        new_embeddings: List[Optional[np.ndarray]] = []

        for g in filtered_new:
            emb_arr = _get_embedding(g)
            new_embeddings.append(emb_arr)
            if emb_arr is not None:
                sim_scores.append(_cosine_sim(emb_arr, centroid))
            else:
                sim_scores.append(0.0)

        # ---- 4. Find semantically similar new grievances ----
        similar_new: List[Dict[str, Any]] = []
        for g, score in zip(filtered_new, sim_scores):
            if score >= RECURRENCE_THRESHOLD:
                desc = str(g.get("description") or "").strip()
                excerpt = desc[:150] + ("…" if len(desc) > 150 else "")
                similar_new.append({
                    "id": str(g.get("_id") or ""),
                    "similarityScore": round(score, 4),
                    "textExcerpt": excerpt,
                })

        # ---- 5. Location match (deterministic) ----
        pattern_primary_loc = str(pattern.get("primaryLocation") or "").lower().strip()
        pattern_locations_raw = pattern.get("locations") or []
        pattern_locations = {str(loc).lower().strip() for loc in pattern_locations_raw}
        pattern_locations.add(pattern_primary_loc)

        def _loc_string(g: Dict[str, Any]) -> str:
            loc = g.get("location")
            if isinstance(loc, str):
                return loc.lower().strip()
            if isinstance(loc, dict):
                parts = [
                    str(loc.get(k, "")).strip().lower()
                    for k in ("building", "block", "floor", "room", "campus")
                    if loc.get(k, "").strip()
                ]
                return " ".join(parts)
            return ""

        similar_new_locations = {
            _loc_string(g)
            for g in filtered_new
            if any(s["id"] == str(g.get("_id", "")) for s in similar_new)
        }
        location_overlap = bool(
            similar_new_locations & pattern_locations
            or any(
                p_loc in s_loc or s_loc in p_loc
                for p_loc in pattern_locations
                for s_loc in similar_new_locations
                if p_loc and s_loc
            )
        )

        # ---- 6. Category match (deterministic) ----
        pattern_category = str(pattern.get("category") or "").lower().strip()
        similar_new_categories = {
            str(g.get("category") or "").lower().strip()
            for g in filtered_new
            if any(s["id"] == str(g.get("_id", "")) for s in similar_new)
        }
        category_match = pattern_category in similar_new_categories

        # ---- 7. Recurrence scoring ----
        original_report_count = int(pattern.get("reportCount") or 0)
        threshold_count = max(original_report_count * 0.2, 5)
        base_score = len(similar_new) / threshold_count
        location_bonus = 0.2 if location_overlap else 0.0
        category_bonus = 0.2 if category_match else 0.0
        recurrence_score = min(base_score + location_bonus + category_bonus, 1.0)
        is_recurrence = recurrence_score >= 0.5

        # ---- 8. Time gap analysis ----
        action_resolution_raw = None
        days_since_resolution: Optional[int] = None
        recurrence_speed = "Unknown"

        # Try to derive resolution date from the action dict (passed in via pattern context)
        # The caller passes action data; we look for resolutionDate in pattern or action
        # (pattern doesn't have it, but we guard gracefully)
        now = datetime.now(timezone.utc)
        if last_seen is not None:
            ls_aware = last_seen if last_seen.tzinfo else last_seen.replace(tzinfo=timezone.utc)
            days_since_resolution = (now - ls_aware).days
            if days_since_resolution < 30:
                recurrence_speed = "Fast"
            elif days_since_resolution < 90:
                recurrence_speed = "Medium"
            else:
                recurrence_speed = "Slow"

        # ---- 9. Evidence (cautious language) ----
        evidence_of_recurrence: List[str] = []
        if similar_new:
            primary_loc_display = pattern.get("primaryLocation") or "the affected area"
            evidence_of_recurrence.append(
                f"Data shows {len(similar_new)} new report(s) semantically similar to the previous "
                f"pattern, concentrated at {primary_loc_display}. "
                f"This may indicate recurrence of the underlying issue."
            )
        if location_overlap:
            evidence_of_recurrence.append(
                "The new reports overlap with the original pattern's recorded locations."
            )
        if category_match:
            evidence_of_recurrence.append(
                f"The new reports share the same category ('{pattern.get('category', 'Unknown')}') "
                f"as the original pattern."
            )
        if days_since_resolution is not None:
            evidence_of_recurrence.append(
                f"Approximately {days_since_resolution} day(s) have elapsed since the pattern's last "
                f"recorded activity. This context may be relevant when assessing recurrence."
            )

        if not evidence_of_recurrence:
            evidence_of_recurrence.append(
                "Insufficient semantically similar new reports were found to indicate recurrence."
            )

        # ---- 10. Recommendation (cautious language) ----
        if is_recurrence:
            recommendation = (
                "Consider re-activating the previous action plan and monitoring the situation closely. "
                "Review whether the original intervention fully addressed the root cause."
            )
        else:
            recommendation = (
                "Continue monitoring. The current data does not strongly indicate recurrence, "
                "but periodic review is advised."
            )

        # ---- 11. Confidence (deterministic) ----
        n_hist = len(valid_hist)
        n_new = len(filtered_new)
        data_confidence = min((n_hist + n_new) / 50.0, 1.0)
        score_confidence = recurrence_score
        confidence = round((data_confidence * 0.4 + score_confidence * 0.6), 4)

        return {
            "isRecurrence": bool(is_recurrence),
            "recurrenceScore": round(recurrence_score, 4),
            "similarNewGrievances": similar_new,
            "recurrenceSpeed": recurrence_speed,
            "daysSinceResolution": days_since_resolution,
            "evidenceOfRecurrence": evidence_of_recurrence,
            "recommendation": recommendation,
            "confidence": confidence,
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_observation_text(count_change_pct: float) -> str:
        """
        Build a cautious, deterministic observation text based on complaint
        frequency change percentage. Never claims causation.
        """
        if count_change_pct < -20:
            return (
                f"Complaint frequency in this category and location decreased by "
                f"{abs(count_change_pct):.1f}% in the observation period following the recorded "
                f"intervention. This change is consistent with a positive response, though other "
                f"factors may also have contributed."
            )
        elif count_change_pct > 20:
            return (
                f"Complaint frequency increased by {count_change_pct:.1f}% in the observation "
                f"period following the intervention. Further investigation may be warranted."
            )
        else:
            return (
                "Complaint frequency remained relatively stable in the observation period "
                "following the intervention. The pattern may require continued monitoring."
            )

    @staticmethod
    def _empty_recurrence_result(pattern: Dict[str, Any]) -> Dict[str, Any]:
        """Return a safe empty result when historical embeddings are unavailable."""
        return {
            "isRecurrence": False,
            "recurrenceScore": 0.0,
            "similarNewGrievances": [],
            "recurrenceSpeed": "Unknown",
            "daysSinceResolution": None,
            "evidenceOfRecurrence": [
                "Insufficient historical embedding data to perform semantic recurrence analysis."
            ],
            "recommendation": (
                "Continue monitoring. Historical embeddings are unavailable for this pattern."
            ),
            "confidence": 0.0,
        }
