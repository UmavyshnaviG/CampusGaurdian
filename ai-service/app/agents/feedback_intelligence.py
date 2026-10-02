"""
Agent 2 — Feedback Intelligence Agent

Responsibilities
----------------
* Text pre-processing (deterministic)
* Topic / subTopic / issueType extraction (rule-based + TF-IDF-like)
* Keyword extraction (frequency-based)
* Sentiment analysis (VADER — deterministic ML)
* Urgency scoring (weighted deterministic formula)
* Sensitive-flag detection (rule-based)
* Embedding generation (sentence-transformers, 384-dim)
* Priority recommendation (rule-based)
* Confidence scoring (composite)
* Returns AIMetadata
"""
from __future__ import annotations

import logging
import re
import string
from collections import Counter
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy imports (heavy libs loaded once on first use)
# ---------------------------------------------------------------------------

_vader = None       # SentimentIntensityAnalyzer
_stemmer = None     # PorterStemmer
_stop_words = None  # set of english stopwords


def _get_vader():
    global _vader
    if _vader is None:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer  # type: ignore
        _vader = SentimentIntensityAnalyzer()
    return _vader


def _get_stemmer():
    global _stemmer
    if _stemmer is None:
        from nltk.stem import PorterStemmer  # type: ignore
        _stemmer = PorterStemmer()
    return _stemmer


def _get_stop_words() -> set:
    global _stop_words
    if _stop_words is None:
        from nltk.corpus import stopwords  # type: ignore
        _stop_words = set(stopwords.words("english"))
    return _stop_words


# ---------------------------------------------------------------------------
# Category → topic mapping
# ---------------------------------------------------------------------------

CATEGORY_TOPIC_MAP: dict = {
    "Academic": "Academic",
    "Infrastructure": "Infrastructure",
    "Network / IT": "Network",
    "Hostel": "Hostel",
    "Transport": "Transport",
    "Electricity": "Utilities",
    "Water / Sanitation": "Utilities",
    "Library": "Library",
    "Canteen": "Canteen",
    "Maintenance": "Maintenance",
    "Harassment": "Safety & Welfare",
    "Bullying": "Safety & Welfare",
    "Ragging": "Safety & Welfare",
    "Discrimination": "Safety & Welfare",
    "Safety": "Safety & Welfare",
    "Other": "General",
}

# ---------------------------------------------------------------------------
# Subtopic keyword rules: (category_group, keyword_list) → subtopic
# ---------------------------------------------------------------------------

