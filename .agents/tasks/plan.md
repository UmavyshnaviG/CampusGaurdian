# Implementation Plan — Stages 9 & 10

## Codebase Audit Summary

Most Stage 9 backend and AI-service work was already completed in prior sessions.
The plan below is ordered by actual gaps found, not by the original spec.

---

## What Already Exists (do NOT recreate)

| File | Status |
|------|--------|
| `ai-service/app/agents/outcome_recurrence.py` | Complete — `measure_outcome()` + `detect_recurrence()` |
| `ai-service/app/routers/outcomes.py` | Complete — POST `/measure-outcome` |
| `ai-service/app/routers/actions.py` | Complete — POST `/check-recurrence` wired to agent |
| `ai-service/app/main.py` | Complete — already imports/mounts `outcomes` router |
| `backend/src/models/Outcome.js` | Complete |
| `backend/src/services/outcomeService.js` | Complete |
| `backend/src/controllers/outcomeController.js` | Complete |
| `backend/src/routes/outcomes.js` | Complete |
| `backend/src/server.js` | `/api/outcomes` already mounted |
| `frontend/src/services/outcomeService.js` | Complete |
| `frontend/src/pages/admin/Outcomes.jsx` | Complete |

---

## Stage 9 — Remaining Work (2 items)

- [ ] 1. Create `frontend/src/pages/admin/RecurrenceMonitor.jsx`
      Full page that lists all outcomes with `recurrenceStatus = 'Detected'` or `'Monitoring'`.
      Shows a table: Pattern title, category, action number, recurrence status badge,
      recurrenceScore, daysSinceResolution, evidenceOfRecurrence list.
      "Trigger Check" button per row calls `POST /api/outcomes/check-recurrence/:patternId`
      via `checkRecurrence()` from the existing `outcomeService.js`.
      Has a "Check All" bulk button. Uses `getOutcomes({ recurrenceStatus })` to load.
      Recharts BarChart showing recurrence score per pattern.
      Follow the exact UI pattern used in `Outcomes.jsx`: white cards, Tailwind, lucide-react icons.
      Files: `frontend/src/pages/admin/RecurrenceMonitor.jsx`
      Verify: `npm run build` in `frontend/` — 0 errors.

- [ ] 2. Wire Stage 9 routes in `frontend/src/App.jsx`
      Import `Outcomes` from `./pages/admin/Outcomes` and `RecurrenceMonitor` from `./pages/admin/RecurrenceMonitor`.
      Add inside the `/admin/*` nested Routes (after the existing `action-center/:id` route):
      ```
      <Route path="outcomes" element={<Outcomes />} />
      <Route path="recurrence" element={<RecurrenceMonitor />} />
      ```
      Files: `frontend/src/App.jsx`
      Verify: `npm run build` — 0 errors.

---

## Stage 10 — Complete Dashboard, Semantic Search, Evaluation, All Missing Pages

Cross-cutting patterns to follow throughout Stage 10:
- All backend routes use `authenticate` + `authorize('admin')` + `auditLog(...)` middleware from `backend/src/middleware/auth.js`.
- All backend controllers return `{ success, message, data }` (see `actionController.js`).
- All services use `axios` for AI calls and handle errors non-fatally where possible.
- Frontend pages use the same Tailwind + lucide-react + Recharts stack as `Outcomes.jsx` / `ActionCenter.jsx`.
- The `api` axios instance from `frontend/src/services/api.js` is the only HTTP client used in frontend services.

---

- [ ] 3. Create `backend/src/models/Department.js`
      Mongoose schema fields: `name` (String, required, unique, index), `code` (String, unique),
      `description` (String, default ''), `contactEmail` (String, default ''),
      `head` (String, default ''), `isActive` (Boolean, default true), `createdAt`, `updatedAt`.
      Pre-save hook sets `updatedAt`. Index on `isActive`.
      Files: `backend/src/models/Department.js`
      Verify: `node --check backend/src/models/Department.js` — exits 0.

