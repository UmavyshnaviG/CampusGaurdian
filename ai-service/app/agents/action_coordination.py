"""
Agent 7 — Action Coordination Agent

Responsibilities
----------------
* Receive a recommendation dict, a pattern dict, and an optional department dict.
* Generate a dynamic email draft from actual data values.
* Never hardcodes names, dates, or counts — all values come from input dicts.
* Validate delivery method based on environment configuration.

No LLM is used here.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


# ===========================================================================
# ActionCoordinationAgent
# ===========================================================================

class ActionCoordinationAgent:
    """
    Stateless agent — call .generate_draft(recommendation, pattern, department)
    to produce an email draft dict.
    """

    AGENT_NAME = "action_coordination"

    def generate_draft(
        self,
        recommendation: Dict[str, Any],
        pattern: Dict[str, Any],
        department: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Generate a dynamic professional email draft.

        Parameters
        ----------
        recommendation : recommendation dict from RecommendationAgent
        pattern        : pattern dict from PatternDiscoveryAgent
        department     : department dict from DB (may be None if not configured)

        Returns
        -------
        dict: { subject, body, toEmail, deliveryMethod, disclaimer, generatedFrom }
        """
        # ---- Extract values ----
        pattern_title = str(pattern.get("title") or "Unknown Pattern")
        urgency_level = str(recommendation.get("urgencyLevel") or "Medium")
        problem = str(recommendation.get("problem") or "an identified campus issue")
        suggested_action = str(recommendation.get("suggestedAction") or "Review and take appropriate action.")
        observed_pattern = str(recommendation.get("observedPattern") or "")
        report_count = int(pattern.get("reportCount") or 0)
        primary_location = str(pattern.get("primaryLocation") or "the campus")
        time_range = str(pattern.get("timeRange") or "recent period")
        evidence_list = recommendation.get("evidence") or []
        responsible_dept = str(
            recommendation.get("responsibleDepartment")
            or pattern.get("responsibleDepartment")
            or "the relevant department"
        )

        # Department-specific values
        head_name: Optional[str] = None
        sla_hours: int = 72
        contact_email: Optional[str] = None
        dept_name: str = responsible_dept

        if department:
            head_name = department.get("headName") or None
            sla_raw = department.get("slaHours")
            if sla_raw is not None:
                try:
                    sla_hours = int(sla_raw)
                except (TypeError, ValueError):
                    sla_hours = 72
            contact_email = department.get("contactEmail") or None
            dept_name = str(department.get("name") or responsible_dept)

        # ---- 1. Compose subject ----
        subject = f"Action Required: {pattern_title} — {urgency_level} Priority"

        # ---- 2. Compose body ----
        greeting = f"Dear {head_name}" if head_name else "Dear Department Head"

        # Evidence bullets (top 3)
        evidence_bullets = ""
        if evidence_list:
            bullet_lines = [
                f"  • {ev}" for ev in evidence_list[:3]
            ]
            evidence_bullets = "\n".join(bullet_lines)
        else:
            evidence_bullets = "  • No specific evidence items available."

        body_lines = [
            f"{greeting},",
            "",
            (
                f"This communication is regarding a pattern of {problem} "
                f"identified through the Campus Guardian 360 AI analysis system."
            ),
            "",
            "PATTERN DETAILS",
            "---------------",
            f"Pattern Title : {pattern_title}",
            f"Report Count  : {report_count} report(s)",
            f"Date Range    : {time_range}",
            f"Primary Location: {primary_location}",
            f"Department    : {dept_name}",
            "",
        ]

        if observed_pattern:
            body_lines += [
                "OBSERVED PATTERN",
                "----------------",
                observed_pattern,
                "",
            ]

        body_lines += [
            "SUPPORTING EVIDENCE",
            "-------------------",
            evidence_bullets,
            "",
            "REQUESTED ACTION",
            "----------------",
            suggested_action,
            "",
            "RESPONSE TIMELINE",
            "-----------------",
            (
                f"Please acknowledge receipt and provide an initial response "
                f"within {sla_hours} hours of acknowledgement."
            ),
            "",
            "---",
            "This is a system-generated draft. Please review and edit before sending.",
            (
                "Campus Guardian 360 — AI-Driven Smart Campus Feedback, "
                "Grievance and Operations Intelligence System"
            ),
        ]

        body = "\n".join(body_lines)

        # ---- 3. Email delivery method ----
        smtp_host = os.environ.get("SMTP_HOST", "").strip()
        smtp_user = os.environ.get("SMTP_USER", "").strip()

        if not smtp_host or not smtp_user:
            delivery_method = "draft_only"
        elif not contact_email:
            delivery_method = "manual"
        else:
            delivery_method = "email"

        # ---- 4. Return ----
        pattern_id = pattern.get("_id")
        if hasattr(pattern_id, "__str__"):
            pattern_id = str(pattern_id)

        return {
            "subject": subject,
            "body": body,
            "toEmail": contact_email,
            "deliveryMethod": delivery_method,
            "disclaimer": (
                "This is a system-generated draft. Review and edit before sending."
            ),
            "generatedFrom": {
                "patternId": pattern_id,
                "recommendationTitle": problem,
            },
        }
