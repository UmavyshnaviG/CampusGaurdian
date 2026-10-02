# Campus Guardian 360 — API Reference

Base URL (Backend): `http://localhost:5000/api`  
Base URL (AI Service): `http://localhost:8000`

All backend endpoints require `Authorization: Bearer <token>` unless marked public.

---

## Authentication

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | Auth | Get current user profile |
| PUT | `/api/auth/me` | Auth | Update profile |
| POST | `/api/auth/logout` | Auth | Invalidate token |

---

## Grievances

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/grievances` | Auth | Submit new grievance |
| GET | `/api/grievances` | Auth | List own grievances (students/faculty/staff) |
| GET | `/api/grievances/:id` | Auth | Get single grievance |
| GET | `/api/grievances/admin/all` | Admin | List all grievances with filters |
| PATCH | `/api/grievances/:id/status` | Admin | Update grievance status |
| GET | `/api/grievances/:id/ai-metadata` | Admin | Get AI metadata for grievance |
| DELETE | `/api/grievances/:id` | Admin | Soft delete grievance |

### Sensitive Grievances

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/grievances/sensitive` | Sensitive Officer | List sensitive grievances |
| GET | `/api/grievances/sensitive/:id` | Sensitive Officer | View sensitive grievance with identity |

---

## Datasets

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/datasets/upload` | Admin | Upload CSV/XLSX historical dataset |
| GET | `/api/datasets` | Admin | List uploaded datasets |
| GET | `/api/datasets/:id` | Admin | Get dataset profile |
| POST | `/api/datasets/:id/approve-mapping` | Admin | Approve column mapping |
| POST | `/api/datasets/:id/process` | Admin | Trigger AI processing |

---

## Patterns

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/patterns` | Admin | List all patterns |
| GET | `/api/patterns/:id` | Admin | Get pattern with evidence |
| POST | `/api/patterns/discover` | Admin | Trigger pattern discovery |
| PATCH | `/api/patterns/:id/status` | Admin | Update pattern status |

---

## Analysis (proxied to AI Service)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/analysis/trends` | Admin | Get trend data by category/location |
| GET | `/api/analysis/predictions/:category` | Admin | Get predictions for category |
| GET | `/api/analysis/diagnosis/:patternId` | Admin | Get/trigger diagnosis for pattern |
| GET | `/api/analysis/semantic-search` | Admin | Semantic search across grievances |
| GET | `/api/analysis/clusters` | Admin | Get cluster visualization data |

---

## Recommendations & Actions

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/recommendations` | Admin | List recommendations |
| GET | `/api/recommendations/:id` | Admin | Get recommendation detail |
| POST | `/api/recommendations/:id/approve` | Admin | Approve recommendation → creates action |
| POST | `/api/recommendations/:id/reject` | Admin | Reject recommendation |
| GET | `/api/actions` | Admin | List actions |
| GET | `/api/actions/:id` | Admin | Get action detail |
| PATCH | `/api/actions/:id/status` | Admin | Update action status |
| GET | `/api/actions/:id/outcome` | Admin | Get outcome measurement |

---

## Departments

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/departments` | Admin | List departments |
| POST | `/api/departments` | Admin | Create department |
| PUT | `/api/departments/:id` | Admin | Update department |
| DELETE | `/api/departments/:id` | Admin | Deactivate department |

---

## Audit Logs

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/audit-logs` | Admin | List audit log entries with filters |
| GET | `/api/audit-logs/:id` | Admin | Get single audit log entry |

---

## Notifications

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/notifications` | Auth | Get own notifications |
| PATCH | `/api/notifications/:id/read` | Auth | Mark notification as read |
| PATCH | `/api/notifications/read-all` | Auth | Mark all as read |

---

## AI Service Endpoints (internal, called by backend)

Base: `http://localhost:8000`

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/agents/data-understanding` | Run Agent 1 on uploaded file |
| POST | `/agents/feedback-intelligence` | Run Agent 2 on single grievance |
| POST | `/agents/feedback-intelligence/batch` | Run Agent 2 on list of grievances |
| POST | `/agents/pattern-discovery` | Run Agent 3 |
| POST | `/agents/diagnosis` | Run Agent 4 for a pattern |
| POST | `/agents/prediction` | Run Agent 5 for category/location |
| POST | `/agents/recommendation` | Run Agent 6 |
| POST | `/agents/action-coordination` | Run Agent 7 |
| POST | `/agents/outcome-recurrence` | Run Agent 8 |
| POST | `/agents/semantic-search` | Semantic search across embeddings |

---

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": []
  }
}
```

## Success Response Format

```json
{
  "success": true,
  "data": {},
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 20
  }
}
```
