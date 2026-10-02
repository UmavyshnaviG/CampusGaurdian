# Campus Guardian 360 — Complete Project Explanation

> Simple language. Actual code. No guessing.

---

## 1. What This Project Does

Campus Guardian 360 is a system where students, faculty, and staff submit complaints or feedback about campus problems, and an AI pipeline automatically understands, groups, analyzes, and helps administrators take action on those complaints.

**Normal complaint system:**
> Student submits → Admin reads → Admin forwards → Done

**This system:**
> Student submits → AI understands it → Embedding generated → Grouped with similar complaints → Pattern discovered → Trend predicted → Recommendation created → Admin approves action → Outcome measured → Recurrence detected

The AI doesn't just store complaints. It finds hidden patterns like "50 students are reporting the same hostel Wi-Fi problem with different words" and brings it to the admin's attention with evidence.

---

## 2. Three Services That Run Together

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   FRONTEND      │────▶│    BACKEND       │────▶│   AI SERVICE       │
│  React + Vite   │     │  Node.js+Express │     │  Python + FastAPI  │
│  Port: 5173     │     │  Port: 5000      │     │  Port: 8000        │
│                 │◀────│  MongoDB         │◀────│  all-MiniLM-L6-v2  │
└─────────────────┘     └──────────────────┘     └────────────────────┘
```

- **Frontend** (React): What the user sees and interacts with
- **Backend** (Node.js): Handles auth, stores data, enforces roles, talks to AI
- **AI Service** (Python): Runs all the ML/NLP processing

They all talk through **HTTP REST APIs**.
The Frontend talks to the Backend.
The Backend talks to the AI Service.
The Frontend never talks to the AI Service directly.

---

## 3. Project Folder Structure

```
campus-guardian-360/
│
├── backend/src/
│   ├── server.js              ← Entry point. Starts Express + Socket.IO
│   ├── config/
│   │   ├── database.js        ← Connects to MongoDB
│   │   └── upload.js          ← Multer file upload config
│   ├── middleware/
│   │   └── auth.js            ← JWT verify + RBAC + audit logging
│   ├── models/                ← MongoDB schemas (Mongoose)
│   │   ├── User.js
│   │   ├── Grievance.js
│   │   ├── Pattern.js
│   │   ├── Action.js
│   │   ├── Outcome.js
│   │   ├── Department.js
│   │   └── AuditLog.js
│   ├── services/              ← Business logic (no HTTP here)
│   │   ├── authService.js
│   │   ├── grievanceService.js
│   │   ├── patternService.js
│   │   ├── actionService.js
│   │   └── outcomeService.js
│   ├── controllers/           ← Handle HTTP req/res, call services
│   │   ├── authController.js
│   │   ├── grievanceController.js
│   │   ├── patternController.js
│   │   ├── actionController.js
│   │   └── outcomeController.js
│   └── routes/                ← URL definitions
│       ├── auth.js
│       ├── grievances.js
│       ├── patterns.js
│       ├── actions.js
│       ├── outcomes.js
│       ├── departments.js
│       ├── search.js
│       ├── evaluation.js
│       └── upload.js
│
├── ai-service/app/
│   ├── main.py                ← FastAPI entry point, loads model on startup
│   ├── core/
│   │   ├── model_manager.py   ← Singleton that holds all-MiniLM-L6-v2
│   │   ├── schemas.py         ← Pydantic data validation models
│   │   └── config.py          ← Settings from .env
│   ├── agents/                ← 8 AI agents (one file each)
│   │   ├── data_understanding.py
│   │   ├── feedback_intelligence.py
│   │   ├── pattern_discovery.py
│   │   ├── diagnostic.py
│   │   ├── prediction.py
│   │   ├── recommendation.py
│   │   ├── action_coordination.py
│   │   └── outcome_recurrence.py
│   └── routers/               ← FastAPI route handlers
│       ├── analysis.py
│       ├── patterns.py
│       ├── actions.py
│       ├── outcomes.py
│       ├── search.py
│       └── evaluation.py
│
├── frontend/src/
│   ├── main.jsx               ← React entry point
│   ├── App.jsx                ← All route definitions
│   ├── context/
│   │   └── AuthContext.jsx    ← Login state stored here
│   ├── components/
│   │   ├── ProtectedRoute.jsx ← Guards routes by role
│   │   └── layouts/
│   │       ├── AdminLayout.jsx  ← Sidebar for admin pages
│   │       └── UserLayout.jsx   ← Navbar for user pages
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── user/
│   │   │   ├── UserDashboard.jsx
│   │   │   ├── SubmitGrievance.jsx
│   │   │   ├── MyGrievances.jsx
│   │   │   └── GrievanceDetail.jsx
│   │   ├── admin/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminGrievances.jsx
│   │   │   ├── Patterns.jsx
│   │   │   ├── PatternDetail.jsx
│   │   │   ├── ActionCenter.jsx
│   │   │   ├── ActionDetail.jsx
│   │   │   ├── UploadDataset.jsx
│   │   │   ├── Outcomes.jsx
│   │   │   ├── RecurrenceMonitor.jsx
│   │   │   ├── SemanticSearch.jsx
│   │   │   ├── Departments.jsx
│   │   │   ├── Evaluation.jsx
│   │   │   └── AuditLogs.jsx
│   │   └── safeguarding/
│   │       ├── SafeguardingPortal.jsx
│   │       └── SensitiveCase.jsx
│   └── services/              ← Axios API call wrappers
│       ├── api.js
│       ├── grievanceService.js
│       ├── patternService.js
│       ├── actionService.js
│       ├── outcomeService.js
│       ├── departmentService.js
│       ├── searchService.js
│       ├── evaluationService.js
│       └── uploadService.js
│
└── data/
    └── generate_synthetic.py  ← Creates 1550 fake complaints for testing
