# Campus Guardian 360 — AI Agents Reference

## Agent Coordination Model

Agents communicate via structured JSON contracts.
No agent calls another directly at runtime — the pipeline is orchestrated by the FastAPI service layer.
Each agent exposes a single `run(input: dict) -> dict` interface.
LLM reasoning is used only where natural language understanding, summarization, or explanation is required.
All counting, filtering, aggregation, similarity, clustering, and statistics use deterministic code/ML.

---

## Agent 1 — Data Understanding Agent

**File:** `app/agents/data_understanding.py`

**Trigger:** Admin uploads a CSV or XLSX historical dataset.

**Input JSON Contract:**
```json
{
  "file_path": "string",
  "file_type": "csv | xlsx",
  "sheet_name": "string | null"
}
```

**Output JSON Contract:**
```json
{
  "total_rows": 0,
  "total_columns": 0,
  "columns": [
    {
      "name": "string",
      "dtype": "string",
      "missing_count": 0,
      "missing_pct": 0.0,
      "sample_values": [],
      "suggested_role": "text | category | date | location | severity | id | unknown"
    }
  ],
  "duplicate_rows": 0,
  "profile_summary": "string",
  "mapping_suggestions": {}
}
```

**Implementation notes:**
- Use pandas for all profiling
- Do NOT use LLM for column detection
- Present mapping suggestions to admin for approval before AI processing

---

## Agent 2 — Feedback Intelligence Agent

**File:** `app/agents/feedback_intelligence.py`

**Trigger:** New grievance submitted, or batch processing of imported dataset rows.

**Input JSON Contract:**
```json
{
  "grievance_id": "string",
  "text": "string",
  "category": "string",
  "location": "string",
  "severity": "Low | Medium | High | Critical",
  "is_sensitive": false
}
```

**Output JSON Contract:**
```json
{
  "grievance_id": "string",
  "topic": "string",
  "subTopic": "string",
  "issueType": "string",
  "keywords": [],
  "sentiment": "Positive | Negative | Neutral",
  "sentimentScore": 0.0,
  "urgency": 0.0,
  "embedding": [],
  "duplicateProbability": 0.0,
  "similarityGroup": "string | null",
  "clusterId": "string | null",
  "recurrenceIndicator": false,
  "priorityRecommendation": "Low | Medium | High | Critical",
  "confidence": 0.0,
  "sensitiveFlag": false
}
```

**Implementation notes:**
- Sentence embedding: `all-MiniLM-L6-v2`, 384-dim, cosine similarity
- Sentiment: VADER compound score + TextBlob polarity
- Urgency: composite of sentiment negativity, severity, keyword signals
- Duplicate detection: cosine similarity > 0.85 threshold
- Never expose sensitive identity in output

---

## Agent 3 — Pattern Discovery Agent

**File:** `app/agents/pattern_discovery.py`

**Trigger:** Scheduled or admin-triggered batch analysis.

**Input JSON Contract:**
```json
{
  "grievance_ids": [],
  "date_range": { "start": "ISO8601", "end": "ISO8601" },
  "categories": [],
  "min_cluster_size": 5
}
```

**Output JSON Contract:**
```json
{
  "patterns": [
    {
      "pattern_id": "string",
      "label": "string",
      "category": "string",
      "location": "string",
      "complaint_count": 0,
      "time_window": { "start": "ISO8601", "end": "ISO8601" },
      "strength_score": 0.0,
      "is_emerging": false,
      "evidence_ids": [],
      "representative_text": "string",
      "cluster_id": "string"
    }
  ]
}
```

**Implementation notes:**
- HDBSCAN for density-based clustering on embeddings
- Frequency analysis using pandas groupby + rolling windows
- Emerging pattern = volume in last 7 days > 2× prior 7-day average
- Strength score = f(frequency, recency, geographic spread)

---

## Agent 4 — Diagnostic Agent

**File:** `app/agents/diagnostic.py`

**Trigger:** Admin investigates a pattern.

**Input JSON Contract:**
```json
{
  "pattern_id": "string",
  "pattern_label": "string",
  "complaint_count": 0,
  "representative_complaints": [],
  "category": "string",
  "location": "string",
  "time_window": {}
}
```