- [ ] 4. Create `backend/src/routes/departments.js`
      Import and require `Department` model. No separate service/controller needed — inline logic
      in router functions (pattern is simpler than patterns/actions, matches the simpler upload routes).
      Routes:
      - `GET /` — `authenticate`, `authorize('admin')` → return all active departments sorted by name.
      - `POST /` — `authenticate`, `authorize('admin')`, `auditLog('create_department','Department')` → validate `name` required, upsert by name, return 201.
      - `PATCH /:id` — `authenticate`, `authorize('admin')`, `auditLog('update_department','Department')` → update fields present in body, return updated doc.
      Seed function: export `seedDepartments()` which upserts 10 default departments by name:
      `['Academic Affairs', 'Infrastructure & Facilities', 'IT Services', 'Hostel Administration',
        'Transport Services', 'Security & Safety', 'Student Welfare', 'Library Services',
        'Canteen & Catering', 'Human Resources']`
      Each with a matching `code` (e.g. `ACAD`, `INFRA`, etc.).
      Files: `backend/src/routes/departments.js`
      Verify: `node --check backend/src/routes/departments.js` — exits 0.

- [ ] 5. Mount departments route and call seed in `backend/src/server.js`
      Add `const departmentRoutes = require('./routes/departments');` at top.
      Add `const { seedDepartments } = require('./routes/departments');` (same import).
      Add `app.use('/api/departments', departmentRoutes);` in the Routes block.
      In `bootstrap()`, after `await connectDB()`, add `await seedDepartments();`.
      Files: `backend/src/server.js`
      Verify: `node --check backend/src/server.js` — exits 0.

- [ ] 6. Create `backend/src/routes/search.js`
      Semantic search route: `POST /` — `authenticate`, `authorize('admin')`.
      Request body: `{ query: string, limit?: number }`.
      Validate `query` is non-empty string.
      Steps in handler:
      1. Call AI service `POST /api/ai/search` with `{ query, limit: limit || 10 }`.
      2. The AI service returns `{ results: [{ grievanceId, score, excerpt }] }` (see item 7 for AI side).
      3. Fetch matching Grievance docs from MongoDB using the returned grievanceIds.
      4. Return `{ success: true, data: { results } }`.
      Handle AI call failure with 502 and clear message.
      Files: `backend/src/routes/search.js`
      Verify: `node --check backend/src/routes/search.js` — exits 0.

- [ ] 7. Create `ai-service/app/routers/search.py`
      New FastAPI router for semantic search.
      Request model: `SearchRequest(query: str, limit: int = 10)`.
      Handler `POST /search`:
      1. Use `model_manager.encode_one(body.query)` to get query embedding.
      2. Call `model_manager.compare_one_to_many(query_vec, corpus_vecs)` — but fetching
         corpus embeddings from MongoDB is not available in the AI service (it has no DB connection).
         Instead, accept an optional `corpus: List[Dict]` in the request body — each item has
         `id` (string grievanceId) and `embedding` (List[float]).
         If `corpus` not provided, return empty results with a warning.
      3. Score all corpus items, sort descending, take top `limit`.
      4. Return `AgentResponse` with `data.results = [{ grievanceId, score }]`.
      Update `backend/src/routes/search.js` (item 6) to first fetch grievances with embeddings
      from MongoDB, serialise them as `corpus`, POST to AI service with `{ query, corpus, limit }`,
      then enrich returned results with grievance fields (trackingCode, category, description excerpt,
      severity, status).
      Mount in `ai-service/app/main.py`: `from app.routers import search` then
      `app.include_router(search.router, prefix="/api/ai")`.
      Files: `ai-service/app/routers/search.py`, `ai-service/app/main.py`,
             `backend/src/routes/search.js`
      Verify: `python -m py_compile ai-service/app/routers/search.py` exits 0;
              `node --check backend/src/routes/search.js` exits 0.

- [ ] 8. Mount search and evaluation routes in `backend/src/server.js`
      Add `const searchRoutes = require('./routes/search');` and
      `const evaluationRoutes = require('./routes/evaluation');`.
      Add `app.use('/api/search', searchRoutes);` and `app.use('/api/evaluation', evaluationRoutes);`.
      Files: `backend/src/server.js`, (plus item below for evaluation route file)
      Verify: `node --check backend/src/server.js` exits 0.