```

---

## 4. User Roles

| Role | What they can do |
|---|---|
| `student` | Submit grievances, view own grievances |
| `faculty` | Submit grievances, view own grievances |
| `staff` | Submit grievances, view own grievances |
| `admin` | Everything: dashboard, AI analysis, patterns, actions, outcomes |
| `sensitive_officer` | View sensitive cases only (harassment, bullying etc.) |

Role is set at registration and stored in MongoDB. JWT carries the role. Every API route checks it.

---

## 5. How Login and Registration Work

### Registration
**File:** `frontend/src/pages/Register.jsx`
→ User fills form (name, email, password, role, department, year)
→ Axios POST to `http://localhost:5000/api/auth/register`

**File:** `backend/src/routes/auth.js`
→ Validates input with `express-validator`
→ Calls `authController.register()`

**File:** `backend/src/controllers/authController.js`
→ Calls `authService.register(userData)`

**File:** `backend/src/services/authService.js` → `register()`
```javascript
const passwordHash = await bcrypt.hash(password, 12);
// creates new User in MongoDB
```
Password is hashed with **bcrypt at 12 salt rounds** before storing. Plain password is never saved.

### Login
**File:** `frontend/src/pages/Login.jsx`
→ Axios POST to `/api/auth/login`

**File:** `backend/src/services/authService.js` → `login()`
```javascript
const user = await User.findOne({ email }).select('+passwordHash');
const isMatch = await user.comparePassword(password);
const token = jwt.sign({ id, role, email }, JWT_SECRET, { expiresIn: '7d' });
return { token, user };
```
Returns a **JWT token**. Token lives for 7 days.

**File:** `frontend/src/context/AuthContext.jsx`
→ Stores token in localStorage
→ Attaches it to every Axios request as `Authorization: Bearer <token>`

### Route Protection
**File:** `frontend/src/components/ProtectedRoute.jsx`
→ Reads role from AuthContext
→ If role not allowed → redirects to `/unauthorized`

**File:** `backend/src/middleware/auth.js` → `authenticate()` + `authorize()`
→ `authenticate`: verifies JWT signature using `JWT_SECRET`
→ `authorize('admin')`: checks `req.user.role === 'admin'`
→ `auditLog()`: records every action in AuditLogs collection after response finishes

---

## 6. How a Grievance is Submitted

### Step-by-step flow

**Frontend:** `frontend/src/pages/user/SubmitGrievance.jsx`

User fills:
- Category (16 options: Academic, Network/IT, Hostel, Harassment, etc.)
- Location (building, block, floor, room)
- Description (10–2000 characters)
- Severity (Low / Medium / High / Critical)
- Optional file attachment
- If category is Harassment/Bullying/Ragging/Discrimination/Safety → checkbox appears: "Submit Anonymously"

→ Calls `grievanceService.submitGrievance(formData)` (multipart/form-data for file)
→ POST to `http://localhost:5000/api/grievances`

**Backend route:** `backend/src/routes/grievances.js`
→ `authenticate` middleware (checks JWT)
→ `express-validator` checks (category, description, severity required)
→ `grievanceController.submitGrievance(req, res)`

**Controller:** `backend/src/controllers/grievanceController.js`
→ Calls `grievanceService.createGrievance(data, userId, userRecord)`

**Service:** `backend/src/services/grievanceService.js` → `createGrievance()`

This is the most important function. Here's what it does:

```javascript
// 1. Generate a unique tracking code like GR-M8X2K4-AB3D
const trackingCode = generateTrackingCode();

// 2. Privacy check — is this an anonymous sensitive complaint?
const isAnon = anonymous === true && SENSITIVE_CATEGORIES.includes(category);

if (isAnon) {
  // Real identity stored in sensitiveIdentity (select: false — never returned normally)
  grievanceDoc.sensitiveIdentity = userId;
  // submittedBy is NOT set — normal queries never expose this person
} else {
  grievanceDoc.submittedBy = userId;
}

// 3. Save to MongoDB
const grievance = new Grievance(grievanceDoc);
await grievance.save();

// 4. Fire-and-forget AI analysis (does NOT wait for it)
callAIService(grievance._id, description, category, rawSeverity);

return grievance; // Returns immediately with tracking code
```

The grievance is **saved first**. The AI runs in the background. Even if AI fails, the complaint is safe.

**MongoDB Schema:** `backend/src/models/Grievance.js`

Key fields stored:
```
trackingCode     — GR-M8X2K4-AB3D
submittedBy      — ObjectId (absent if anonymous sensitive)
sensitiveIdentity — ObjectId (stored but never returned, select:false)
category         — "Network/IT"
location         — { building: "Hostel A", block: "B", floor: "2" }
description      — "Wi-Fi is very slow every evening"
rawSeverity      — "High"
anonymous        — true/false
isSensitive      — auto-derived from category (pre-save hook)
isAnonymousSensitive — auto-derived (anonymous AND sensitive category)
aiMetadata       — filled later by AI service
status           — "Submitted"
statusHistory    — array of { status, changedBy, changedAt, note }
aiProcessingStatus — "pending" → "completed" or "failed"
```