SUBTOPIC_RULES: List[Tuple[List[str], List[str], str]] = [
    # Network / IT
    (["Network / IT", "Hostel"], ["wifi", "wi-fi", "internet", "network", "speed", "slow", "bandwidth"], "Connectivity"),
    (["Network / IT"], ["password", "login", "access", "account", "credentials", "portal"], "Access"),
    (["Network / IT"], ["server", "down", "offline", "outage", "maintenance"], "Server Downtime"),
    (["Network / IT"], ["printer", "scanner", "lab", "computer", "desktop", "laptop"], "Hardware"),
    # Infrastructure
    (["Infrastructure"], ["roof", "ceiling", "wall", "floor", "crack", "damage", "broken", "leaking"], "Structural Damage"),
    (["Infrastructure"], ["door", "window", "lock", "glass", "handle"], "Fixtures"),
    (["Infrastructure"], ["classroom", "lecture", "hall", "projector", "board", "ac", "air"], "Classroom Facilities"),
    # Hostel
    (["Hostel"], ["water", "tap", "bathroom", "toilet", "sanitation", "drain"], "Water Supply"),
    (["Hostel"], ["electricity", "power", "light", "fan", "switch"], "Electricity"),
    (["Hostel"], ["wifi", "internet", "network", "signal"], "Network"),
    (["Hostel"], ["food", "mess", "canteen", "meal", "hygiene"], "Mess & Food"),
    (["Hostel"], ["security", "guard", "cctv", "gate", "lock"], "Security"),
    # Utilities
    (["Electricity"], ["power", "outage", "cut", "fluctuation", "voltage", "generator", "backup"], "Power Outage"),
    (["Electricity"], ["light", "fan", "ac", "appliance", "socket", "switch"], "Appliance Fault"),
    (["Water / Sanitation"], ["water", "tap", "supply", "pipe", "leakage"], "Water Supply"),
    (["Water / Sanitation"], ["toilet", "bathroom", "drain", "sewage", "smell", "dirty"], "Sanitation"),
    # Transport
    (["Transport"], ["bus", "route", "timing", "schedule", "delay", "late"], "Bus Service"),
    (["Transport"], ["cab", "auto", "parking", "vehicle", "drive"], "Other Transport"),
    # Library
    (["Library"], ["book", "journal", "resource", "catalog", "borrow", "return"], "Resources"),
    (["Library"], ["noise", "quiet", "study", "environment", "seat", "space"], "Environment"),
    (["Library"], ["system", "software", "computer", "online", "portal"], "Digital Access"),
    # Canteen
    (["Canteen"], ["food", "quality", "taste", "stale", "hygiene", "clean"], "Food Quality"),
    (["Canteen"], ["price", "cost", "expensive", "overcharge", "billing"], "Pricing"),
    (["Canteen"], ["staff", "rude", "service", "slow", "queue"], "Service"),
    # Maintenance
    (["Maintenance"], ["repair", "fix", "broken", "damage", "worn", "replace"], "Repair"),
    (["Maintenance"], ["clean", "dirty", "hygiene", "sweep", "garbage", "waste"], "Cleanliness"),
    # Safety & Welfare
    (["Harassment", "Bullying", "Ragging", "Discrimination", "Safety"],
     ["physical", "hit", "beat", "assault", "attack", "hurt", "threat", "danger", "emergency", "injury", "violence"], "Physical Safety"),
    (["Harassment", "Bullying", "Ragging", "Discrimination"],
     ["verbal", "abuse", "language", "insult", "humiliate", "tease", "mock", "bully", "rag"], "Verbal/Emotional"),
    (["Discrimination"],
     ["caste", "religion", "gender", "race", "bias", "unfair", "discriminate"], "Discrimination"),
    # Academic
    (["Academic"], ["exam", "grade", "mark", "result", "paper", "assessment", "evaluation"], "Examination"),
    (["Academic"], ["teacher", "faculty", "professor", "lecture", "class", "teaching", "explanation"], "Teaching Quality"),
    (["Academic"], ["fee", "scholarship", "payment", "dues", "fine"], "Fees & Finance"),
    (["Academic"], ["syllabus", "curriculum", "course", "material", "notes"], "Curriculum"),
]

SENSITIVE_CATEGORIES = {
    "Harassment", "Bullying", "Ragging", "Discrimination", "Safety"
}

SAFETY_KEYWORDS = {
    "danger", "unsafe", "emergency", "attack", "threat",
    "injury", "violence", "assault", "hurt", "harm",
}

RECURRENCE_SIGNALS = {
    "again", "still", "repeat", "continue", "always",
    "every", "daily", "weekly", "persistent", "ongoing",
    "recurring", "keeps", "regularly",
}


# ===========================================================================
# Agent class
# ===========================================================================


