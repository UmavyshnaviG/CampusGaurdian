# Campus Guardian 360

**An AI-Driven Smart Campus Feedback, Grievance and Operations Intelligence System**

> Final-Year B.Tech Artificial Intelligence and Machine Learning Project

---

## What Is This?

Campus Guardian 360 converts individual campus feedback and grievances into continuous, evidence-based operational intelligence. It uses a coordinated **8-agent AI pipeline** to discover hidden patterns, predict emerging issues, recommend actions, coordinate departments, measure outcomes, and detect recurrence.

It is **not** a basic complaint form. It answers:
- What problem is happening? Where? When? How many people?
- Is it increasing or recurring?
- Are differently-worded complaints actually the same issue?
- What department should handle it?
- Did the action actually help?

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Node.js 18+, Express.js, MongoDB (Mongoose) |
| Real-time | Socket.IO |
| AI Service | Python 3.10+, FastAPI |
| ML / NLP | Sentence Transformers (all-MiniLM-L6-v2), HDBSCAN, scikit-learn, VADER |
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Auth | JWT + bcrypt |

---

## Prerequisites

Before running, install these on your machine:

| Tool | Version | Download |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| Python | 3.10+ | https://python.org |
| MongoDB | 6+ | https://www.mongodb.com/try/download/community |
| Git | any | https://git-scm.com |

Make sure **MongoDB is running locally** on port 27017 before starting the backend.

---

## Setup & Run (Step by Step)

### Step 1 — Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/campus-guardian-360.git
cd campus-guardian-360
```

---

### Step 2 — Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `backend/.env` and set these values:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/campus_guardian_360
JWT_SECRET=pick_any_long_random_string_here
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://127.0.0.1:8000
CLIENT_URL=http://localhost:5173
```

Start the backend:

```bash
node src/server.js
```

You should see:
```
[Database] Connected to MongoDB
[Server] Campus Guardian 360 backend listening on port 5000
```

---

### Step 3 — AI Service Setup

```bash
cd ai-service
pip install -r requirements.txt
cp .env.example .env
```

The `.env` defaults are fine for local development. Start the AI service:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**First start downloads ~90 MB** (the `all-MiniLM-L6-v2` model). This only happens once.

You should see:
```
AI Service starting — loading model: all-MiniLM-L6-v2
AI Service ready.
```

Verify it works: open http://127.0.0.1:8000/api/ai/health in your browser.

---

### Step 4 — Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

The `.env` defaults are fine. Start the frontend:

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

---

### Step 5 — Generate the Synthetic Dataset

```bash
python data/generate_synthetic.py
```

This creates `data/campus_grievances_historical.csv` with **1,550 records** containing 6 hidden patterns for the AI to discover.

---

### Step 6 — First Use

1. Go to http://localhost:5173
2. Click **Register** — create an **Admin** account
3. Log in
4. Go to **Upload Dataset** → upload `data/campus_grievances_historical.csv`
5. Confirm the column mappings → batch analysis runs
6. Go to **Patterns** → click **Refresh Patterns**
7. Watch the AI discover patterns from the data

---

## User Roles

| Role | Access |
|---|---|
| `student` | Submit grievances, track status |
| `faculty` | Submit grievances, track status |
| `staff` | Submit grievances, track status |
| `admin` | Full dashboard, AI analysis, pattern management, action approval |
| `sensitive_officer` | Restricted access to sensitive cases (harassment, bullying, etc.) |

Set the role during registration.

---

## Running All Three Services Together

Open **3 separate terminal windows**:

**Terminal 1 — Backend**
```bash
cd campus-guardian-360/backend
node src/server.js
```

**Terminal 2 — AI Service**
```bash
cd campus-guardian-360/ai-service
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 3 — Frontend**
```bash
cd campus-guardian-360/frontend
npm run dev
```

---

## Project Structure

```
campus-guardian-360/
├── backend/                  # Node.js / Express API
│   ├── src/
│   │   ├── config/           # DB connection, file upload config
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Auth, RBAC, audit logging
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   └── server.js         # Entry point
│   ├── .env.example
│   └── package.json
│
├── ai-service/               # Python / FastAPI AI pipeline
│   ├── app/
│   │   ├── agents/           # 8 AI agents
│   │   ├── core/             # Model manager, schemas, config
│   │   ├── routers/          # FastAPI route handlers
│   │   └── main.py           # Entry point
│   ├── .env.example
│   └── requirements.txt
│
├── frontend/                 # React / Vite / Tailwind
│   ├── src/
│   │   ├── components/       # Layouts, ProtectedRoute
│   │   ├── context/          # AuthContext
│   │   ├── pages/            # All 22 pages
│   │   ├── services/         # API call wrappers
│   │   └── App.jsx           # Route definitions
│   ├── .env.example
│   └── package.json
│
├── data/
│   ├── generate_synthetic.py # Dataset generator
│   └── campus_grievances_historical.csv
│
├── docs/                     # Architecture, API, AI agent docs
├── PROJECT_STATE.md
└── README.md
```

---

## 8 AI Agents

| Agent | Purpose |
|---|---|
| Data Understanding | Inspects uploaded CSV/XLSX, detects schema, suggests column mappings |
| Feedback Intelligence | Topic, sentiment, urgency, keywords, embeddings, duplicate detection |
| Pattern Discovery | HDBSCAN/K-Means clustering, semantic grouping, hotspot detection |
| Diagnostic | Evidence-backed pattern explanation with cautious causal language |
| Prediction | Time-series trend analysis, 4-week forecast, trend classification |
| Recommendation | Evidence-backed suggestions with responsible department routing |
| Action Coordination | Dynamic email drafts, human-in-the-loop approval workflow |
| Outcome & Recurrence | Before/after comparison, semantic recurrence detection |

---

## API Ports

| Service | Port | URL |
|---|---|---|
| Frontend | 5173 | http://localhost:5173 |
| Backend API | 5000 | http://localhost:5000/api |
| AI Service | 8000 | http://127.0.0.1:8000/api/ai |

---

## Common Issues

**MongoDB connection error**
→ Make sure MongoDB is running: `mongod` or start it from MongoDB Compass

**AI service model download slow**
→ First run downloads ~90MB. Wait for "AI Service ready." before using

**`npm install` fails**
→ Make sure Node.js 18+ is installed: `node --version`

**`pip install` fails**
→ Try `pip3 install -r requirements.txt` or use a virtual environment:
```bash
python -m venv venv
venv\Scripts\activate       # Windows
source venv/bin/activate    # Mac/Linux
pip install -r requirements.txt
```

**Frontend shows blank page**
→ Make sure backend is running on port 5000 first

---

## License

MIT License — free to use for academic and educational purposes.