---

## 7. How the AI Service Processes a Grievance

After the grievance is saved, `callAIService()` sends a POST request to the AI service.

**API call:** `POST http://127.0.0.1:8000/api/ai/analyze-one`

**Payload:**
```json
{ "grievanceId": "...", "text": "Wi-Fi is very slow every evening", "category": "Network/IT", "severity": "High" }
```

**AI Service Router:** `ai-service/app/routers/analysis.py`
→ Calls `FeedbackIntelligenceAgent().analyze(input_data)`

**Agent:** `ai-service/app/agents/feedback_intelligence.py` → `FeedbackIntelligenceAgent.analyze()`

This runs a **10-step pipeline**:

### Step 1: Preprocessing (`_preprocess()`)
```python
text.lower()          # lowercase
remove punctuation    # clean
tokenize              # split into words
remove stopwords      # remove "the", "is", "a" etc.
stem words            # "running" → "run"
```

### Step 2: Topic Extraction (`_extract_topic()`)
Maps the category directly to a topic:
- "Network/IT" → "Network"
- "Hostel" → "Hostel"
- "Academic" → "Academic"

### Step 3: Subtopic (`_extract_subtopic()`)
Looks at keywords in the text to find the subtopic:
- If "wifi" or "internet" in text → "Connectivity"
- If "slow" or "speed" in text → "Performance"

### Step 4: Keyword Extraction (`_extract_keywords()`)
Uses **TF-IDF logic and frequency counting** — picks the top meaningful words:
- Input: "Wi-Fi is very slow every evening in hostel"
- Output: ["wifi", "slow", "evening", "hostel"]

### Step 5: Sentiment (`_analyse_sentiment()`)
Uses **VADER** (Valence Aware Dictionary and sEntiment Reasoner):
- Returns: `("Negative", -0.65)` — label + score
- VADER is designed for short informal text

### Step 6: Safety Keywords (`_safety_keyword_score()`)
Checks if text has dangerous words: "attack", "threat", "harm", "unsafe", etc.
Returns a safety boost score and `isSensitive` flag.

### Step 7: Recurrence Signal (`_recurrence_signal_score()`)
Checks for words like "again", "still", "repeatedly", "second time":
Returns a boost if this looks like a repeated complaint.

### Step 8: Urgency Score (`_compute_urgency()`)
Combines everything into one urgency number (0.0 to 1.0):
```python
urgency = (
  severity_weight * 0.30 +
  sentiment_weight * 0.20 +
  safety_score * 0.25 +
  recurrence_score * 0.15 +
  category_weight * 0.10
)
```

### Step 9: Embedding (`model_manager.encode_one()`)
**File:** `ai-service/app/core/model_manager.py`

The sentence `"Wi-Fi is very slow every evening in hostel"` is converted into a **384-dimensional vector** (a list of 384 numbers) using the `all-MiniLM-L6-v2` model.

This vector captures the **meaning** of the sentence. Two sentences with the same meaning will have similar vectors even if the words are different.

Example:
- "Hostel Wi-Fi is slow" → [0.23, -0.11, 0.54, ...] (384 numbers)
- "Internet is poor in hostel" → [0.21, -0.09, 0.51, ...] (very similar!)

### Step 10: Returns AIMetadata
```json
{
  "topic": "Network",
  "subTopic": "Connectivity",
  "issueType": "Slow Internet",
  "keywords": ["wifi", "slow", "evening", "hostel"],
  "sentiment": "Negative",
  "sentimentScore": -0.65,
  "urgency": 0.72,
  "embedding": [0.23, -0.11, 0.54, ...],
  "duplicateProbability": 0.0,
  "priorityRecommendation": "High",
  "confidence": 0.85,
  "sensitiveFlag": false
}
```

**Backend receives this and stores it in the grievance document** in MongoDB.

---

## 8. How Historical Data is Uploaded

An admin uploads 1550 grievances from a CSV file.

**Frontend:** `frontend/src/pages/admin/UploadDataset.jsx`
→ 4-step UI: upload → inspect → confirm mappings → process

**Step 1 — Upload + Inspect**
POST to `backend /api/upload/inspect` → `uploadController.inspectDataset()`
→ Saves file with Multer
→ Calls AI service `POST /api/ai/inspect-schema`

**AI Agent:** `ai-service/app/agents/data_understanding.py` → `inspect_schema()`
- Reads CSV/XLSX with pandas
- Detects column types, missing values, duplicate rows
- Uses `SequenceMatcher` (string similarity) + keyword matching to guess:
  - `feedback_text` → maps to `description` (98% confidence)
  - `dept` → maps to `department` (94% confidence)
  - `loc` → maps to `location` (91% confidence)
- Returns mapping suggestions with confidence percentages

**Step 2 — Admin Confirms Mappings**
Admin sees a table with green/yellow/red confidence badges.
They can fix any wrong mappings.

**Step 3 — Batch Processing**
POST to `/api/upload/confirm` → `uploadService.confirmAndProcess()`
→ Calls AI `/api/ai/process-batch` (renames columns)
→ Sends 50 records at a time to `/api/ai/batch-analyze`
→ Each record gets full AI analysis (embedding, sentiment, urgency, etc.)
→ Stored in MongoDB as `isHistorical: true` grievances
→ Socket.IO emits `upload:progress` events → frontend progress bar updates live

