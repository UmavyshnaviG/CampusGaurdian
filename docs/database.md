# Campus Guardian 360 — Database Schema

Database: MongoDB  
ODM: Mongoose (Node.js backend)

---

## Collection: `users`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | MongoDB default |
| `userId` | String | UUID, unique |
| `name` | String | Full name |
| `email` | String | Unique, indexed |
| `passwordHash` | String | bcrypt hash |
| `role` | Enum | `student \| faculty \| staff \| admin \| sensitive_officer` |
| `department` | String | Academic/admin department |
| `year` | String | Year of study (students) |
| `hostel` | String | Hostel name (if applicable) |
| `designation` | String | For faculty/staff |
| `isActive` | Boolean | Account active flag |
| `createdAt` | Date | Auto |
| `updatedAt` | Date | Auto |

---

## Collection: `grievances`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `grievanceId` | String | UUID, unique, public reference |
| `submittedBy` | ObjectId | Ref: users (null if anonymous) |
| `displayName` | String | "Anonymous" or user name |
| `userType` | Enum | `student \| faculty \| staff` |
| `department` | String | Submitter's department |
| `category` | Enum | 16 categories (see spec) |
| `location` | Object | `{ campus, building, block, floor, room, type }` |
| `description` | String | Free text |
| `severity` | Enum | `Low \| Medium \| High \| Critical` |
| `attachments` | Array | File paths/URLs |
| `isAnonymous` | Boolean | Privacy flag |
| `identityProtected` | Boolean | Sensitive + anonymous combo |
| `sensitiveCategory` | Boolean | Harassment/bullying/etc. |
| `status` | Enum | `submitted \| under_review \| in_progress \| resolved \| closed` |
| `aiMetadataId` | ObjectId | Ref: grievance_ai_metadata |
| `assignedDepartment` | String | After routing |
| `resolvedAt` | Date | When closed |
| `createdAt` | Date | |
| `updatedAt` | Date | |

---

## Collection: `grievance_ai_metadata`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `grievanceId` | String | Foreign key |
| `topic` | String | |
| `subTopic` | String | |
| `issueType` | String | |
| `keywords` | Array\<String\> | |
| `sentiment` | Enum | `Positive \| Negative \| Neutral` |
| `sentimentScore` | Number | -1.0 to 1.0 |
| `urgency` | Number | 0.0 to 1.0 |
| `embedding` | Array\<Number\> | 384-dim vector |
| `duplicateProbability` | Number | 0.0 to 1.0 |
| `similarityGroup` | String | Group ID |
| `clusterId` | String | HDBSCAN cluster |
| `recurrenceIndicator` | Boolean | |
| `priorityRecommendation` | Enum | `Low \| Medium \| High \| Critical` |
| `confidence` | Number | 0.0 to 1.0 |
| `sensitiveFlag` | Boolean | |
| `processedAt` | Date | |

---

## Collection: `datasets`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `datasetId` | String | UUID |
| `uploadedBy` | ObjectId | Ref: users (admin) |
| `filename` | String | Original filename |
| `filePath` | String | Server path |
| `fileType` | Enum | `csv \| xlsx` |
| `totalRows` | Number | |
| `totalColumns` | Number | |
| `columnProfile` | Array | Output from Data Understanding Agent |
| `approvedMapping` | Object | Admin-confirmed column roles |
| `status` | Enum | `uploaded \| profiled \| mapping_pending \| approved \| processed` |
| `uploadedAt` | Date | |

---

## Collection: `patterns`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `patternId` | String | UUID |
| `label` | String | Human-readable pattern name |
| `category` | String | |
| `location` | String | |
| `complaintCount` | Number | |
| `timeWindow` | Object | `{ start, end }` |
| `strengthScore` | Number | 0.0 to 1.0 |
| `isEmerging` | Boolean | |
| `evidenceIds` | Array\<String\> | Grievance IDs |
| `representativeText` | String | |
| `clusterId` | String | |
| `status` | Enum | `active \| investigating \| actioned \| resolved` |
| `detectedAt` | Date | |

---

## Collection: `diagnoses`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `diagnosisId` | String | UUID |
| `patternId` | String | |
| `hypotheses` | Array | `[{ hypothesis, supporting_evidence, confidence }]` |
| `summary` | String | LLM-generated |
| `suggestedSteps` | Array\<String\> | |
| `generatedAt` | Date | |

---

## Collection: `predictions`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `predictionId` | String | UUID |
| `category` | String | |
| `location` | String | |
| `trendDirection` | Enum | `increasing \| stable \| decreasing` |
| `trendMagnitude` | Number | |
| `acceleration` | Number | |
| `forecast` | Array | `[{ date, predicted_count, lower, upper }]` |
| `confidence` | Number | |
| `statisticallySignificant` | Boolean | |
| `generatedAt` | Date | |

---

## Collection: `recommendations`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `recommendationId` | String | UUID |
| `patternId` | String | |
| `items` | Array | `[{ action_title, description, department, expected_impact, implementation_effort, priority, draft_communication }]` |
| `status` | Enum | `pending_review \| approved \| rejected` |
| `reviewedBy` | ObjectId | Admin |
| `reviewedAt` | Date | |
| `generatedAt` | Date | |

---

## Collection: `actions`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `actionId` | String | UUID |
| `recommendationId` | String | |
| `patternId` | String | |
| `title` | String | Admin-edited |
| `description` | String | |
| `departmentId` | String | Routed to |
| `approvedBy` | ObjectId | Admin |
| `status` | Enum | `pending \| in_progress \| completed \| rejected` |
| `notificationDraft` | String | |
| `notificationSent` | Boolean | |
| `createdAt` | Date | |
| `completedAt` | Date | |

---

## Collection: `outcomes`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `outcomeId` | String | UUID |
| `actionId` | String | |
| `patternId` | String | |
| `beforeCount` | Number | |
| `afterCount` | Number | |
| `volumeChangePct` | Number | |
| `sentimentBefore` | Number | |
| `sentimentAfter` | Number | |
| `resolutionRate` | Number | |
| `assessment` | Enum | `improved \| unchanged \| worsened` |
| `recurrenceDetected` | Boolean | |
| `recurrenceEvidence` | Array | |
| `recurrenceSimilarityScore` | Number | |
| `alertLevel` | Enum | `none \| low \| medium \| high` |
| `computedAt` | Date | |

---

## Collection: `departments`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `departmentId` | String | UUID |
| `name` | String | |
| `categories` | Array\<String\> | Responsible for these complaint categories |
| `contactEmail` | String | |
| `headName` | String | |
| `isActive` | Boolean | |

---

## Collection: `audit_logs`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `logId` | String | UUID |
| `actorId` | ObjectId | Who performed the action |
| `actorRole` | String | Role at time of action |
| `action` | String | e.g. `sensitive_case_viewed`, `action_approved` |
| `resourceType` | String | e.g. `grievance`, `pattern` |
| `resourceId` | String | |
| `details` | Object | Additional context |
| `ipAddress` | String | |
| `timestamp` | Date | |

---

## Collection: `notifications`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `notificationId` | String | UUID |
| `userId` | ObjectId | Target user |
| `type` | String | `status_update \| pattern_alert \| recurrence_alert` |
| `title` | String | |
| `message` | String | |
| `isRead` | Boolean | |
| `relatedId` | String | Grievance/action/pattern ID |
| `createdAt` | Date | |
