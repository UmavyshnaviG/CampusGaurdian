# Campus Guardian 360 — System Architecture

## Overview

Three-service architecture communicating over HTTP REST and WebSockets.

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend  (React + Vite + Tailwind)    port 5173           │
│  - Role-based UI (Student, Admin, Sensitive Officer)        │
│  - Real-time updates via Socket.IO client                   │
└─────────────────────────────────┬───────────────────────────┘
                                  │ HTTP / WebSocket
┌─────────────────────────────────▼───────────────────────────┐
│  Backend  (Node.js + Express + MongoDB)   port 5000         │
│  - Auth (JWT), grievance CRUD, file upload                  │
│  - Role & permission enforcement                            │
│  - Socket.IO server for real-time events                    │
│  - Proxies AI analysis requests to AI Service               │
│  - Stores all persistent data in MongoDB                    │
└─────────────────────────────────┬───────────────────────────┘
                                  │ HTTP (internal)
┌─────────────────────────────────▼───────────────────────────┐
│  AI Service  (Python + FastAPI)           port 8000         │
│  - 8-agent coordinated pipeline                             │
│  - Sentence Transformers (all-MiniLM-L6-v2)                 │
│  - HDBSCAN clustering, VADER/TextBlob sentiment             │
│  - scikit-learn trend/prediction                            │
│  - LLM reasoning for diagnosis/recommendation               │
└─────────────────────────────────────────────────────────────┘
```

## MongoDB Collections

| Collection | Purpose |
|---|---|
| `users` | Accounts for Student, Faculty, Staff, Admin, Sensitive Officer |
| `grievances` | All submitted grievances with AI metadata |
| `grievance_ai_metadata` | Embeddings, clusters, similarity groups per grievance |
| `datasets` | Uploaded historical dataset manifests |
| `dataset_rows` | Imported rows from historical datasets |
| `patterns` | Discovered patterns with evidence bundles |
| `diagnoses` | Diagnostic reports per pattern |
| `predictions` | Trend predictions per category/location |
| `recommendations` | AI-generated action recommendations |
| `actions` | Admin-approved actions with status tracking |
| `outcomes` | Before/after outcome measurements per action |
| `recurrence_alerts` | Detected recurrence events |
| `departments` | Department records for routing |
| `audit_logs` | All sensitive access and admin decisions |
| `notifications` | In-app notifications per user |

## 8-Agent AI Pipeline

```
Grievance Submitted
       │
       ▼
Agent 1 — Data Understanding Agent
  (dataset upload flow only: profiling, mapping, validation)
       │
       ▼
Agent 2 — Feedback Intelligence Agent
  (embedding, sentiment, dedup, metadata per grievance)
       │
       ▼
Agent 3 — Pattern Discovery Agent
  (HDBSCAN clustering, frequency, location, time analysis)
       │
       ▼
Agent 4 — Diagnostic Agent
  (LLM root-cause hypothesis from pattern bundle)
       │
       ▼
Agent 5 — Prediction Agent
  (time-series trend, forecasting, acceleration detection)
       │
       ▼
Agent 6 — Recommendation Agent
  (LLM actionable recommendations + department mapping)
       │
       ▼
Agent 7 — Action Coordination Agent
  (human-approved action routing, status tracking)
       │
       ▼
Agent 8 — Outcome & Recurrence Agent
  (before/after comparison, recurrence detection)
```

## Socket.IO Real-Time Events

| Event | Direction | Purpose |
|---|---|---|
| `grievance:new` | Server → Client | New grievance received |
| `grievance:status` | Server → Client | Status update on grievance |
| `pattern:detected` | Server → Client | New pattern surfaced |
| `action:updated` | Server → Client | Action status changed |
| `recurrence:alert` | Server → Client | Recurrence detected |
| `notification:new` | Server → Client | New notification for user |