---

## 9. Pattern Discovery — How AI Finds Patterns

**Frontend:** Admin clicks "Refresh Patterns" on `/admin/patterns`
→ POST to `backend /api/patterns/refresh`
→ `patternController.runRefreshPatterns()`
→ `patternService.refreshPatterns()`

**File:** `backend/src/services/patternService.js` → `refreshPatterns()`

1. Fetches all grievances from MongoDB that have completed AI processing AND have embeddings:
```javascript
Grievance.find({
  aiProcessingStatus: 'completed',
  'aiMetadata.embedding': { $exists: true, $not: { $size: 0 } }
})
```

2. Sends all of them to AI service:
```
POST http://127.0.0.1:8000/api/ai/discover-patterns
```

**AI Agent:** `ai-service/app/agents/pattern_discovery.py` → `PatternDiscoveryAgent.discover()`

### How Clustering Works

1. Extracts all 384-dimensional embeddings from grievances
2. Tries **HDBSCAN** first:
   ```python
   hdbscan.HDBSCAN(min_cluster_size=max(5, n//50), min_samples=3)
   ```
   HDBSCAN finds clusters of ANY shape without needing to specify how many clusters.
3. Validates using **Silhouette Score** (measure of cluster quality, -1 to 1)
4. If HDBSCAN gives poor results (silhouette < 0.1), falls back to **K-Means** (tries k=2 to k=15, picks best silhouette score)
5. Complaints that are too different from any cluster = "noise" (label -1), ignored

### What is Extracted Per Cluster

For each discovered cluster, the agent computes:
```
- category distribution    — what % are Network, Hostel, Academic, etc.
- location distribution    — which buildings/hostels appear most
- severity distribution    — Low/Medium/High/Critical percentages
- sentiment distribution   — Positive/Neutral/Negative percentages
- stakeholder groups       — student/faculty/staff breakdown
- weekly trend             — complaints per ISO week
- top keywords             — most frequent meaningful words
- time window              — firstSeen, lastSeen, peakWeek
```

### How the Pattern Title is Generated

`_make_title()` — deterministic rule:
1. Takes the dominant category (e.g., "Network/IT")
2. Takes the top location (e.g., "Hostel")
3. Takes the top 2 keywords (e.g., "wifi", "slow")
4. Combines: "Network/IT — Hostel (wifi, slow)"
**Not hardcoded. Generated from actual cluster data.**

### Diagnostic Agent

**File:** `ai-service/app/agents/diagnostic.py`
After each cluster is found, the DiagnosticAgent analyzes it and writes an explanation using **cautious language**:
> "Data shows 78% of related reports occurred between 6 PM and 10 PM. A possible contributing factor may be network capacity during peak usage. Further verification is recommended."

Never says "The Wi-Fi is broken because of X." Always uses "may", "possible", "data shows".

### Patterns Saved to MongoDB

`patternService.js` upserts each discovered pattern into the `patterns` collection using `patternKey` as the unique identifier:
```javascript
Pattern.findOneAndUpdate(
  { patternKey: p.patternKey },
  { $set: { title, reportCount, locations, evidence, ... } },
  { upsert: true }
)
```

Also bulk-updates `aiMetadata.clusterId` on all member grievances.

---

## 10. Prediction Agent — Trend Analysis

**File:** `ai-service/app/agents/prediction.py` → `PredictionAgent.predict()`

Called when admin views a pattern detail page.

1. Filters grievances that belong to this pattern (by memberId or clusterId)
2. Builds a **weekly time series**:
   ```
   Week 2024-W01: 5 complaints
   Week 2024-W02: 8 complaints
   Week 2024-W03: 14 complaints
   Week 2024-W04: 22 complaints
   ```
3. Computes **4-week rolling average** using NumPy
4. Runs **linear regression** (`numpy.polyfit`) to get slope and R²
5. Calculates **growth rate**: (recent 4 weeks avg) vs (previous 4 weeks avg)
6. Classifies trend:
   - `slope > 0.3 AND growth_rate > 20%` → **Increasing**
   - `slope < -0.3 AND growth_rate < -20%` → **Decreasing**
   - Pattern resolved + new activity → **Recurrence Risk**
   - New pattern with no prior data → **Emerging**
   - Otherwise → **Stable**
7. Generates 4-week forecast with upper/lower uncertainty bounds (±1.5σ)
8. Returns cautious interpretation:
   > "Based on available data (8 weeks), complaint frequency appears to be increasing. The linear slope is +2.3 complaints/week (R² = 0.84). This projection should be interpreted as an indicator, not a certainty."

---

## 11. Recommendation Agent

**File:** `ai-service/app/agents/recommendation.py`

Uses the pattern + diagnosis + prediction to generate a structured recommendation:

```
Problem:          Repeated network connectivity issues in hostel
Observed Pattern: 130 reports in 30 days, 78% during 6–10 PM
Evidence:         [top 3 quoted complaints]
Possible Factors: Peak-time network capacity (from diagnostic)
Suggested Action: Inspect hostel access-point coverage and peak-hour capacity
Responsible Dept: Network / IT (from 16-category routing table)
Confidence:       0.82
```

The `suggestedAction` is built from a **16-category × urgency template table**:
- Category "Network/IT" + high urgency → `"Inspect {primary_location} access-point coverage and peak-hour network capacity."`
- `{primary_location}` is replaced with actual location from the pattern data
- **Never hardcoded.**