**Output JSON Contract:**
```json
{
  "pattern_id": "string",
  "hypotheses": [
    {
      "hypothesis": "string",
      "supporting_evidence": [],
      "confidence": 0.0
    }
  ],
  "summary": "string",
  "suggested_investigation_steps": [],
  "generated_at": "ISO8601"
}
```

**Implementation notes:**
- LLM call for natural language reasoning only
- All evidence selection done deterministically before LLM call
- Output is advisory, not a final decision

---

## Agent 5 — Prediction Agent

**File:** `app/agents/prediction.py`

**Trigger:** Scheduled or on pattern view.

**Input JSON Contract:**
```json
{
  "category": "string",
  "location": "string | null",
  "historical_counts": [
    { "date": "ISO8601", "count": 0 }
  ],
  "forecast_days": 14
}
```

**Output JSON Contract:**
```json
{
  "category": "string",
  "location": "string | null",
  "trend_direction": "increasing | stable | decreasing",
  "trend_magnitude": 0.0,
  "acceleration": 0.0,
  "forecast": [
    { "date": "ISO8601", "predicted_count": 0, "lower": 0, "upper": 0 }
  ],
  "confidence": 0.0,
  "statistically_significant": false
}
```

**Implementation notes:**
- Linear regression + rolling mean for trend
- Confidence interval from residual standard deviation
- Statistical significance via p-value threshold (p < 0.05)
- No LLM used here

---

## Agent 6 — Recommendation Agent

**File:** `app/agents/recommendation.py`

**Trigger:** After diagnosis and prediction are available.

**Input JSON Contract:**
```json
{
  "pattern_id": "string",
  "diagnosis": {},
  "prediction": {},
  "available_departments": []
}
```

**Output JSON Contract:**
```json
{
  "pattern_id": "string",
  "recommendations": [
    {
      "action_title": "string",
      "description": "string",
      "department": "string",
      "expected_impact": "High | Medium | Low",
      "implementation_effort": "High | Medium | Low",
      "priority": 0,
      "draft_communication": "string"
    }
  ],
  "generated_at": "ISO8601"
}
```

**Implementation notes:**
- LLM used for recommendation text and draft communication only
- Department mapping done deterministically from category → department table
- All recommendations require human admin approval before any action is taken

---

## Agent 7 — Action Coordination Agent

**File:** `app/agents/action_coordination.py`

**Trigger:** Admin approves a recommendation.

**Input JSON Contract:**
```json
{
  "recommendation_id": "string",
  "approved_action": "string",
  "department_id": "string",
  "admin_id": "string",
  "notes": "string"
}
```

**Output JSON Contract:**
```json
{
  "action_id": "string",
  "status": "pending | in-progress | completed | rejected",
  "routed_to": "string",
  "notification_draft": "string",
  "audit_entry_id": "string",
  "created_at": "ISO8601"
}
```

**Implementation notes:**
- Every human decision is logged to audit_logs collection
- No disciplinary action is taken automatically
- Notification drafts may use LLM, but sending requires admin confirmation

---

## Agent 8 — Outcome & Recurrence Agent

**File:** `app/agents/outcome_recurrence.py`

**Trigger:** Admin marks action as completed, or scheduled monitoring.

**Input JSON Contract:**
```json
{
  "action_id": "string",
  "pattern_id": "string",
  "action_completed_at": "ISO8601",
  "lookback_days": 14,
  "lookahead_days": 14
}
```

**Output JSON Contract:**
```json
{
  "action_id": "string",
  "outcome": {
    "before_count": 0,
    "after_count": 0,
    "volume_change_pct": 0.0,
    "sentiment_before": 0.0,
    "sentiment_after": 0.0,
    "resolution_rate": 0.0,
    "assessment": "improved | unchanged | worsened"
  },
  "recurrence_detected": false,
  "recurrence_evidence": [],
  "recurrence_similarity_score": 0.0,
  "alert_level": "none | low | medium | high"
}
```

**Implementation notes:**
- Before/after comparison using deterministic count and sentiment aggregation
- Recurrence detection via cosine similarity of new complaints against resolved cluster centroids
- Recurrence threshold: similarity > 0.80 AND count > 3 within 30-day window
