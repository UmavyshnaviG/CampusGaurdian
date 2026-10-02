# Campus Guardian 360 — Evaluation Metrics

## 1. Feedback Intelligence Agent (Agent 2)

### Duplicate / Similarity Detection
| Metric | Description |
|---|---|
| Precision | True duplicate pairs / predicted duplicate pairs |
| Recall | True duplicate pairs detected / total actual duplicate pairs |
| F1 Score | Harmonic mean of precision and recall |
| Cosine Similarity Distribution | Histogram of pairwise similarity scores |

### Sentiment Analysis
| Metric | Description |
|---|---|
| Accuracy | Correct sentiment labels / total predictions |
| Macro F1 | Unweighted F1 across Positive / Negative / Neutral |
| VADER vs TextBlob Agreement Rate | % of cases both models agree |

### Embedding Quality
| Metric | Description |
|---|---|
| Intra-cluster Cosine Similarity | Average similarity within clusters (higher = better) |
| Inter-cluster Cosine Distance | Average distance between cluster centroids (higher = better) |

---

## 2. Pattern Discovery Agent (Agent 3)

### Clustering (HDBSCAN)
| Metric | Description |
|---|---|
| Silhouette Score | Cohesion vs separation of clusters, -1 to 1 |
| Davies-Bouldin Index | Lower = better separated clusters |
| Noise Ratio | % of points labeled as noise by HDBSCAN |
| Cluster Stability | HDBSCAN's built-in persistence score |

### Pattern Detection
| Metric | Description |
|---|---|
| Emerging Pattern Precision | Flagged emerging patterns that are truly emerging |
| Pattern Strength Score Distribution | Admin-evaluated score correlation |

---

## 3. Diagnostic Agent (Agent 4)

### LLM Reasoning Quality
| Metric | Description |
|---|---|
| Hypothesis Relevance (Human) | Admin rating: relevant / partially relevant / irrelevant |
| Evidence Alignment Score | % of cited evidence IDs that belong to the pattern |
| Confidence Calibration | Correlation between confidence score and admin acceptance rate |

---

## 4. Prediction Agent (Agent 5)

### Forecasting
| Metric | Description |
|---|---|
| MAE (Mean Absolute Error) | Average absolute difference, predicted vs actual count |
| RMSE (Root Mean Squared Error) | Penalizes large errors more |
| MAPE (Mean Absolute Percentage Error) | Scale-independent error % |
| Trend Direction Accuracy | % of trends correctly identified as increasing/stable/decreasing |
| Coverage | % of actual values that fall inside confidence interval |

---

## 5. Recommendation Agent (Agent 6)

### Recommendation Quality
| Metric | Description |
|---|---|
| Admin Approval Rate | % of recommendations approved without major edit |
| Department Routing Accuracy | Correct department assigned / total recommendations |
| Draft Communication Quality (Human) | Admin rating of communication draft quality |

---

## 6. Outcome & Recurrence Agent (Agent 8)

### Outcome Measurement
| Metric | Description |
|---|---|
| Volume Change Detection Accuracy | Correctly assessed improvement / worsening |
| Sentiment Shift Detection | Correlation between computed shift and human assessment |

### Recurrence Detection
| Metric | Description |
|---|---|
| Recurrence Precision | Flagged recurrences that are genuine / total flagged |
| Recurrence Recall | Genuine recurrences detected / total genuine recurrences |
| False Alarm Rate | Spurious recurrence alerts per 100 resolved patterns |
| Time-to-Detection | Days between recurrence start and alert generation |

---

## 7. End-to-End System Metrics

| Metric | Description |
|---|---|
| Grievance Processing Latency | Time from submission to AI metadata generation |
| Pattern Discovery Latency | Time from trigger to pattern list availability |
| Sensitive Case Isolation Rate | % of anonymous sensitive grievances with no identity leak |
| Audit Log Completeness | % of admin decisions with corresponding audit log entry |
| System Uptime | Backend, AI service, and frontend availability |
| Role-Based Access Violations | Count of unauthorized access attempts blocked |

---

## 8. AI vs Human Baseline Comparison

| Task | AI Metric | Human Baseline | Gap |
|---|---|---|---|
| Duplicate detection | F1 | Manual review F1 | Target: AI ≥ human |
| Pattern identification | Precision/Recall | Expert review | Target: AI ≥ 80% agreement |
| Recurrence detection | Recall | Scheduled manual check | Target: AI detects 2× faster |
| Trend prediction | MAPE | Naive baseline (last value) | Target: AI MAPE < naive |