---

## 12. Action Center — Human Approval Flow

**Frontend:** Admin goes to `/admin/patterns/:id` → clicks "Take Action"
→ POST to `backend /api/actions/generate-draft/:patternId`

**File:** `backend/src/services/actionService.js` → `generateAction(patternId, adminId)`

This function calls the AI service sequentially:
1. `/api/ai/predict` → get trend data
2. `/api/ai/diagnose` → get diagnosis
3. `/api/ai/recommend` → get recommendation
4. `/api/ai/generate-action` → generate email draft

**AI Agent:** `ai-service/app/agents/action_coordination.py` → `ActionCoordinationAgent.generate_draft()`

Generates a professional email from actual database values:
```
Subject: Action Required: Hostel Network Connectivity Issue — High Priority

Dear IT Head,

This communication is regarding a pattern of repeated network connectivity
issues identified through the Campus Guardian 360 AI analysis system.

PATTERN DETAILS
---------------
Pattern Title  : Network/IT — Hostel (wifi, slow)
Report Count   : 130 report(s)
Date Range     : 2024-W01 to 2024-W04
Primary Location: Hostel

OBSERVED PATTERN
----------------
...

SUPPORTING EVIDENCE
-------------------
  • "Hostel Wi-Fi is extremely slow every evening." (Similarity: 0.94)
  • "Internet disconnects daily in Block B hostel." (Similarity: 0.91)
  • "Cannot access online resources in hostel after 7 PM." (Similarity: 0.89)

REQUESTED ACTION
----------------
Inspect hostel access-point coverage and peak-hour network capacity.

RESPONSE TIMELINE
-----------------
Please acknowledge receipt and provide an initial response within 24 hours.
```

**Every number, name, and location comes from the database. Nothing is hardcoded.**

If `SMTP_HOST` is not set → `deliveryMethod = "draft_only"` → system shows "Email service not configured. You can copy or download this draft."

### Approval Flow

**Frontend:** `frontend/src/pages/admin/ActionDetail.jsx`

Admin sees:
- Status timeline (Recommended → Pending Approval → Approved → Sent → In Progress → Resolved)
- Recommendation card
- Editable email draft textarea
- Buttons: **[Approve & Send]** | **[Edit]** | **[Reject]** | **[Save Draft]**

When admin clicks Approve:
→ POST `/api/actions/approve`
→ `actionService.approveAction(actionId, adminId, comments)`
→ Saves: `approvalStatus = "Approved"`, `approvedBy = adminId`, `approvalDate = now`, `approvalComments = "..."`
→ If SMTP configured → sends email. If not → marks as draft.

**Audit log is created for every approval/rejection** by `auditLog()` middleware in `backend/src/middleware/auth.js`.

### Action States (State Machine)
```
Recommended → Pending Approval → Approved → Sent → Acknowledged → In Progress → Resolved
                             ↘ Rejected
```
Invalid transitions are rejected server-side in `actionService.updateActionStatus()`.

---

## 13. Outcome Measurement

After an action is resolved, admin generates an outcome.

**File:** `ai-service/app/agents/outcome_recurrence.py` → `OutcomeRecurrenceAgent.measure_outcome()`

1. Takes all grievances **before** the action date and **after** the action date
2. Computes for both periods:
   - `complaintCount` — just counting
   - `averageSeverity` — Low=1, Medium=2, High=3, Critical=4, averaged
   - `sentimentScore` — average of VADER scores
   - `weeklyFrequency` — count ÷ number of weeks
3. Calculates change:
   ```
   countChangePct = (after - before) / before × 100
   ```
4. Generates observation text using **cautious language**:
   - If decreased >20%: "Complaint frequency decreased by 67.7% in the observation period following the recorded intervention. This change is consistent with a positive response, though other factors may also have contributed."
   - If increased >20%: "Complaint frequency increased by X%. Further investigation may be warranted."
   - Never says "The intervention caused this."

---

## 14. Recurrence Detection

**File:** `ai-service/app/agents/outcome_recurrence.py` → `OutcomeRecurrenceAgent.detect_recurrence()`

After a pattern is resolved and time passes:

1. Takes the **centroid** (average vector) of all historical embeddings in the original cluster
2. Takes all new grievances submitted after the pattern's `lastSeen` date
3. For each new grievance, computes **cosine similarity** between its embedding and the centroid
4. Counts how many new grievances exceed the threshold (0.72)
5. Checks:
   - Same location? (+0.2 bonus)
   - Same category? (+0.2 bonus)
   - Score ≥ 0.5 → flags as possible recurrence
6. Returns evidence text:
   > "Data shows 23 new report(s) semantically similar to the previous pattern, concentrated at Hostel. This may indicate recurrence of the underlying issue."

This means "Hostel Wi-Fi is down again" is detected as a recurrence of the original "Hostel Wi-Fi slow" pattern even if the wording is completely different.

---

## 15. Semantic Search

**Frontend:** `/admin/search` → `SemanticSearch.jsx`
Admin types: "recurring hostel problems during evening"