- [ ] 9. Create `backend/src/routes/evaluation.js`
      Single route: `GET /metrics` — `authenticate`, `authorize('admin')`.
      Handler:
      1. Call AI service `GET /api/ai/evaluate`.
      2. Query MongoDB for real aggregate stats:
         - Total grievances, resolved count, avg resolution time (from statusHistory), by-category counts.
         - Total patterns, total actions, approved actions count, resolved actions count.
         - Total outcomes, improved/stable/worsened counts, recurrence detected count.
      3. Merge AI metrics with MongoDB stats, return as `{ success: true, data: { metrics } }`.
      AI call failure is non-fatal — return MongoDB stats with `aiMetrics: null`.
      Also update `ai-service/app/routers/evaluation.py` to compute real metrics:
      The evaluation endpoint receives no DB data (AI service has no DB). Update it to accept an
      optional `POST /evaluate` body with grievance samples for classification accuracy estimation.
      Keep `GET /evaluate` returning the skeleton (real DB metrics come from the backend route).
      Files: `backend/src/routes/evaluation.js`, `ai-service/app/routers/evaluation.py`
      Verify: `node --check backend/src/routes/evaluation.js` exits 0;
              `python -m py_compile ai-service/app/routers/evaluation.py` exits 0.

- [ ] 10. Create `frontend/src/components/layouts/AdminLayout.jsx`
       Shared layout wrapper for all admin pages. Provides:
       - Fixed left sidebar (240px wide on md+, collapsible on mobile) with navigation links to:
         Dashboard, Grievances, Patterns, Action Center, Outcomes, Recurrence Monitor,
         Semantic Search, Departments, Evaluation, Audit Logs, Upload Dataset.
       - Active link highlight using `NavLink` from react-router-dom.
       - Top bar with app name, user name from `useAuth()`, and logout button.
       - Main content area: `<main>{children}</main>`.
       - Renders `{children}` inside the layout body.
       Accept a `children` prop. Use Tailwind for layout.
       Files: `frontend/src/components/layouts/AdminLayout.jsx`
       Verify: `npm run build` — 0 errors.

- [ ] 11. Create `frontend/src/components/layouts/UserLayout.jsx`
       Shared layout for user portal pages. Simpler: top navigation bar with links to
       Dashboard, Submit Grievance, My Grievances. Logout button. `{children}` in main body.
       Files: `frontend/src/components/layouts/UserLayout.jsx`
       Verify: `npm run build` — 0 errors.

- [ ] 12. Create `frontend/src/pages/admin/AdminDashboard.jsx`
       Executive dashboard with live API data.
       Sections:
       - Stat cards row: Total Grievances, Pending (Submitted+Under Review), Resolved, Active Patterns,
         Pending Actions, Outcomes Measured. Each fetched from their respective `/api/*` endpoints.
       - Socket.IO connection to `VITE_API_URL` (same baseURL as api.js, without `/api` suffix)
         listening for `grievance:new` and `grievance:statusUpdate` events to refresh stats.
       - Recharts BarChart: grievances by category (from a grievances summary query or
         from `/api/evaluation/metrics`).
       - Recharts LineChart: weekly submission trend from the evaluation metrics.
       - Recent Grievances table: last 5 submissions (via `getGrievances({ limit: 5 })`
         from the existing `grievanceService.js`).
       - Quick links card row: Patterns, Action Center, Upload Dataset, Semantic Search.
       Uses `AdminLayout` wrapper.
       Files: `frontend/src/pages/admin/AdminDashboard.jsx`,
              also `frontend/src/services/evaluationService.js` (new, calls `GET /evaluation/metrics`)
       Verify: `npm run build` — 0 errors.

- [ ] 13. Create `frontend/src/pages/admin/AdminGrievances.jsx`
       Full admin grievances management table.
       - Fetch from `GET /api/grievances` (existing route with RBAC — admin sees all).
       - Filters: category, status, severity, search text (client-side filter on description/tracking).
       - Pagination: server-side, 20 per page.
       - Table columns: Tracking Code, Submitted By (or 'Anonymous'), Category, Severity badge,
         Status badge, AI Priority, Created Date, Actions (View link to grievance detail).
       - Export CSV button: downloads displayed results as CSV using browser Blob API.
       - Clicking a row navigates to a grievance detail (admin view) — can reuse the existing
         `GrievanceDetail` page from user portal (it already handles admin RBAC via the existing service).
       Uses `AdminLayout` wrapper.
       Files: `frontend/src/pages/admin/AdminGrievances.jsx`
       Verify: `npm run build` — 0 errors.

