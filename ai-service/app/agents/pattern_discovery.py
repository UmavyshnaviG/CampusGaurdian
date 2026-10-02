"""
Agent 3 — Pattern Discovery Agent

Responsibilities
----------------
* Extract and validate 384-dim embeddings from grievance dicts.
* Cluster with HDBSCAN (primary) or K-Means (fallback).
* Per-cluster deterministic statistics extraction.
* Rule-based pattern title and description generation.
* Produce pattern dicts ready for MongoDB upsert.

All clustering, statistics, similarity and math: deterministic ML/NumPy.
No LLM is used here.
"""
from __future__ import annotations

import logging
import math
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Category → department routing table (deterministic)
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_str(value: Any, fallback: str = "Unknown") -> str:
    """Return string value or fallback if None/empty."""
    if value is None:
        return fallback
    s = str(value).strip()
    return s if s else fallback


def _iso_week(dt: datetime) -> str:
    """Return ISO year-week string, e.g. '2024-W03'."""
    cal = dt.isocalendar()
    return f"{cal[0]}-W{cal[1]:02d}"


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


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two 1-D vectors."""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def _location_string(loc: Any) -> str:
    """
    Flatten a location dict or string into a readable label.
    Grievance.location is a sub-document with keys: type, campus, building,
    block, floor, room.
    """
    if isinstance(loc, str):
        return loc if loc.strip() else "Not Applicable"
    if isinstance(loc, dict):
        parts = []
        for key in ("building", "block", "floor", "room", "campus"):
            val = loc.get(key, "").strip()
            if val and val.lower() not in ("", "not applicable", "n/a"):
                parts.append(val)
        if not parts:
            return loc.get("type", "Not Applicable") or "Not Applicable"
        return ", ".join(parts)
    return "Not Applicable"


# ---------------------------------------------------------------------------
# PatternDiscoveryAgent
# ---------------------------------------------------------------------------

class PatternDiscoveryAgent:
    """
    Deterministic ML-based pattern discovery via embedding clustering.
    """

    AGENT_NAME = "pattern_discovery"
    EMBEDDING_DIM = 384
    MIN_VALID_EMBEDDINGS = 10

    def __init__(self) -> None:
        self._cluster_labels: Dict[str, int] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def discover(self, grievances: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Main entry point.

        Parameters
        ----------
        grievances : list of grievance dicts from MongoDB (lean())

        Returns
        -------
        list of pattern dicts ready for MongoDB upsert / AgentResponse
        """
        # ---- 1. Prepare embeddings ----
        valid_grievances, embeddings_matrix = self._prepare_embeddings(grievances)

        n = len(valid_grievances)
        if n < self.MIN_VALID_EMBEDDINGS:
            logger.warning(
                "[PatternDiscovery] Only %d valid embeddings found (need >= %d). "
                "Returning empty patterns.",
                n, self.MIN_VALID_EMBEDDINGS,
            )
            return []

        # ---- 2. Clustering ----
        labels, method_used, silhouette = self._cluster(embeddings_matrix)

        # Build mapping: grievanceId → clusterId
        self._cluster_labels = {}
        for i, g in enumerate(valid_grievances):
            gid = str(g.get("_id", i))
            self._cluster_labels[gid] = int(labels[i])

        # ---- 3. Extract per-cluster patterns ----
        unique_labels = sorted(set(labels))
        patterns: List[Dict[str, Any]] = []

        for cluster_id in unique_labels:
            if cluster_id == -1:
                # HDBSCAN noise — skip
                continue

            member_indices = [i for i, lbl in enumerate(labels) if lbl == cluster_id]
            if len(member_indices) < 3:
                continue  # too small to be a meaningful pattern

            member_grievances = [valid_grievances[i] for i in member_indices]
            member_embeddings = embeddings_matrix[member_indices]

            pattern = self._extract_pattern(
                cluster_id=cluster_id,
                members=member_grievances,
                embeddings=member_embeddings,
                method_used=method_used,
                silhouette_score=silhouette,
            )
            patterns.append(pattern)

        logger.info(
            "[PatternDiscovery] Discovered %d patterns from %d grievances "
            "using %s (silhouette=%.3f)",
            len(patterns), n, method_used, silhouette,
        )
        return patterns

    def get_cluster_labels(self) -> Dict[str, int]:
        """Return { grievanceId: clusterId } mapping from last discover() call."""
        return dict(self._cluster_labels)

    # ------------------------------------------------------------------
    # Step 1 — Prepare embeddings
    # ------------------------------------------------------------------

    def _prepare_embeddings(
        self, grievances: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], np.ndarray]:
        valid_gs: List[Dict[str, Any]] = []
        valid_emb: List[List[float]] = []

        for g in grievances:
            ai_meta = g.get("aiMetadata") or {}
            emb = ai_meta.get("embedding")
            if not isinstance(emb, (list, tuple)):
                continue
            if len(emb) != self.EMBEDDING_DIM:
                continue
            # Verify all are numeric
            try:
                arr = [float(v) for v in emb]
            except (TypeError, ValueError):
                continue
            valid_gs.append(g)
            valid_emb.append(arr)

        if not valid_emb:
            return [], np.empty((0, self.EMBEDDING_DIM))

        matrix = np.array(valid_emb, dtype=np.float32)
        return valid_gs, matrix

    # ------------------------------------------------------------------
    # Step 2 — Clustering
    # ------------------------------------------------------------------

    def _cluster(
        self, X: np.ndarray
    ) -> Tuple[np.ndarray, str, float]:
        """
        Returns (labels, method_name, silhouette_score).
        Tries HDBSCAN first; falls back to K-Means.
        """
        n = len(X)
        labels, method, score = self._try_hdbscan(X, n)

        # Evaluate: if < 2 meaningful clusters or poor silhouette → fallback
        unique_non_noise = [l for l in set(labels) if l != -1]
        if len(unique_non_noise) < 2 or score < 0.15:
            logger.info(
                "[PatternDiscovery] HDBSCAN produced %d clusters (score=%.3f). "
                "Falling back to K-Means.",
                len(unique_non_noise), score,
            )
            labels, method, score = self._kmeans_fallback(X, n)

        return labels, method, score

    def _try_hdbscan(
        self, X: np.ndarray, n: int
    ) -> Tuple[np.ndarray, str, float]:
        try:
            import hdbscan as hdbscan_lib  # type: ignore

            min_cluster_size = max(5, n // 50)
            clusterer = hdbscan_lib.HDBSCAN(
                min_cluster_size=min_cluster_size,
                min_samples=3,
                metric="euclidean",
            )
            labels = clusterer.fit_predict(X)
            score = self._silhouette(X, labels)
            logger.info(
                "[PatternDiscovery] HDBSCAN: min_cluster_size=%d, "
                "clusters=%d (excl. noise), silhouette=%.3f",
                min_cluster_size,
                len([l for l in set(labels) if l != -1]),
                score,
            )
            return labels, "HDBSCAN", score
        except Exception as exc:
            logger.warning("[PatternDiscovery] HDBSCAN failed: %s. Using K-Means.", exc)
            return np.zeros(len(X), dtype=int), "HDBSCAN_failed", -1.0

    def _kmeans_fallback(
        self, X: np.ndarray, n: int
    ) -> Tuple[np.ndarray, str, float]:
        from sklearn.cluster import KMeans  # type: ignore

        k_max = min(15, n // 10)
        if k_max < 2:
            k_max = 2

        best_k = 2
        best_score = -1.0
        best_labels: np.ndarray = np.zeros(n, dtype=int)

        for k in range(2, k_max + 1):
            try:
                km = KMeans(n_clusters=k, random_state=42, n_init=10)
                labels = km.fit_predict(X)
                s = self._silhouette(X, labels)
                if s > best_score:
                    best_score = s
                    best_k = k
                    best_labels = labels
            except Exception:
                continue

        logger.info(
            "[PatternDiscovery] K-Means: best_k=%d, silhouette=%.3f",
            best_k, best_score,
        )
        return best_labels, "KMeans", best_score

    def _silhouette(self, X: np.ndarray, labels: np.ndarray) -> float:
        """
        Compute silhouette score, excluding noise label -1.
        Returns -1.0 on failure (too few samples, single cluster, etc.).
        """
        try:
            from sklearn.metrics import silhouette_score  # type: ignore

            mask = labels != -1
            if mask.sum() < 2:
                return -1.0
            X_clean = X[mask]
            labels_clean = labels[mask]
            unique = set(labels_clean)
            if len(unique) < 2:
                return -1.0
            return float(silhouette_score(X_clean, labels_clean))
        except Exception:
            return -1.0

    # ------------------------------------------------------------------
    # Step 3 — Per-cluster pattern extraction
    # ------------------------------------------------------------------

    def _extract_pattern(
        self,
        cluster_id: int,
        members: List[Dict[str, Any]],
        embeddings: np.ndarray,
        method_used: str,
        silhouette_score: float,
    ) -> Dict[str, Any]:
        report_count = len(members)

        # --- Category ---
        categories = [_safe_str(g.get("category"), "Other") for g in members]
        category_dist = dict(Counter(categories))
        primary_category = Counter(categories).most_common(1)[0][0]

        # --- Location ---
        locations_raw = [_location_string(g.get("location")) for g in members]
        location_dist = dict(Counter(locations_raw))
        primary_location = Counter(locations_raw).most_common(1)[0][0]
        unique_locations = list(set(locations_raw))

        # --- Severity ---
        severities = [_safe_str(g.get("rawSeverity"), "Low") for g in members]
        severity_dist = dict(Counter(severities))

        # --- Sentiment ---
        sentiments = [
            _safe_str((g.get("aiMetadata") or {}).get("sentiment"), "neutral")
            for g in members
        ]
        sentiment_dist = dict(Counter(sentiments))

        # --- Stakeholder groups (userType / submitterType) ---
        user_types = [
            _safe_str(g.get("submitterType") or g.get("userType"), "unknown")
            for g in members
        ]
        stakeholder_dist = dict(Counter(user_types))
        primary_stakeholder = Counter(user_types).most_common(1)[0][0]

        # --- Department concentration ---
        depts = [_safe_str(g.get("submitterDept") or g.get("department"), "unknown")
                 for g in members]
        dept_dist = dict(Counter(depts))

        # --- Affected years ---
        years = [g.get("submitterYear") or g.get("year") for g in members]
        years_clean = [str(y) for y in years if y is not None]
        year_dist = dict(Counter(years_clean))

        # --- Keywords ---
        all_keywords: List[str] = []
        for g in members:
            kws = (g.get("aiMetadata") or {}).get("keywords") or []
            if isinstance(kws, list):
                all_keywords.extend([str(k).lower() for k in kws if k])
        keyword_counts = Counter(all_keywords)
        top_keywords = [kw for kw, _ in keyword_counts.most_common(10)]

        # --- Urgency / Confidence averages ---
        urgencies = [
            float((g.get("aiMetadata") or {}).get("urgency") or 0.0)
            for g in members
        ]
        avg_urgency = float(np.mean(urgencies)) if urgencies else 0.0

        confidences = [
            float((g.get("aiMetadata") or {}).get("confidence") or 0.0)
            for g in members
        ]
        avg_confidence = float(np.mean(confidences)) if confidences else 0.0

        # --- Time analysis ---
        dates: List[datetime] = []
        for g in members:
            dt = _parse_date(g.get("createdAt"))
            if dt is not None:
                dates.append(dt)

        first_seen = min(dates) if dates else None
        last_seen = max(dates) if dates else None

        # Weekly counts
        weekly_counts: Counter = Counter()
        for dt in dates:
            weekly_counts[_iso_week(dt)] += 1
        peak_week = weekly_counts.most_common(1)[0][0] if weekly_counts else None
        time_range = (
            f"{first_seen.strftime('%Y-%m-%d') if first_seen else '?'} to "
            f"{last_seen.strftime('%Y-%m-%d') if last_seen else '?'}"
        )
        num_weeks = len(weekly_counts)

        # --- Member grievance IDs ---
        member_ids = [str(g.get("_id", "")) for g in members]

        # --- Step 4: Pattern title (rule-based) ---
        title = self._make_title(
            primary_category=primary_category,
            primary_location=primary_location,
            location_dist=location_dist,
            primary_stakeholder=primary_stakeholder,
            stakeholder_dist=stakeholder_dist,
            top_keywords=top_keywords,
            report_count=report_count,
        )

        # --- Step 5: Pattern key ---
        cat_slug = primary_category.replace(" ", "_").upper()
        loc_slug = primary_location.replace(" ", "_").upper()[:20]
        pattern_key = f"{cat_slug}-{loc_slug}-{cluster_id}"

        # --- Step 6: Pattern description (template-based) ---
        description = (
            f"A cluster of {report_count} reports in category '{primary_category}' "
            f"concentrated at '{primary_location}'. "
            f"Reported by {primary_stakeholder}s across {num_weeks} week(s). "
            f"Average urgency: {avg_urgency:.2f}."
        )

        # --- Step 7: Evidence (representative complaints + distributions) ---
        evidence = self._build_evidence(
            members=members,
            embeddings=embeddings,
            category_dist=category_dist,
            location_dist=location_dist,
            severity_dist=severity_dist,
            time_range=time_range,
        )

        return {
            "patternKey": pattern_key,
            "title": title,
            "description": description,
            "clusterId": str(cluster_id),
            "category": primary_category,
            "primaryLocation": primary_location,
            "locations": unique_locations,
            "stakeholderGroups": stakeholder_dist,
            "timeWindow": {
                "firstSeen": first_seen.isoformat() if first_seen else None,
                "lastSeen": last_seen.isoformat() if last_seen else None,
                "peakWeek": peak_week,
            },
            "timeRange": time_range,
            "reportCount": report_count,
            "memberGrievanceIds": member_ids,
            "severityDistribution": severity_dist,
            "sentimentDistribution": sentiment_dist,
            "categoryDistribution": category_dist,
            "departmentConcentration": dept_dist,
            "affectedYears": year_dist,
            "weeklyTrend": dict(weekly_counts),
            "topKeywords": top_keywords,
            "avgUrgency": round(avg_urgency, 4),
            "avgConfidence": round(avg_confidence, 4),
            "evidence": evidence,
            "responsibleDepartment": CATEGORY_TO_DEPT.get(primary_category, "General Administration"),
            "silhouetteScore": round(silhouette_score, 4),
            "clusterMethod": method_used,
            "status": "active",
        }

    # ------------------------------------------------------------------
    # Step 4 — Pattern title (rule-based)
    # ------------------------------------------------------------------

    def _make_title(
        self,
        primary_category: str,
        primary_location: str,
        location_dist: Dict[str, int],
        primary_stakeholder: str,
        stakeholder_dist: Dict[str, int],
        top_keywords: List[str],
        report_count: int,
    ) -> str:
        total = sum(location_dist.values())
        top_loc_count = location_dist.get(primary_location, 0)
        location_is_diverse = total > 0 and (top_loc_count / total) < 0.4

        total_stakeholder = sum(stakeholder_dist.values())
        top_stakeholder_count = stakeholder_dist.get(primary_stakeholder, 0)
        stakeholder_concentrated = (
            total_stakeholder > 0
            and (top_stakeholder_count / total_stakeholder) >= 0.7
        )

        if location_is_diverse and stakeholder_concentrated:
            base = f"{primary_category} Issues - {primary_stakeholder.title()} Affected"
        elif location_is_diverse:
            base = f"{primary_category} Issues - Multiple Locations"
        else:
            base = f"{primary_category} Issues - {primary_location}"

        # Keyword refinements
        kw_lower = [k.lower() for k in top_keywords]
        if any(k in kw_lower for k in ("wifi", "wi-fi", "internet", "connectivity", "network")):
            base += " (Connectivity)"
        elif any(k in kw_lower for k in ("power", "electricity", "outage", "voltage")):
            base += " (Power)"
        elif any(k in kw_lower for k in ("water", "tap", "sanitation", "drain")):
            base += " (Water/Sanitation)"
        elif any(k in kw_lower for k in ("food", "meal", "hygiene", "canteen")):
            base += " (Food Quality)"

        return base

    # ------------------------------------------------------------------
    # Step 7 — Evidence list
    # ------------------------------------------------------------------

    def _build_evidence(
        self,
        members: List[Dict[str, Any]],
        embeddings: np.ndarray,
        category_dist: Dict[str, int],
        location_dist: Dict[str, int],
        severity_dist: Dict[str, int],
        time_range: str,
    ) -> List[str]:
        evidence: List[str] = []

        # 3-5 most central complaints (highest cosine sim to centroid)
        centroid = embeddings.mean(axis=0)
        sims = [_cosine_sim(embeddings[i], centroid) for i in range(len(members))]
        top_indices = sorted(range(len(sims)), key=lambda i: sims[i], reverse=True)[:5]

        for idx in top_indices:
            g = members[idx]
            desc = str(g.get("description", "")).strip()
            if desc:
                # Truncate long descriptions
                excerpt = desc[:200] + ("…" if len(desc) > 200 else "")
                evidence.append(f'"{excerpt}"')

        # Distribution summary
        top_cats = Counter(category_dist).most_common(3)
        evidence.append(
            "Category distribution: " + ", ".join(f"{k}: {v}" for k, v in top_cats)
        )
        top_locs = Counter(location_dist).most_common(3)
        evidence.append(
            "Location distribution: " + ", ".join(f"{k}: {v}" for k, v in top_locs)
        )
        top_sev = Counter(severity_dist).most_common(4)
        evidence.append(
            "Severity distribution: " + ", ".join(f"{k}: {v}" for k, v in top_sev)
        )
        evidence.append(f"Time range: {time_range}")

        return evidence