**Flow:**
1. POST `backend /api/search` with `{ query: "recurring hostel problems during evening" }`
2. Backend fetches all patterns from MongoDB with their `topKeywords`
3. Backend calls AI service `POST /api/ai/search`
4. AI service embeds the query using `model_manager.encode_one(query)`
5. For each pattern, creates a text: `title + category + primaryLocation + keywords joined`
6. Embeds each pattern text, computes cosine similarity with query
7. Returns patterns ranked by similarity score
8. Frontend shows ranked cards: "Network/IT — Hostel (wifi, slow): 0.87 similarity"

This works because "recurring hostel problems during evening" has a similar meaning-vector to "Hostel, wifi, slow, evening, connectivity".

---

## 16. Real-Time Updates with Socket.IO

**Backend:** `backend/src/server.js`
```javascript
const io = new SocketIOServer(httpServer);
app.set('io', io);
```

When a grievance status changes → `grievanceController` does:
```javascript
req.app.get('io').emit('grievance:statusUpdate', { grievanceId, status });
```

When batch upload progresses → `uploadService` does:
```javascript
io.emit('upload:progress', { processed, total });
```

**Frontend:** `UserDashboard.jsx` and `AdminDashboard.jsx` connect with:
```javascript
import { io } from 'socket.io-client';
const socket = io(VITE_SOCKET_URL);
socket.on('grievance:statusUpdate', (data) => { /* refresh */ });
```

---

## 17. Privacy — Anonymous Sensitive Grievances

When a student submits a harassment complaint anonymously:

**In MongoDB:** (`Grievance.js`)
```javascript
sensitiveIdentity: userId    // select: false — NEVER returned in normal queries
submittedBy: [not set]       // absent, so normal queries never expose the person
isAnonymousSensitive: true
```

**When admin (role: admin) fetches grievances:**
`grievanceService.getGrievances()`:
```javascript
query.isAnonymousSensitive = { $ne: true }; // admins NEVER see these
```

