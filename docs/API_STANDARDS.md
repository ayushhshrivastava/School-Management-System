# Kids World School ERP — API Architecture & Standards
**Document Version:** 1.0 (Step 1 Foundation)  
**Standard:** RESTful JSON API  
**Base Path:** `/api/v1`  

---

## 1. API Design Philosophy

1. **Predictable URIs:** Resources are plural nouns (e.g., `/students`, `/classes`, `/fees/invoices`).
2. **Standardized Envelopes:** All responses, whether successful or erroneous, adhere to a strict top-level schema.
3. **Session-Aware Context:** Endpoints accept an optional `x-academic-session-id` header to route queries to a specific academic year. If omitted, the server defaults to the school's active session.
4. **Idempotency & Safety:** `GET`, `HEAD`, `OPTIONS` are safe and idempotent. State-changing requests (`POST`, `PUT`, `DELETE`) are guarded against archived/locked sessions.

---

## 2. Standardized Response Envelopes

### 2.1 Success Response (`ApiResponse<T>`)
```json
{
  "success": true,
  "message": "Resource retrieved successfully",
  "data": {
    "id": "c1f7b8a0-2f2b-4e1b-9f0a-7e1d5a3b2c1d",
    "name": "Nursery-A"
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "academicSessionId": "ay-2026-27"
  },
  "timestamp": "2026-09-27T17:15:00.000Z"
}
```

### 2.2 Error Response (`ApiErrorResponse`)
```json
{
  "success": false,
  "statusCode": 422,
  "message": "Request validation failed",
  "errorCode": "VALIDATION_ERROR",
  "errors": {
    "email": ["Invalid email format"],
    "dateOfBirth": ["Date of birth cannot be in the future"]
  },
  "timestamp": "2026-09-27T17:15:00.000Z"
}
```

---

## 3. HTTP Status Code Conventions

| Status Code | Reason & Scenario |
| :--- | :--- |
| **`200 OK`** | Successful query (`GET`), update (`PUT`/`PATCH`), or non-creation action. |
| **`201 Created`** | Successful entity creation (`POST /students`, `POST /fees/invoices`). |
| **`400 Bad Request`** | Malformed syntax, missing required headers, or unresolvable session ID. |
| **`401 Unauthorized`** | Missing or expired authentication token. |
| **`403 Forbidden`** | Authenticated user lacks required role/permission for this action. |
| **`404 Not Found`** | Requested resource ID or route does not exist. |
| **`409 Conflict`** | Duplicate admission number, conflicting username, or duplicate session code. |
| **`422 Unprocessable Entity`** | Zod input schema validation failure with field-by-field error list. |
| **`423 Locked`** | State mutation blocked because the target Academic Session is archived/locked. |
| **`429 Too Many Requests`** | Exceeded IP rate limit. |
| **`500 Internal Server Error`** | Unhandled server exception (logged with stack trace; masked in production). |

---

## 4. Pagination, Filtering & Sorting Standards

To prevent performance degradation on large datasets, collection endpoints follow uniform query parameters:

* `page`: Integer (Default: `1`)
* `limit`: Integer (Default: `20`, Max: `100`)
* `sortBy`: String field name (e.g. `createdAt`, `rollNumber`, `admissionDate`)
* `sortOrder`: `asc` | `desc` (Default: `desc`)
* `search`: String for fuzzy or text search across full name, admission number, or roll number.