class FeedbackIntelligenceAgent:
    """
    Stateless agent — create once and call .analyze() for each grievance.
    Heavy imports are deferred to first use.
    """

    AGENT_NAME = "feedback_intelligence"

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    def analyze(self, input_data) -> "AIMetadata":
        """
        Run the full pipeline and return AIMetadata.

        Parameters
        ----------
        input_data : GrievanceInput  (or any object with .text, .category, .severity)
        """
        from app.core.schemas import AIMetadata  # local import to avoid circular
        from app.core.model_manager import model_manager

        text: str = input_data.text or ""
        category: str = input_data.category or "Other"
        severity: str = input_data.severity or "Low"

        # 1. Pre-processing
        cleaned_text, tokens = self._preprocess(text)

        # 2. Topic extraction
        topic = self._extract_topic(category)
        sub_topic = self._extract_subtopic(category, cleaned_text)
        issue_type = self._extract_issue_type(tokens)

        # 3. Keywords
        keywords = self._extract_keywords(tokens)

        # 4. Sentiment
        sentiment, sentiment_score = self._analyse_sentiment(text)

        # 5. Urgency
        safety_score, has_safety = self._safety_keyword_score(cleaned_text)
        recurrence_score, has_recurrence = self._recurrence_signal_score(cleaned_text)
        urgency = self._compute_urgency(severity, sentiment_score, safety_score, recurrence_score)

        # 6. Sensitive flag
        sensitive_flag = (category in SENSITIVE_CATEGORIES) or (safety_score >= 0.3)

        # 7. Embedding
        combined = f"{cleaned_text} {category}"
        embedding = model_manager.encode_one(combined)

        # 8. Duplicate probability — placeholder (requires corpus comparison)
        duplicate_probability = 0.0
        recurrence_indicator = False

        # 9. Priority recommendation
        priority = self._priority_recommendation(urgency, severity)

        # 10. Confidence
        confidence = self._compute_confidence(text, category)

        return AIMetadata(
            topic=topic,
            subTopic=sub_topic,
            issueType=issue_type,
            keywords=keywords,
            sentiment=sentiment,
            sentimentScore=round(sentiment_score, 4),
            urgency=round(urgency, 4),
            embedding=embedding,
            duplicateProbability=duplicate_probability,
            similarityGroup=None,
            clusterId=None,
            recurrenceIndicator=recurrence_indicator,
            priorityRecommendation=priority,
            confidence=round(confidence, 4),
            sensitiveFlag=sensitive_flag,
        )

    # ------------------------------------------------------------------
    # Step 1 — Text Pre-processing (deterministic)
    # ------------------------------------------------------------------

    def _preprocess(self, text: str) -> Tuple[str, List[str]]:
        """Lowercase, remove URLs/specials, tokenize, remove stopwords, stem."""
        # Lowercase
        t = text.lower().strip()
        # Remove URLs
        t = re.sub(r"https?://\S+|www\.\S+", " ", t)
        # Remove non-alphanumeric chars (keep spaces)
        t = re.sub(r"[^a-z0-9\s]", " ", t)
        # Collapse whitespace
        t = re.sub(r"\s+", " ", t).strip()

        # Tokenise (simple split — avoids NLTK punkt download requirement at runtime)
        raw_tokens = t.split()

        stop = _get_stop_words()
        stemmer = _get_stemmer()

        tokens = []
        for tok in raw_tokens:
            if tok in stop:
                continue
            if len(tok) <= 1:
                continue
            tokens.append(stemmer.stem(tok))

        return t, tokens

    # ------------------------------------------------------------------
    # Step 2 — Topic / SubTopic / IssueType
    # ------------------------------------------------------------------

    def _extract_topic(self, category: str) -> str:
        return CATEGORY_TOPIC_MAP.get(category, "General")

    def _extract_subtopic(self, category: str, cleaned_text: str) -> str:
        words = set(cleaned_text.split())
        for categories, keywords, subtopic in SUBTOPIC_RULES:
            if category in categories:
                if any(kw in cleaned_text for kw in keywords):
                    return subtopic
        return "General"

    def _extract_issue_type(self, tokens: List[str]) -> str:
        """Most frequent meaningful bigram from stemmed tokens."""
        if len(tokens) < 2:
            return "General Issue"
        # Build bigrams
        bigrams = [f"{tokens[i]} {tokens[i+1]}" for i in range(len(tokens) - 1)]
        if not bigrams:
            return "General Issue"
        counts = Counter(bigrams)
        most_common = counts.most_common(1)
        if most_common and most_common[0][1] > 0:
            return most_common[0][0].title()
        return "General Issue"

    # ------------------------------------------------------------------
    # Step 3 — Keyword Extraction (TF-IDF-like frequency approach)
    # ------------------------------------------------------------------

    def _extract_keywords(self, tokens: List[str]) -> List[str]:
        """Top 5–8 tokens by frequency (single meaningful tokens)."""
        if not tokens:
            return []
        counts = Counter(tokens)
        # Filter very short tokens
        filtered = {tok: cnt for tok, cnt in counts.items() if len(tok) > 2}
        top = sorted(filtered.items(), key=lambda x: x[1], reverse=True)[:8]
        return [tok for tok, _ in top]

    # ------------------------------------------------------------------
    # Step 4 — Sentiment Analysis (VADER)
    # ------------------------------------------------------------------

    def _analyse_sentiment(self, text: str) -> Tuple[str, float]:
        """Returns (label, compound_score) using VADER."""
        analyzer = _get_vader()
        scores = analyzer.polarity_scores(text)
        compound: float = scores["compound"]
        if compound > 0.05:
            label = "positive"
        elif compound < -0.05:
            label = "negative"
        else:
            label = "neutral"
        return label, compound

    # ------------------------------------------------------------------
    # Step 5 — Safety & Recurrence keyword scoring
    # ------------------------------------------------------------------

    def _safety_keyword_score(self, cleaned_text: str) -> Tuple[float, bool]:
        words = set(cleaned_text.split())
        hits = len(words & SAFETY_KEYWORDS)
        score = min(hits / 3.0, 1.0)  # normalise (3 hits → 1.0)
        return score, hits > 0

    def _recurrence_signal_score(self, cleaned_text: str) -> Tuple[float, bool]:
        words = set(cleaned_text.split())
        found = bool(words & RECURRENCE_SIGNALS)
        return (0.5 if found else 0.0), found

    # ------------------------------------------------------------------
    # Step 5 — Urgency Scoring (deterministic weighted formula)
    # ------------------------------------------------------------------

    SEVERITY_SCORES = {
        "low": 0.2,
        "medium": 0.4,
        "high": 0.7,
        "critical": 1.0,
    }

    def _compute_urgency(
        self,
        severity: str,
        sentiment_compound: float,
        safety_score: float,
        recurrence_score: float,
    ) -> float:
        weights = {
            "severity": 0.35,
            "sentiment": 0.25,
            "safety_keywords": 0.20,
            "recurrence_signals": 0.20,
        }
        sev_score = self.SEVERITY_SCORES.get(severity.lower(), 0.2)
        sent_score = abs(sentiment_compound) if sentiment_compound < 0 else 0.1

        urgency = (
            weights["severity"] * sev_score
            + weights["sentiment"] * sent_score
            + weights["safety_keywords"] * safety_score
            + weights["recurrence_signals"] * recurrence_score
        )
        return max(0.0, min(1.0, urgency))

    # ------------------------------------------------------------------
    # Step 9 — Priority Recommendation
    # ------------------------------------------------------------------

    def _priority_recommendation(self, urgency: float, severity: str) -> str:
        if urgency > 0.8 or severity.lower() == "critical":
            return "Immediate Action Required"
        if urgency > 0.6 or severity.lower() == "high":
            return "Priority Attention"
        if urgency > 0.4:
            return "Monitor Closely"
        return "Routine Processing"

    # ------------------------------------------------------------------
    # Step 10 — Confidence
    # ------------------------------------------------------------------

    def _compute_confidence(self, text: str, category: str) -> float:
        text_length_score = min(len(text) / 200.0, 1.0)
        category_match_score = 1.0 if category in CATEGORY_TOPIC_MAP else 0.5
        return text_length_score * 0.4 + category_match_score * 0.6