**When admin fetches a specific one** (shouldn't happen but just in case):
```javascript
if (isAdmin && grievance.isAnonymousSensitive) return null; // 404
```

**`sanitiseForRole()` function** replaces submitter info with "Anonymous" for sensitive records.

**Only `sensitive_officer`** can see the real identity via a special route that queries:
```javascript
Grievance.findById(id).select('+sensitiveIdentity')
```
And **every access is audit logged**.

---

## 18. All Technologies and Why

| Technology | File | Why |
|---|---|---|
| **React 18** | `frontend/src/` | Component-based UI |
| **Vite** | `vite.config.js` | Fast dev server and build tool |
| **Tailwind CSS** | `index.css` | Utility-first styling, no custom CSS needed |
| **React Router v6** | `App.jsx` | Client-side navigation between pages |
| **Recharts** | `AdminDashboard.jsx` | AreaChart, BarChart, PieChart for data visualization |
| **Lucide React** | Throughout | Icon library |
| **Axios** | `services/api.js` | HTTP requests with interceptors for JWT |
| **Socket.IO client** | `UserDashboard.jsx` | Real-time status updates |
| **Node.js + Express** | `server.js` | Backend API framework |
| **Mongoose** | All models | MongoDB object modeling |
| **JWT** | `authService.js` | Stateless authentication tokens |
| **bcryptjs** | `authService.js` | Password hashing (12 rounds) |
| **Helmet** | `server.js` | HTTP security headers |
| **CORS** | `server.js` | Allow frontend to call backend |
| **express-rate-limit** | `server.js` | Auth routes limited to 100/15min |
| **Multer** | `config/upload.js` | File uploads (max 10MB, jpg/png/pdf/doc) |
| **Socket.IO** | `server.js` | Real-time events to frontend |
| **express-validator** | Routes | Input validation before controller |
| **FastAPI** | `main.py` | Python API framework (async, fast) |
| **Pydantic** | `schemas.py` | Validates all AI input/output data |
| **sentence-transformers** | `model_manager.py` | all-MiniLM-L6-v2 → 384-dim embeddings |
| **HDBSCAN** | `pattern_discovery.py` | Density-based clustering |
| **scikit-learn** | `pattern_discovery.py` | K-Means fallback, Silhouette Score |
| **NumPy** | `prediction.py` | Linear regression, rolling average, cosine sim |
| **VADER** | `feedback_intelligence.py` | Sentiment analysis for short informal text |
| **NLTK** | `feedback_intelligence.py` | Tokenization, stopwords, punkt |
| **pandas** | `data_understanding.py` | Read CSV/XLSX, column stats |
| **MongoDB** | All models | Document store for all data |

---

## 19. All API Routes

### Backend (Node.js, Port 5000)

| Method | Route | Auth | What it does |
|---|---|---|---|
| POST | `/api/auth/register` | None | Create account |
| POST | `/api/auth/login` | None | Get JWT token |
| GET | `/api/auth/me` | JWT | Get own profile |
| POST | `/api/grievances` | JWT | Submit grievance |
| GET | `/api/grievances` | JWT | List (RBAC filtered) |
| GET | `/api/grievances/:id` | JWT | Get one (RBAC check) |
| PATCH | `/api/grievances/:id/status` | Admin | Update status |
| POST | `/api/upload/inspect` | Admin | Inspect CSV schema |
| POST | `/api/upload/confirm` | Admin | Process + store CSV |
| GET | `/api/patterns` | Admin | List patterns |
| GET | `/api/patterns/:id` | Admin | Pattern detail |
| POST | `/api/patterns/refresh` | Admin | Run pattern discovery |
| GET | `/api/actions` | Admin | List actions |
| GET | `/api/actions/:id` | Admin | Action detail |
| POST | `/api/actions/generate-draft/:patternId` | Admin | Generate action + email |
| POST | `/api/actions/approve` | Admin | Approve action |
| POST | `/api/actions/reject` | Admin | Reject action |
| PATCH | `/api/actions/:id/status` | Admin | Update action state |
| GET | `/api/outcomes` | Admin | List outcomes |
| POST | `/api/outcomes/generate` | Admin | Generate outcome analysis |
| GET | `/api/outcomes/recurrence` | Admin | Check recurrence |
| GET | `/api/departments` | Public | List departments |
| POST | `/api/departments` | Admin | Add department |
| POST | `/api/search` | Admin | Semantic search |
| GET | `/api/evaluation/metrics` | Admin | AI performance metrics |
| GET | `/api/audit-logs` | Admin | View audit trail |

### AI Service (Python, Port 8000)

| Method | Route | Agent | What it does |
|---|---|---|---|
| GET | `/api/ai/health` | — | Service health check |
| POST | `/api/ai/inspect-schema` | DataUnderstanding | Inspect CSV columns |
| POST | `/api/ai/process-batch` | DataUnderstanding | Rename columns per mapping |
| POST | `/api/ai/analyze-one` | FeedbackIntelligence | Process single grievance |
| POST | `/api/ai/batch-analyze` | FeedbackIntelligence | Process up to 2000 |
| POST | `/api/ai/discover-patterns` | PatternDiscovery + Diagnostic | HDBSCAN clustering |
| POST | `/api/ai/diagnose` | Diagnostic | Explain one pattern |
| POST | `/api/ai/predict` | Prediction | Trend analysis |
| POST | `/api/ai/recommend` | Recommendation | Generate recommendation |
| POST | `/api/ai/generate-action` | ActionCoordination | Generate email draft |
| POST | `/api/ai/analyze-outcome` | OutcomeRecurrence | Before/after metrics |
| POST | `/api/ai/check-recurrence` | OutcomeRecurrence | Detect recurrence |
| POST | `/api/ai/search` | ModelManager | Semantic search |
| GET | `/api/ai/evaluate` | — | AI performance metrics |

---

## 20. 8 AI Agents — Summary

| # | Agent | File | Uses LLM? | What it does |
|---|---|---|---|---|
| 1 | Data Understanding | `data_understanding.py` | No | Pandas + SequenceMatcher to detect CSV schema |
| 2 | Feedback Intelligence | `feedback_intelligence.py` | No | VADER + TF-IDF + sentence-transformers |
| 3 | Pattern Discovery | `pattern_discovery.py` | No | HDBSCAN/K-Means on 384-dim embeddings |
| 4 | Diagnostic | `diagnostic.py` | No | Rule-based evidence builder with cautious language |
| 5 | Prediction | `prediction.py` | No | NumPy linear regression + rolling average |
| 6 | Recommendation | `recommendation.py` | No | Template table interpolated with real data |
| 7 | Action Coordination | `action_coordination.py` | No | Dynamic email from actual DB values |
| 8 | Outcome & Recurrence | `outcome_recurrence.py` | No | Arithmetic comparison + cosine similarity |

**No LLM is used.** All intelligence is deterministic ML/NLP. This is intentional — the system needs to be explainable, reproducible, and not dependent on external API keys.

---

## 21. One Real-World Example — Complete Flow

> **Scenario:** 50 students complain about hostel Wi-Fi being slow in the evenings, using different words. Admin discovers the pattern and takes action.

### Day 1 — Students Submit Complaints

**Student 1:** Submits "Hostel Wi-Fi is extremely slow every evening"
**Student 2:** Submits "Internet speed is very poor in hostel after 7 PM"
**Student 3:** Submits "Network keeps disconnecting in hostel during peak hours"

Each submission:
1. `SubmitGrievance.jsx` → POST `/api/grievances`
2. `grievanceService.createGrievance()` → saved in MongoDB with tracking code
3. `callAIService()` fires in background for each
4. `FeedbackIntelligenceAgent.analyze()` runs:
   - All three get `topic: "Network"`, `subTopic: "Connectivity"`
   - All three get `sentiment: "Negative"`
   - All three get 384-dim embeddings that are **very close to each other** (same meaning)
5. Socket.IO notifies admin dashboard: new grievances received

### Day 3 — Admin Uploads Historical Data

- Admin goes to `/admin/upload`
- Uploads `campus_grievances_historical.csv` (1550 records)
- Data Understanding Agent: detects `feedback_text → description` (98%), `dept → department` (94%)
- Admin confirms mappings
- Batch analysis runs: all 1550 records get embeddings
- Progress bar moves via Socket.IO

### Day 3 — Admin Discovers Patterns

- Admin goes to `/admin/patterns` → clicks "Refresh Patterns"
- `patternService.refreshPatterns()` fetches all 1553 grievances with embeddings
- Sends to `PatternDiscoveryAgent.discover()`
- HDBSCAN clusters them by embedding similarity
- One cluster has 130 grievances — all similar to "hostel wifi slow"
- Cluster gets title: `"Network/IT — Hostel (wifi, slow)"`
- Diagnostic Agent: "78% of reports occurred 6–10 PM. A possible contributing factor may be peak-time capacity."
- Pattern card appears on `/admin/patterns`

### Day 3 — Admin Investigates

- Admin clicks "View Pattern" on the Network/IT pattern
- `PatternDetail.jsx` shows:
  - 130 reports | Location: Hostel | Trend: Increasing
  - WHO: 95% students, CS/IT departments
  - WHEN: Peak at evenings (chart shows spike 6–10 PM)
  - Prediction Agent: slope = +3.2/week, trend = Increasing, 4-week forecast shown
  - Diagnostic: "Data shows concentration in evening hours..."

### Day 3 — Admin Takes Action

- Admin clicks "Take Action"
- `actionService.generateAction()` calls 4 AI endpoints sequentially
- `ActionCoordinationAgent` generates email draft with actual values:
  - "130 reports in last 30 days"
  - "Primary location: Hostel"
  - "Inspect hostel access-point coverage and peak-hour capacity"
- `ActionDetail.jsx` shows the draft
- Admin edits, clicks "Approve & Send"
- `approveAction()` saves: `approvedBy = admin._id`, `approvalDate = now`
- Status becomes: `Approved → Sent`

### Day 30 — IT Team Reports Fix

- Admin updates action status to "Resolved"
- Admin clicks "Generate Outcome" on `/admin/outcomes`
- `OutcomeRecurrenceAgent.measure_outcome()` runs:
  - Before: 130 complaints in 30 days
  - After: 42 complaints in 30 days
  - countChangePct: -67.7%
  - observationText: "Complaint frequency decreased by 67.7%..."

### Day 60 — Problem Returns

- New complaints start appearing: "Wi-Fi is slow again in hostel"
- Admin runs "Check Recurrence" on `/admin/recurrence`
- `detect_recurrence()`:
  - Gets centroid of original 130 embeddings
  - New complaints have cosine similarity 0.83–0.91 with centroid
  - Location match: Hostel ✓, Category match: Network/IT ✓
  - recurrenceScore: 0.78 → flagged as recurrence
- Alert appears: **"Possible recurrence of Network/IT — Hostel pattern"**
- Links back to original pattern + previous action

---

## 22. How to Run the Project

### Order matters. Start in this sequence:

**1. Start MongoDB first**
```bash
# Make sure MongoDB is running on port 27017
# Windows: Start MongoDB service, or run mongod
```

**2. Start Backend**
```bash
cd campus-guardian-360/backend
npm install
cp .env.example .env
# Edit .env: set JWT_SECRET to any long random string
node src/server.js
# You should see: [Server] listening on port 5000
```

**3. Start AI Service**
```bash
cd campus-guardian-360/ai-service
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
# First run downloads ~90MB model. Wait for "AI Service ready."
```

**4. Start Frontend**
```bash
cd campus-guardian-360/frontend
npm install
cp .env.example .env
npm run dev
# Opens at http://localhost:5173
```

**5. Generate Test Data**
```bash
python data/generate_synthetic.py
# Creates data/campus_grievances_historical.csv
```

**6. First Use**
1. Go to `http://localhost:5173/register`
2. Register with role: `admin`
3. Login → `/admin/dashboard`
4. Go to Upload → upload the CSV
5. Go to Patterns → Refresh Patterns
6. Watch AI discover patterns

---

## 23. What Is Implemented vs Not Implemented

### ✅ Fully Implemented

- User registration, login, JWT auth, bcrypt passwords
- All 5 roles with RBAC enforcement (server-side)
- Grievance submission with all fields, file upload
- Anonymous sensitive grievances with privacy-preserving identity separation
- Tracking code generation
- Status history timeline
- AI processing: topic, sentiment, urgency, keywords, embeddings
- all-MiniLM-L6-v2 embeddings (384-dim)
- CSV/XLSX upload with schema inspection and mapping confirmation
- Batch processing with Socket.IO progress
- HDBSCAN + K-Means clustering with Silhouette validation
- Diagnostic agent with cautious language
- Prediction agent: time-series, linear regression, 4-week forecast
- Recommendation agent: evidence-backed, template-based
- Action coordination: dynamic email draft from DB values
- Full human-in-the-loop approval (Approve/Edit/Reject/Save Draft)
- Action state machine
- Outcome measurement: before/after metrics with cautious language
- Recurrence detection via cosine similarity on embeddings
- Semantic search
- Admin dashboard with live Recharts charts
- Socket.IO real-time updates
- All admin pages: Grievances, Patterns, PatternDetail, ActionCenter, ActionDetail, Upload, Outcomes, Recurrence, Search, Departments, Evaluation, AuditLogs
- Safeguarding portal for sensitive_officer
- Audit logging for all sensitive access and admin actions
- Department seeding (10 default departments)
- Synthetic dataset generator (1550 records, 6 hidden patterns)

### ⚠️ Partially Implemented

- **Evaluation metrics**: Framework exists, shows "Not evaluated" until enough data is in DB and analysis is run
- **Semantic similarity duplicate detection**: Embedding is generated and stored, but pairwise similarity against all existing grievances is not computed on every submission (would be slow at scale — needs batch comparison)

### ❌ Not Implemented

- **Email sending**: SMTP is not configured. Email drafts are generated but not sent. The system correctly shows "Email service not configured" instead of pretending to send.
- **File preview**: Attachments are stored and downloadable, but no in-browser preview
- **Mobile responsive layout**: Tailwind is used but layouts are optimized for desktop/tablet
- **Password reset / forgot password flow**
- **Admin user management page** (create/deactivate users)

---

*This document was generated from actual code inspection of the Campus Guardian 360 project.*
