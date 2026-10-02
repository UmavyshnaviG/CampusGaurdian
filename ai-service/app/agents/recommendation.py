"""
Agent 6 — Recommendation Agent

Responsibilities
----------------
* Receive a pattern dict, a diagnosis dict, and a prediction dict.
* Build a structured, evidence-backed recommendation.
* All logic is rule-based (deterministic). No LLM.
* Action templates are interpolated with actual values from input dicts.
* Never hardcodes specific names, dates, or counts.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Action template table — keyed by (category_slug, urgency_bucket)
# Both keys are lower-cased for matching.
# Templates use {primary_location} and {dept} placeholders.
# ---------------------------------------------------------------------------

ACTION_TEMPLATES: Dict[str, Dict[str, str]] = {
    "network/it": {
        "high": (
            "Conduct an immediate network infrastructure audit in {primary_location}. "
            "Assess bandwidth capacity and access point coverage in affected areas. "
            "Implement temporary bandwidth management measures while a permanent "
            "upgrade plan is developed."
        ),
        "low": (
            "Schedule a routine network performance review for {primary_location}. "
            "Evaluate upgrade options and assess whether current infrastructure "
            "meets expected demand."
        ),
    },
    "network / it": {
        "high": (
            "Conduct an immediate network infrastructure audit in {primary_location}. "
            "Assess bandwidth capacity and access point coverage in affected areas. "
            "Implement temporary bandwidth management measures while a permanent "
            "upgrade plan is developed."
        ),
        "low": (
            "Schedule a routine network performance review for {primary_location}. "
            "Evaluate upgrade options and assess whether current infrastructure "
            "meets expected demand."
        ),
    },
    "electricity": {
        "any": (
            "Conduct an electrical safety inspection at {primary_location}. "
            "Check load capacity, wiring connections, and maintenance records. "
            "Coordinate with the {dept} to schedule any required remedial work "
            "and to review backup power provisions."
        ),
    },
    "infrastructure": {
        "high": (
            "Initiate a structural and facilities review at {primary_location} "
            "through the {dept}. Document defects with photographic evidence and "
            "prioritise repairs according to safety risk."
        ),
        "low": (
            "Log a maintenance request for {primary_location} with the {dept}. "
            "Schedule an inspection to assess the extent of the issue and "
            "estimate remediation costs."
        ),
    },
    "hostel": {
        "high": (
            "Escalate to the {dept} for an immediate facility inspection at "
            "{primary_location}. Address urgent maintenance items and review "
            "service delivery standards."
        ),
        "low": (
            "Raise a maintenance review with the {dept} covering reported "
            "issues at {primary_location}. Update the preventive maintenance "
            "schedule accordingly."
        ),
    },
    "transport": {
        "any": (
            "Request a transport operations review from the {dept} covering routes "
            "and scheduling for {primary_location}. Assess vehicle availability and "
            "identify bottlenecks during peak demand periods."
        ),
    },
    "academic": {
        "high": (
            "Refer the pattern to the {dept} for urgent review. Investigate "
            "resource constraints, faculty availability, and curriculum issues "
            "associated with {primary_location}."
        ),
        "low": (
            "Request a departmental review by the {dept} to address the "
            "reported academic concerns at {primary_location}."
        ),
    },
    "water/sanitation": {
        "high": (
            "Arrange an immediate inspection of water and sanitation facilities "
            "at {primary_location} by the {dept}. Assess pipe conditions, "
            "hygiene standards, and contractor response times."
        ),
        "low": (
            "Schedule a routine inspection of water and sanitation facilities "
            "at {primary_location}. Coordinate with the {dept} to address "
            "pending repair requests."
        ),
    },
    "water / sanitation": {
        "high": (
            "Arrange an immediate inspection of water and sanitation facilities "
            "at {primary_location} by the {dept}. Assess pipe conditions, "
            "hygiene standards, and contractor response times."
        ),
        "low": (
            "Schedule a routine inspection of water and sanitation facilities "
            "at {primary_location}. Coordinate with the {dept} to address "
            "pending repair requests."
        ),
    },
    "library": {
        "any": (
            "Request a resources and capacity review from the {dept} for "
            "{primary_location}. Evaluate study space availability, digital "
            "access systems, and staffing levels during peak periods."
        ),
    },
    "canteen": {
        "high": (
            "Arrange an immediate food safety inspection at {primary_location} "
            "by the {dept}. Review supplier quality, hygiene practices, and "
            "staff training records."
        ),
        "low": (
            "Schedule a routine food quality and hygiene audit for "
            "{primary_location} with the {dept}."
        ),
    },
    "maintenance": {
        "high": (
            "Escalate outstanding maintenance items at {primary_location} to the "
            "{dept} for priority scheduling. Conduct a systematic review of the "
            "maintenance backlog and agree completion timelines."
        ),
        "low": (
            "Raise the reported maintenance concerns at {primary_location} with "
            "the {dept}. Ensure items are logged in the maintenance management "
            "system and assigned to a technician."
        ),
    },
    "harassment": {
        "any": (
            "Refer this pattern to the {dept} for a confidential review under "
            "campus anti-harassment policy. Ensure appropriate support mechanisms "
            "are in place and that affected individuals are aware of reporting channels. "
            "Do not share identifying information outside authorised roles."
        ),
    },
    "bullying": {
        "any": (
            "Refer this pattern to the {dept} for review under the campus "
            "anti-bullying policy. Assess peer support and mediation resources "
            "and consider targeted awareness sessions."
        ),
    },
    "ragging": {
        "any": (
            "Escalate to the {dept} in accordance with anti-ragging regulations. "
            "Conduct awareness programs for new students and increase monitoring "
            "in identified high-risk areas."
        ),
    },
    "discrimination": {
        "any": (
            "Refer to the {dept} for review under the campus equity and inclusion "
            "policy. Assess the need for targeted training and evaluate "
            "policy enforcement gaps."
        ),
    },
    "safety": {
        "high": (
            "Initiate an immediate safety review of {primary_location} with the "
            "{dept}. Assess lighting, CCTV coverage, and incident response "
            "procedures. Implement interim safety measures as required."
        ),
        "low": (
            "Request a routine safety audit of {primary_location} from the {dept}. "
            "Review reported concerns and update the campus safety register."
        ),
    },
    "other": {
        "any": (
            "Refer the reported concerns to the {dept} for assessment and "
            "allocation to the appropriate department or policy owner. "
            "Document findings and agree a response timeline."
        ),
    },
}

_DEFAULT_TEMPLATE = (
    "Refer the reported pattern at {primary_location} to the {dept} for review. "
    "Investigate root causes, agree remedial actions, and establish a response timeline."
)


def _urgency_bucket(avg_urgency: float) -> str:
    """Map 0-1 urgency to 'high' or 'low' bucket for template lookup."""
    return "high" if avg_urgency >= 0.5 else "low"


def _urgency_label(avg_urgency: float) -> str:
    if avg_urgency >= 0.8:
        return "Critical"
    if avg_urgency >= 0.6:
        return "High"
    if avg_urgency >= 0.4:
        return "Medium"
    return "Low"


def _build_action_text(
    category: str,
    urgency_bucket: str,
    primary_location: str,
    dept: str,
) -> str:
    cat_key = category.lower()
    templates_for_cat = ACTION_TEMPLATES.get(cat_key, {})

    if not templates_for_cat:
        template = _DEFAULT_TEMPLATE
    else:
        template = (
            templates_for_cat.get(urgency_bucket)
            or templates_for_cat.get("any")
            or _DEFAULT_TEMPLATE
        )

    return template.format(
        primary_location=primary_location or "the affected area",
        dept=dept or "the responsible department",
    )


# ===========================================================================
# RecommendationAgent
# ===========================================================================

class RecommendationAgent:
    """
    Stateless rule-based recommendation agent.
    Call .recommend(pattern, diagnosis, prediction) to produce a recommendation dict.
    """

    AGENT_NAME = "recommendation"

    def recommend(
        self,
        pattern: Dict[str, Any],
        diagnosis: Dict[str, Any],
        prediction: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Build a structured evidence-backed recommendation.

        Parameters
        ----------
        pattern   : pattern dict from PatternDiscoveryAgent
        diagnosis : diagnosis dict from DiagnosticAgent
        prediction: prediction dict from PredictionAgent

        Returns
        -------
        dict with problem, observedPattern, evidence, possibleContributingFactors,
             suggestedAction, responsibleDepartment, urgencyLevel, confidence, language
        """
        # ---- Basic fields ----
        title = str(pattern.get("title") or "Unidentified Pattern")
        category = str(pattern.get("category") or "Other")
        primary_location = str(pattern.get("primaryLocation") or "Unknown Location")
        report_count = int(pattern.get("reportCount") or 0)
        time_range = str(pattern.get("timeRange") or "unknown period")
        avg_urgency = float(pattern.get("avgUrgency") or 0.0)
        pattern_evidence: List[str] = pattern.get("evidence") or []

        diagnosis_summary = str(diagnosis.get("summary") or "")
        concentration = str(diagnosis.get("concentrationAnalysis") or "")
        possible_factors: List[str] = diagnosis.get("possibleFactors") or []
        recommended_dept = str(
            diagnosis.get("recommendedDepartment")
            or pattern.get("responsibleDepartment")
            or "General Administration"
        )

        pred_trend = str(prediction.get("trend") or "Unknown")
        pred_confidence = float(prediction.get("confidence") or 0.0)

        # ---- 1. Problem statement ----
        problem = (
            f"{title}: {diagnosis_summary}"
            if diagnosis_summary
            else f"{title} — pattern identified in category '{category}'."
        )

        # ---- 2. Observed pattern ----
        observed_pattern = (
            f"{report_count} report(s) in the '{category}' category "
            f"concentrated at '{primary_location}', spanning {time_range}. "
            f"Trend analysis indicates the pattern is currently '{pred_trend}'."
        )
        if concentration:
            observed_pattern += f" {concentration}"

        # ---- 3. Evidence (top 3 from pattern) ----
        evidence_items: List[str] = []
        for ev in pattern_evidence[:3]:
            if ev.startswith('"'):
                evidence_items.append(ev)
        # If fewer than 3 quoted evidence items, include distribution summaries
        for ev in pattern_evidence:
            if not ev.startswith('"') and len(evidence_items) < 3:
                evidence_items.append(ev)
        # Ensure at least one item
        if not evidence_items:
            evidence_items = [
                f"Pattern contains {report_count} reports in '{category}' "
                f"category at '{primary_location}'."
            ]

        # ---- 4. Possible contributing factors ----
        factors = possible_factors[:3] if possible_factors else [
            "Insufficient data to determine contributing factors."
        ]

        # ---- 5. Suggested action (rule-based, no hardcoding) ----
        urgency_bucket = _urgency_bucket(avg_urgency)
        suggested_action = _build_action_text(
            category=category,
            urgency_bucket=urgency_bucket,
            primary_location=primary_location,
            dept=recommended_dept,
        )

        # ---- 6. Urgency level label ----
        urgency_level = _urgency_label(avg_urgency)

        # ---- 7. Confidence (pattern strength + prediction confidence + evidence) ----
        n_evidence = min(len(pattern_evidence), 5)
        evidence_score = n_evidence / 5.0
        volume_score = min(report_count / 50.0, 1.0)
        confidence = round(
            0.4 * volume_score + 0.3 * pred_confidence + 0.3 * evidence_score,
            4,
        )

        return {
            "problem": problem,
            "observedPattern": observed_pattern,
            "evidence": evidence_items,
            "possibleContributingFactors": factors,
            "suggestedAction": suggested_action,
            "responsibleDepartment": recommended_dept,
            "urgencyLevel": urgency_level,
            "confidence": confidence,
            "language": "evidence-based",
        }
