"""
Agent 5 — Prediction Agent

Responsibilities
----------------
* Receive a list of grievance dicts and a pattern dict.
* Build a weekly time series from member grievances.
* Apply rolling average, linear regression, growth rate calculation.
* Classify the trend using deterministic rules.
* Generate a 4-week linear forecast with uncertainty bands.

All calculations are deterministic (numpy/scipy/sklearn — NO LLM).
"""
from __future__ import annotations

import logging
import math
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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


def _iso_week(dt: datetime) -> str:
    """Return ISO year-week string, e.g. '2024-W03'."""
    cal = dt.isocalendar()
    return f"{cal[0]}-W{cal[1]:02d}"


def _week_label_from_index(base_week_str: str, offset: int) -> str:
    """
    Given an ISO week string like '2024-W03' and an integer offset,
    return the ISO week string that is `offset` weeks later.
    """
    try:
        year, week = base_week_str.split("-W")
        year, week = int(year), int(week)
        # Monday of that ISO week
        monday = datetime.strptime(f"{year}-W{week:02d}-1", "%G-W%V-%u")
        target = monday + timedelta(weeks=offset)
        cal = target.isocalendar()
        return f"{cal[0]}-W{cal[1]:02d}"
    except Exception:
        return f"Week+{offset}"


# ===========================================================================
# PredictionAgent
# ===========================================================================

