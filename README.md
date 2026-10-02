# Campus Guardian 360

**An AI-Driven Smart Campus Feedback, Grievance and Operations Intelligence System**

Final-Year B.Tech Artificial Intelligence and Machine Learning Project

---

## Project Description

Campus Guardian 360 converts individual campus feedback and grievances into continuous, evidence-based operational intelligence. It uses a coordinated multi-agent AI pipeline to identify hidden patterns, understand recurring problems, predict emerging issues, recommend actions, coordinate departments, measure outcomes, and detect recurrence.

The system goes beyond basic complaint management — it answers *what* is happening, *where*, *when*, *why*, and *what to do about it*.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Node.js 18+, Express 4, MongoDB (Mongoose) |
| Real-time | Socket.IO 4 |
| AI Service | Python 3.10+, FastAPI, Uvicorn |
| ML / NLP | Sentence Transformers (all-MiniLM-L6-v2), HDBSCAN, scikit-learn, VADER, TextBlob |
| Frontend | React 18, Vite 4, Tailwind CSS 3 |
| Authentication | JWT (jsonwebtoken + bcryptjs) |
| File handling | Multer |

---

## Project Structure

```
campus-guardian-360/
├── backend/          Node.js + Express API (port 5000)
├── ai-service/       Python + FastAPI AI pipeline (port 8000)
├── frontend/         React + Vite + Tailwind UI (port 5173)
├── data/             Synthetic data generators
└── docs/             Architecture, API, agent, DB, evaluation docs
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB 6+ (local or Atlas)
- npm or yarn

---

### 1. Backend

```bash
cd backend

# Copy environment file and fill in values
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

Backend starts on `http://localhost:5000`.

---

### 2. AI Service

```bash
cd ai-service

# Create and activate Python virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Copy environment file
cp .env.example .env

# Install dependencies
pip install -r requirements.txt

# Start development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

AI Service starts on `http://localhost:8000`.  
Interactive API docs at `http://localhost:8000/docs`.

---

### 3. Frontend

```bash
cd frontend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend starts on `http://localhost:5173`.

---

## User Roles

| Role | Description |
|---|---|
| **Student** | Submit and track grievances and feedback |
| **Faculty** | Submit and track grievances; access academic context |
| **Staff** | Submit and track grievances |
| **Admin** | Full dashboard: patterns, predictions, actions, outcomes, department management |
| **Sensitive Officer** | Restricted access to sensitive grievances (harassment, ragging, discrimination, safety) |

---

## AI Agent Overview

| # | Agent | Method | Purpose |
|---|---|---|---|
| 1 | Data Understanding | Deterministic (pandas) | Profile uploaded datasets, suggest column mappings |
| 2 | Feedback Intelligence | ML (embeddings, VADER) | Embed, classify, deduplicate, score each grievance |
| 3 | Pattern Discovery | ML (HDBSCAN, statistics) | Cluster complaints, detect frequency patterns |
| 4 | Diagnostic | LLM reasoning | Explain root causes from pattern evidence |
| 5 | Prediction | ML (regression, rolling stats) | Forecast complaint trends by category/location |
| 6 | Recommendation | LLM reasoning | Generate actionable recommendations + draft communications |
| 7 | Action Coordination | Deterministic + LLM draft | Route admin-approved actions to departments |
| 8 | Outcome & Recurrence | Deterministic + cosine similarity | Measure impact, detect recurrence |

See `docs/ai-agents.md` for full agent contracts and implementation notes.

---

## Documentation

| File | Contents |
|---|---|
| `docs/architecture.md` | System architecture, service diagram, Socket.IO events |
| `docs/ai-agents.md` | All 8 agents: inputs, outputs, JSON contracts, coordination |
| `docs/database.md` | MongoDB collections and field schemas |
| `docs/api.md` | All REST API endpoints for backend and AI service |
| `docs/evaluation.md` | Evaluation metrics by agent and system category |

---

## Key Capabilities

- Privacy-preserving anonymous sensitive grievances
- Semantic similarity using 384-dimensional sentence embeddings
- HDBSCAN density-based clustering for pattern discovery
- Time-series trend prediction with confidence intervals
- Human-in-the-loop approval for all AI-recommended actions
- Before/after outcome measurement for every completed action
- Recurrence detection using cluster centroid similarity
- Role-based access control with full audit logging
- Real-time notifications via Socket.IO