- [ ] 14. Create `frontend/src/pages/admin/SemanticSearch.jsx`
       Admin semantic search page.
       - Text input for natural language query.
       - On submit: POST to `/api/search` via new `frontend/src/services/searchService.js`.
       - Display results as cards: tracking code, category, severity, status, description excerpt,
         similarity score bar (percentage).
       - Loading spinner, empty state, error state.
       - "View Grievance" link per result (link to `/user/grievance/:id` — opens existing detail page).
       Uses `AdminLayout` wrapper.
       Files: `frontend/src/pages/admin/SemanticSearch.jsx`,
              `frontend/src/services/searchService.js`
       Verify: `npm run build` — 0 errors.

- [ ] 15. Create `frontend/src/pages/admin/Departments.jsx`
       Department management page.
       - Load from `GET /api/departments`.
       - Display as a cards grid: department name, code, head, contact email, isActive toggle.
       - "Add Department" button opens a modal form with name, code, description, contactEmail, head.
       - Submit calls `POST /api/departments`.
       - "Edit" button per card opens edit modal, submits `PATCH /api/departments/:id`.
       - Uses `frontend/src/services/departmentService.js` (new, implements getDepartments,
         createDepartment, updateDepartment calls).
       Uses `AdminLayout` wrapper.
       Files: `frontend/src/pages/admin/Departments.jsx`,
              `frontend/src/services/departmentService.js`
       Verify: `npm run build` — 0 errors.

- [ ] 16. Create `frontend/src/pages/admin/Evaluation.jsx`
       AI evaluation and system metrics dashboard.
       - Load from `GET /api/evaluation/metrics` via `evaluationService.js`.
       - Sections: System Stats (total grievances, resolved %, avg resolution time),
         AI Metrics skeleton (classification, sentiment, clustering status from AI service),
         Pattern Stats (patterns active/resolved), Action Stats (approved/resolved),
         Outcome Stats (improved/stable/worsened, recurrence detected count).
       - Recharts PieChart for outcome directions.
       - Recharts BarChart for grievances by category.
       - "Refresh" button.
       Uses `AdminLayout` wrapper.
       Files: `frontend/src/pages/admin/Evaluation.jsx`
       Verify: `npm run build` — 0 errors.

- [ ] 17. Create `frontend/src/pages/admin/AuditLogs.jsx`
       Admin audit log viewer.
       - Fetch from `GET /api/auth/audit` — NOTE: this endpoint doesn't exist yet in the backend.
         Create `GET /api/auth/audit` route (admin only) in `backend/src/routes/auth.js` that queries
         `AuditLog` model with pagination and filters (userId, actionType, dateRange).
         The `AuditLog` model already exists in `backend/src/models/AuditLog.js`.
       - Table: timestamp, user, action type, resource, IP address.
       - Filters: action type dropdown, date range inputs.
       - Export CSV.
       Uses `AdminLayout` wrapper.
       Files: `frontend/src/pages/admin/AuditLogs.jsx`,
              `backend/src/routes/auth.js` (add GET /audit route),
              `backend/src/controllers/authController.js` (add `listAuditLogs` function)
       Verify: `node --check backend/src/controllers/authController.js` exits 0;
               `npm run build` — 0 errors.

- [ ] 18. Create `frontend/src/pages/safeguarding/SafeguardingPortal.jsx` and `SensitiveCase.jsx`
       `SafeguardingPortal.jsx`:
       - Protected by `sensitive_officer` role (already handled by App.jsx ProtectedRoute).
       - Stats: total sensitive grievances, anonymous sensitive count, unresolved sensitive count.
       - Table of sensitive grievances (`isSensitive: true`) fetched via existing `GET /api/grievances`
         (the existing `grievanceService.js` RBAC path for sensitive_officer already works — confirmed
         in Stage 3 patternService).
       - Each row links to `SensitiveCase.jsx`.
       `SensitiveCase.jsx`:
       - Shows full grievance detail for sensitive cases.
       - Includes a "Reveal Identity" section (for `isAnonymousSensitive` cases) that calls a new
         `GET /api/grievances/:id/identity` endpoint (admin-only, returns `sensitiveIdentity` field).
         Add this route to `backend/src/routes/grievances.js` and a `getSensitiveIdentity` function
         to `backend/src/controllers/grievanceController.js` (querying with `.select('+sensitiveIdentity')`).
       - Status update control using existing `updateStatus` from grievanceService.
       Files: `frontend/src/pages/safeguarding/SafeguardingPortal.jsx`,
              `frontend/src/pages/safeguarding/SensitiveCase.jsx`,
              `backend/src/routes/grievances.js` (add GET /:id/identity),
              `backend/src/controllers/grievanceController.js` (add getSensitiveIdentity)
       Verify: `node --check backend/src/controllers/grievanceController.js` exits 0;
               `npm run build` — 0 errors.

