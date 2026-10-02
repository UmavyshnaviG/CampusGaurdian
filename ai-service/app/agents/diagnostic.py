"""
Agent 4 — Diagnostic Agent

Responsibilities
----------------
* Receive a pattern bundle from the Pattern Discovery Agent.
* Build evidence-backed diagnosis using deterministic string construction.
* All language is deliberately cautious — never claims certainty.
* Rule-based routing to responsible department.
* Returns structured diagnosis dict for admin review.

No LLM is used here.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Category → possible contributing factors (deterministic rule table)
# ---------------------------------------------------------------------------

CATEGORY_FACTORS: Dict[str, List[str]] = {
    "Network/IT": [
        "network infrastructure capacity limitations",
        "bandwidth sharing during peak hours",
        "hardware aging or outdated equipment",
        "insufficient access points or coverage gaps",
        "ISP-level throttling or outage events",
    ],
    "Network / IT": [
        "network infrastructure capacity limitations",
        "bandwidth sharing during peak hours",
        "hardware aging or outdated equipment",
    ],
    "Electricity": [
        "aging electrical infrastructure",
        "overloaded circuits during peak demand",
        "maintenance backlog for electrical assets",
        "inadequate backup power or generator capacity",
        "scheduled or unscheduled utility interruptions",
    ],
    "Infrastructure": [
        "deferred maintenance on structural elements",
        "wear and tear from high foot traffic",
        "material aging or weathering",
        "insufficient budget allocation for repairs",
    ],
    "Hostel": [
        "facility management coordination issues",
        "aging hostel infrastructure",
        "seasonal demand fluctuations",
        "supply chain delays for maintenance materials",
    ],
    "Transport": [
        "route planning inefficiencies",
        "vehicle maintenance backlogs",
        "driver availability or scheduling conflicts",
        "insufficient transport capacity during peak hours",
    ],
    "Academic": [
        "high student-to-faculty ratio",
        "classroom or laboratory resource constraints",
        "curriculum or examination policy gaps",
        "communication gaps between faculty and students",
    ],
    "Water/Sanitation": [
        "aging or corroded water supply pipes",
        "insufficient maintenance of sanitation facilities",
        "high demand during peak usage periods",
        "contractor delays in repair work",
    ],
    "Water / Sanitation": [
        "aging or corroded water supply pipes",
        "insufficient maintenance of sanitation facilities",
        "high demand during peak usage periods",
    ],
    "Library": [
        "resource procurement delays",
        "outdated catalog or digital access systems",
        "insufficient study space relative to demand",
        "understaffing during peak periods",
    ],
    "Canteen": [
        "supplier quality inconsistency",
        "inadequate food safety inspection frequency",
        "understaffing or inadequate staff training",
        "procurement or logistics challenges",
    ],
    "Maintenance": [
        "backlog of pending maintenance requests",
        "insufficient maintenance staff or budget",
        "poor coordination between reporting and resolution teams",
        "aging campus assets requiring systematic replacement",
    ],
    "Harassment": [
        "gaps in awareness or sensitivity training",
        "inadequate reporting or escalation mechanisms",
        "insufficient awareness of anti-harassment policies",
    ],
    "Bullying": [
        "gaps in student welfare monitoring",
        "insufficient peer support or mediation systems",
        "low awareness of anti-bullying policies",
    ],
    "Ragging": [
        "gaps in anti-ragging awareness programs",
        "insufficient monitoring in high-risk areas",
        "peer pressure dynamics among new students",
    ],
    "Discrimination": [
        "gaps in equity and inclusion training",
        "insufficient enforcement of non-discrimination policies",
        "institutional culture gaps requiring review",
    ],
    "Safety": [
        "gaps in campus safety infrastructure",
        "insufficient lighting or CCTV coverage",
        "delayed response to safety incident reports",
    ],
    "Other": [
        "unclear ownership of the reported issue",
        "possible gaps in campus policy coverage",
        "multi-department coordination challenges",
    ],
}


# ---------------------------------------------------------------------------
# Category → responsible department (deterministic routing)
# ---------------------------------------------------------------------------

CATEGORY_TO_DEPT: Dict[str, str] = {
    "Network/IT": "IT Department",
    "Network / IT": "IT Department",
    "Electricity": "Electrical Maintenance",
    "Infrastructure": "Facilities Management",
    "Hostel": "Hostel Administration",
    "Transport": "Transport Office",
    "Academic": "Academic Affairs",
    "Water/Sanitation": "Civil/Sanitation",
    "Water / Sanitation": "Civil/Sanitation",
    "Library": "Library Administration",
    "Canteen": "Catering Services",
    "Maintenance": "Facilities Management",
    "Harassment": "Student Affairs / Sensitive Officer",
    "Bullying": "Student Affairs / Sensitive Officer",
    "Ragging": "Anti-Ragging Committee",
    "Discrimination": "Student Affairs",
    "Safety": "Campus Security",
    "Other": "General Administration",
}


# ===========================================================================
# DiagnosticAgent
# ===========================================================================


class DiagnosticAgent:
    """
    Stateless agent — call .diagnose(pattern) to produce a diagnosis dict.
    All reasoning is deterministic (rule-based string construction).
    """

    AGENT_NAME = "diagnostic"

    def diagnose(self, pattern: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build an evidence-backed diagnosis from a pattern dict.

        Parameters
        ----------
        pattern : dict as returned by PatternDiscoveryAgent.discover()

        Returns
        -------
        dict: { summary, concentrationAnalysis, possibleFactors,
                recommendedDepartment, language, confidence }
        """
        category = str(pattern.get("category") or "Other")
        primary_location = str(pattern.get("primaryLocation") or "Unknown Location")
        report_count = int(pattern.get("reportCount") or 0)
        time_range = str(pattern.get("timeRange") or "Unknown period")
        avg_urgency = float(pattern.get("avgUrgency") or 0.0)
        avg_confidence = float(pattern.get("avgConfidence") or 0.0)
        time_window = pattern.get("timeWindow") or {}
        peak_week = time_window.get("peakWeek")
        severity_dist: Dict[str, int] = pattern.get("severityDistribution") or {}
        location_dist: Dict[str, int] = pattern.get("categoryDistribution") or {}
        category_dist: Dict[str, int] = pattern.get("categoryDistribution") or {}
        stakeholder_groups: Dict[str, int] = pattern.get("stakeholderGroups") or {}
        top_keywords: List[str] = pattern.get("topKeywords") or []
        weekly_trend: Dict[str, int] = pattern.get("weeklyTrend") or {}

        # ---- Step 1: Pattern summary ----
        summary = self._build_summary(
            report_count=report_count,
            category=category,
            primary_location=primary_location,
            time_range=time_range,
            avg_urgency=avg_urgency,
            severity_dist=severity_dist,
        )

        # ---- Step 2: Concentration analysis ----
        concentration = self._build_concentration_analysis(
            primary_location=primary_location,
            location_dist=location_dist,
            category=category,
            category_dist=category_dist,
            peak_week=peak_week,
            weekly_trend=weekly_trend,
            stakeholder_groups=stakeholder_groups,
        )

        # ---- Step 3: Possible contributing factors ----
        factors = self._select_factors(category, top_keywords)

        # ---- Step 4: Recommended department ----
        recommended_dept = CATEGORY_TO_DEPT.get(category, "General Administration")

        # ---- Step 5: Composite confidence ----
        confidence = self._compute_confidence(report_count, avg_confidence, avg_urgency)

        return {
            "summary": summary,
            "concentrationAnalysis": concentration,
            "possibleFactors": factors,
            "recommendedDepartment": recommended_dept,
            "language": "evidence-based",
            "confidence": round(confidence, 4),
            "avgUrgency": round(avg_urgency, 4),
            "warnings": [
                "All findings are based on available data and require human verification.",
                "This diagnosis does not constitute a final determination.",
            ],
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_summary(
        self,
        report_count: int,
        category: str,
        primary_location: str,
        time_range: str,
        avg_urgency: float,
        severity_dist: Dict[str, int],
    ) -> str:
        urgency_label = self._urgency_label(avg_urgency)
        high_critical = severity_dist.get("High", 0) + severity_dist.get("Critical", 0)

        summary = (
            f"Data shows {report_count} report(s) in the '{category}' category "
            f"with primary concentration at '{primary_location}', spanning {time_range}. "
            f"Average urgency is {urgency_label} ({avg_urgency:.2f}). "
        )
        if high_critical > 0:
            summary += (
                f"Notably, {high_critical} report(s) are rated High or Critical severity, "
                f"suggesting this pattern may require prompt attention. "
            )
        summary += "Further verification may be required before escalating."
        return summary

    def _build_concentration_analysis(
        self,
        primary_location: str,
        location_dist: Dict[str, int],
        category: str,
        category_dist: Dict[str, int],
        peak_week: Optional[str],
        weekly_trend: Dict[str, int],
        stakeholder_groups: Dict[str, int],
    ) -> str:
        lines: List[str] = []

        # Location concentration
        total_reports = sum(location_dist.values()) if location_dist else 0
        if total_reports > 0:
            top_count = max(location_dist.values())
            pct = top_count / total_reports * 100
            if pct > 60:
                lines.append(
                    f"The pattern is strongly concentrated at '{primary_location}' "
                    f"({pct:.0f}% of cluster reports)."
                )
            else:
                lines.append(
                    f"Reports are distributed across multiple locations; "
                    f"'{primary_location}' is the most frequent site ({pct:.0f}%)."
                )

        # Category concentration
        if category_dist:
            cat_total = sum(category_dist.values())
            primary_cat_count = category_dist.get(category, 0)
            if cat_total > 0 and (primary_cat_count / cat_total) > 0.8:
                lines.append(
                    f"A possible contributing factor is the predominantly "
                    f"'{category}' category nature of this pattern "
                    f"({primary_cat_count}/{cat_total} reports)."
                )

        # Temporal analysis
        if peak_week and weekly_trend:
            peak_count = weekly_trend.get(peak_week, 0)
            avg_weekly = sum(weekly_trend.values()) / len(weekly_trend)
            if peak_count > avg_weekly * 1.5:
                lines.append(
                    f"The pattern peaked in week '{peak_week}' with {peak_count} report(s), "
                    f"notably above the weekly average of {avg_weekly:.1f}. "
                    f"A possible contributing factor is a localized event or deterioration "
                    f"during that period."
                )
            else:
                lines.append(
                    f"Complaints have been spread relatively evenly over time "
                    f"(peak week: '{peak_week}' with {peak_count} report(s))."
                )

        # Stakeholder analysis
        if stakeholder_groups:
            total_sg = sum(stakeholder_groups.values())
            top_sg, top_sg_count = max(stakeholder_groups.items(), key=lambda x: x[1])
            pct_sg = top_sg_count / total_sg * 100 if total_sg > 0 else 0
            if pct_sg > 60:
                lines.append(
                    f"The pattern is predominantly affecting '{top_sg}' stakeholders "
                    f"({pct_sg:.0f}% of reports). Further verification may be required "
                    f"to understand whether this reflects actual disproportionate impact "
                    f"or reporting rate differences."
                )

        if not lines:
            lines.append(
                "Insufficient data for detailed concentration analysis. "
                "Further verification may be required."
            )

        return " ".join(lines)

    def _select_factors(
        self, category: str, top_keywords: List[str]
    ) -> List[str]:
        """
        Return 2-3 most relevant possible factors based on category and keywords.
        Uses rule table — no LLM.
        """
        all_factors = CATEGORY_FACTORS.get(category, CATEGORY_FACTORS["Other"])

        kw_lower = [k.lower() for k in top_keywords]

        def relevance(factor: str) -> int:
            """Count keyword matches in the factor string."""
            factor_lower = factor.lower()
            return sum(1 for kw in kw_lower if kw in factor_lower)

        ranked = sorted(all_factors, key=relevance, reverse=True)
        return ranked[:3]

    def _urgency_label(self, urgency: float) -> str:
        if urgency >= 0.8:
            return "very high"
        if urgency >= 0.6:
            return "high"
        if urgency >= 0.4:
            return "moderate"
        if urgency >= 0.2:
            return "low"
        return "very low"

    def _compute_confidence(
        self,
        report_count: int,
        avg_confidence: float,
        avg_urgency: float,
    ) -> float:
        """
        Composite confidence: weighted average of
        - volume score (more reports → higher confidence)
        - AI confidence score from feedback intelligence agent
        - urgency as a signal of pattern strength
        """
        # Volume score: saturates at 50 reports → 1.0
        volume_score = min(report_count / 50.0, 1.0)
        confidence = (
            0.4 * volume_score
            + 0.4 * avg_confidence
            + 0.2 * avg_urgency
        )
        return max(0.0, min(1.0, confidence))