class PredictionAgent:
    """
    Stateless deterministic prediction agent.
    Call .predict(grievances, pattern) to produce a prediction dict.
    """

    AGENT_NAME = "prediction"

    def predict(
        self,
        grievances: List[Dict[str, Any]],
        pattern: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Build a weekly trend, run linear regression, classify trend,
        and generate a 4-week forecast.

        Parameters
        ----------
        grievances : list of all grievance dicts (each may or may not
                     belong to this pattern)
        pattern    : pattern dict as returned by PatternDiscoveryAgent

        Returns
        -------
        dict with trend, slope, growthRate, weeklyData, forecast,
             confidence, dataPoints, rSquared, interpretation
        """
        # ---- Step 1: Filter grievances that belong to this pattern ----
        member_ids: set = set()

        # From memberGrievanceIds list
        for mid in pattern.get("memberGrievanceIds") or []:
            member_ids.add(str(mid))

        # Also from clusterId if available
        cluster_id = str(pattern.get("clusterId") or "")

        pattern_grievances: List[Dict[str, Any]] = []
        for g in grievances:
            gid = str(g.get("_id", ""))
            g_cluster = str((g.get("aiMetadata") or {}).get("clusterId") or "")
            if gid in member_ids or (cluster_id and g_cluster == cluster_id):
                pattern_grievances.append(g)

        # Fallback: use all if no specific members found but member_ids is empty
        # (pattern might have come from DB with no expanded ids)
        if not pattern_grievances and not member_ids:
            pattern_grievances = grievances

        # ---- Step 2: Build weekly time series ----
        weekly_counts: Dict[str, int] = {}
        for g in pattern_grievances:
            dt = _parse_date(g.get("createdAt"))
            if dt is not None:
                wk = _iso_week(dt)
                weekly_counts[wk] = weekly_counts.get(wk, 0) + 1

        # Also incorporate weeklyTrend from pattern itself if no grievances matched
        if not weekly_counts and pattern.get("weeklyTrend"):
            for wk, cnt in (pattern["weeklyTrend"] or {}).items():
                weekly_counts[wk] = int(cnt)

        sorted_weeks = sorted(weekly_counts.keys())
        counts = [weekly_counts[w] for w in sorted_weeks]
        n = len(sorted_weeks)

        if n < 3:
            return {
                "trend": "Insufficient Data",
                "slope": 0.0,
                "growthRate": 0.0,
                "weeklyData": [],
                "forecast": [],
                "confidence": 0.0,
                "dataPoints": n,
                "rSquared": 0.0,
                "interpretation": (
                    "Insufficient data to generate a reliable trend prediction. "
                    "At least 3 weeks of data are required."
                ),
                "warning": "Need at least 3 weeks of data",
            }

        counts_arr = np.array(counts, dtype=float)
        x = np.arange(n, dtype=float)

        # ---- Step 3: Rolling average (4-week window) ----
        window = min(4, n)
        rolling_avgs: List[Optional[float]] = []
        for i in range(n):
            start = max(0, i - window + 1)
            rolling_avgs.append(float(np.mean(counts_arr[start : i + 1])))

        # ---- Step 4: Linear regression ----
        slope, intercept = float(np.polyfit(x, counts_arr, 1))

        y_pred = slope * x + intercept
        ss_res = float(np.sum((counts_arr - y_pred) ** 2))
        ss_tot = float(np.sum((counts_arr - counts_arr.mean()) ** 2))
        r_squared = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
        r_squared = max(0.0, min(1.0, r_squared))

        # ---- Step 5: Growth rate ----
        recent_4 = counts_arr[-4:] if n >= 4 else counts_arr
        prev_4 = counts_arr[-8:-4] if n >= 8 else counts_arr[: max(1, n - len(recent_4))]

        recent_avg = float(np.mean(recent_4))
        previous_avg = float(np.mean(prev_4)) if len(prev_4) > 0 else 0.0
        growth_rate = (recent_avg - previous_avg) / max(previous_avg, 1.0) * 100.0

        # ---- Step 6: Trend classification ----
        recent_4_sum = float(np.sum(counts_arr[-4:])) if n >= 4 else float(np.sum(counts_arr))
        prev_4_sum = float(np.sum(counts_arr[-8:-4])) if n >= 8 else 0.0

        pattern_status = str(pattern.get("status") or "active").lower()
        last_2_weeks_count = int(np.sum(counts_arr[-2:])) if n >= 2 else 0

        # Recurrence risk: pattern was resolved AND new activity in last 2 weeks
        is_recurrence = (
            pattern_status == "resolved"
            and last_2_weeks_count > 0
        )

        if is_recurrence:
            trend = "Recurrence Risk"
        elif recent_4_sum > 0 and prev_4_sum == 0 and n <= 8:
            trend = "Emerging"
        elif slope > 0.3 and growth_rate > 20:
            trend = "Increasing"
        elif slope < -0.3 and growth_rate < -20:
            trend = "Decreasing"
        else:
            trend = "Stable"

        # ---- Step 7: Confidence ----
        confidence = min(n / 12.0 * 0.5 + r_squared * 0.5, 1.0)

        # ---- Step 8: 4-week forecast ----
        residuals = counts_arr - y_pred
        residual_std = float(np.std(residuals)) if len(residuals) > 1 else 0.0
        uncertainty = 1.5 * residual_std

        last_week = sorted_weeks[-1]
        forecast: List[Dict[str, Any]] = []
        for i in range(1, 5):
            future_x = float(n - 1 + i)
            predicted = float(max(0.0, slope * future_x + intercept))
            lower = float(max(0.0, predicted - uncertainty))
            upper = float(predicted + uncertainty)
            week_label = _week_label_from_index(last_week, i)
            forecast.append({
                "week": week_label,
                "predicted": round(predicted, 2),
                "lower": round(lower, 2),
                "upper": round(upper, 2),
            })

        # ---- Weekly data for frontend chart ----
        weekly_data = [
            {
                "week": sorted_weeks[i],
                "count": int(counts_arr[i]),
                "rollingAvg": round(rolling_avgs[i], 2) if rolling_avgs[i] is not None else None,
            }
            for i in range(n)
        ]

        # ---- Interpretation (cautious language) ----
        interpretation = (
            f"Based on available data ({n} week(s)), complaint frequency appears to be "
            f"{trend.lower()}. "
            f"The linear slope is {slope:+.3f} complaints/week "
            f"(R² = {r_squared:.2f}). "
            f"This projection should be interpreted as an indicator, not a certainty."
        )

        return {
            "trend": trend,
            "slope": round(slope, 4),
            "growthRate": round(growth_rate, 2),
            "weeklyData": weekly_data,
            "forecast": forecast,
            "confidence": round(confidence, 4),
            "dataPoints": n,
            "rSquared": round(r_squared, 4),
            "interpretation": interpretation,
        }