- [ ] 19. Wire all Stage 10 routes in `frontend/src/App.jsx`
       Import all new pages:
       - `AdminDashboard` from `./pages/admin/AdminDashboard`
       - `AdminGrievances` from `./pages/admin/AdminGrievances`
       - `SemanticSearch` from `./pages/admin/SemanticSearch`
       - `Departments` from `./pages/admin/Departments`
       - `Evaluation` from `./pages/admin/Evaluation`
       - `AuditLogs` from `./pages/admin/AuditLogs`
       - `SafeguardingPortal` from `./pages/safeguarding/SafeguardingPortal`
       - `SensitiveCase` from `./pages/safeguarding/SensitiveCase`
       Update the placeholder `AdminDashboard` function to the imported component.
       Add inside `/admin/*` nested Routes:
       ```
       <Route path="grievances" element={<AdminGrievances />} />
       <Route path="search" element={<SemanticSearch />} />
       <Route path="departments" element={<Departments />} />
       <Route path="evaluation" element={<Evaluation />} />
       <Route path="audit-logs" element={<AuditLogs />} />
       ```
       Update `/safeguarding/*` route from the placeholder `SafeguardingDashboard` to nested Routes:
       ```
       <Route
         path="/safeguarding/*"
         element={<ProtectedRoute requiredRoles={['sensitive_officer', 'admin']}>
           <Routes>
             <Route path="portal" element={<SafeguardingPortal />} />
             <Route path="case/:id" element={<SensitiveCase />} />
             <Route path="*" element={<Navigate to="portal" replace />} />
           </Routes>
         </ProtectedRoute>}
       />
       ```
       Files: `frontend/src/App.jsx`
       Verify: `npm run build` — 0 errors.

---

## Build Verification Commands

```bash
# Backend syntax check
node --check backend/src/server.js
node --check backend/src/models/Department.js
node --check backend/src/routes/departments.js
node --check backend/src/routes/search.js
node --check backend/src/routes/evaluation.js

# AI service syntax check
python -m py_compile ai-service/app/routers/search.py
python -m py_compile ai-service/app/main.py

# Frontend full build (catches all imports/JSX errors)
cd frontend && npm run build
```

---

## Implementation Order

Items must be done in this order due to dependencies:

1. `RecurrenceMonitor.jsx` (standalone, no deps)
2. `App.jsx` Stage 9 routes (needs RecurrenceMonitor)
3. `Department.js` model (no deps)
4. `departments.js` route (needs Department model)
5. `server.js` update 1 — add departments + seed (needs route)
6. `evaluation.js` backend route (needs existing AI eval endpoint)
7. `search.py` AI router (needs model_manager, no new deps)
8. `search.js` backend route (needs AI search endpoint)
9. `server.js` update 2 — add search + evaluation mounts
10. `auth.js` + `authController.js` — add audit logs endpoint
11. `grievances.js` + `grievanceController.js` — add identity endpoint
12. Frontend layouts (`AdminLayout.jsx`, `UserLayout.jsx`)
13. Frontend services (`evaluationService.js`, `searchService.js`, `departmentService.js`)
14. `AdminDashboard.jsx` (needs evaluationService, grievanceService)
15. `AdminGrievances.jsx` (needs grievanceService)
16. `SemanticSearch.jsx` (needs searchService)
17. `Departments.jsx` (needs departmentService)
18. `Evaluation.jsx` (needs evaluationService)
19. `AuditLogs.jsx` (needs backend audit endpoint)
20. `SafeguardingPortal.jsx` + `SensitiveCase.jsx` (needs identity endpoint)
21. `App.jsx` — wire all Stage 10 routes (needs all pages)
