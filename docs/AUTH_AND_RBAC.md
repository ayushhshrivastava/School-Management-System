# Kids World School ERP — Authentication & RBAC Architecture
**Document Version:** 2.0 (Step 2 Implementation)  
**Status:** Implemented, Tested, and Verified in Production Database  

---

## 1. Authentication Architecture Overview

The Kids World School ERP uses a hardened, stateless access token + stateful refresh token architecture designed for multi-device school staff workflows:

```
[Client (Web Browser)]
      |
      | 1. POST /api/v1/auth/login { identifier, password }
      v
[Express API Gateway]
      | Rate Limiter (20 req / 5 min)
      v
[AuthService.login]
      |-- 1. Lookup user by email or username
      |-- 2. Verify account is active (isActive = true)
      |-- 3. Check lockout window (lockedUntil > now())
      |-- 4. Verify password with bcrypt.compare(password, passwordHash)
      |-- 5. If failure -> increment failedLoginAttempts, trigger lockout if >= 5
      |-- 6. If success -> reset failedLoginAttempts = 0, update lastLoginAt = now()
      |-- 7. Generate JWT Access Token (15-minute lifespan)
      |-- 8. Generate 40-byte cryptographically random Refresh Token (7-day lifespan)
      |-- 9. Store SHA-256 hash of refresh token in PostgreSQL (refresh_tokens table)
      |-- 10. Record LOGIN_SUCCESS in audit_logs
      v
[HTTP Response]
      |-- Body: { success: true, data: { user, accessToken, expiresIn: "15m" } }
      |-- Set-Cookie: refreshToken=...; HttpOnly; SameSite=Lax; Path=/api/v1/auth; Max-Age=7d
```

---

## 2. Token Lifecycle & Rotation Strategy

### 2.1 Access Tokens (JWT)
* **Lifespan:** 15 minutes (`JWT_EXPIRES_IN=15m`).
* **Storage:** Client memory (`AuthContext` React state) — never stored in `localStorage` or `sessionStorage` to eliminate XSS token theft.
* **Claims:**
  ```json
  {
    "sub": "user-uuid",
    "username": "superadmin",
    "email": "admin@kidsworldschool.com",
    "schoolId": "school-uuid",
    "isSuperAdmin": true,
    "roles": ["SUPER_ADMIN"],
    "permissions": ["students:view", "fees:collect", "..."],
    "iat": 1727450000,
    "exp": 1727450900,
    "iss": "kids-world-school-erp",
    "aud": "kws-internal-staff"
  }
  ```

### 2.2 Refresh Tokens & Token Rotation
* **Lifespan:** 7 days (`JWT_REFRESH_EXPIRES_IN=7d`).
* **Storage:** Database table `refresh_tokens` stores the SHA-256 hash `tokenHash`. The plaintext token is delivered to the browser only via an `HTTP-Only` cookie.
* **Rotation:** Every time `POST /api/v1/auth/refresh` is called:
  1. The presented refresh token is verified and marked `revokedAt = now()`.
  2. A new refresh token is minted, and `replacedBy` points to the new token hash.
  3. A new access token and rotated refresh token cookie are issued.
* **Reuse Detection (Replay Defense):** If an already-revoked refresh token is presented, the system detects a potential theft/replay attack, immediately revokes **all** active sessions for that user, logs an audit warning (`REFRESH_TOKEN_REUSE_DETECTED`), and forces a re-login.

### 2.3 Revocation & Invalidation
* **Logout (`POST /api/v1/auth/logout`):** Marks the refresh token `revokedAt = now()`, clears the cookie, and records the `LOGOUT` audit log.
* **Password Change (`POST /api/v1/auth/change-password`):** Updates `passwordChangedAt = now()` and revokes all active refresh tokens for the user across all devices. Any existing access tokens issued prior to `passwordChangedAt` are rejected by `authenticate` middleware.

---

## 3. Account Lockout & Brute-Force Defense

* **Max Failed Attempts:** 5 consecutive failed passwords (`AUTH_MAX_FAILED_ATTEMPTS=5`).
* **Lockout Duration:** 15 minutes (`AUTH_LOCKOUT_MINUTES=15`).
* **Status Code:** HTTP `423 Locked` (`ACCOUNT_LOCKED`).
* **Success Reset:** A single successful authentication immediately resets `failedLoginAttempts: 0` and clears `lockedUntil: null`.
* **Rate Limiting:** IP-level rate limit throttles `/api/v1/auth/login` to 20 requests per 5 minutes per IP address.

---

## 4. Role-Based Access Control (RBAC) & Permission Matrix

Permissions follow the strict `module:action` pattern. The system currently provisions 31 granular permissions across 8 functional modules:

### 4.1 Permission Definitions

| Module | Permission Code | Description |
| :--- | :--- | :--- |
| **Students** | `students:view` | View student profiles and rosters |
| | `students:create` | Register new student admissions |
| | `students:update` | Edit student records and parent contacts |
| | `students:delete` | Archive or remove student records |
| | `students:export` | Export student rosters to Excel/CSV |
| **Fees** | `fees:view` | View fee structures and billing invoices |
| | `fees:collect` | Collect payments and generate receipts |
| | `fees:update` | Modify fee concessions or adjustments |
| | `fees:delete` | Void receipts or cancel transactions |
| | `fees:export` | Export financial reports and defaulters |
| **Attendance** | `attendance:view` | View daily attendance registers |
| | `attendance:mark` | Mark student attendance |
| | `attendance:update` | Alter past attendance records |
| **Exams** | `exams:view` | View examination schedules and gradebooks |
| | `exams:create` | Create exam schedules and terms |
| | `marks:enter` | Enter marks for students |
| | `marks:update` | Modify entered marks |
| | `marks:approve` | Approve marks and generate report cards |
| **Academics** | `academics:view` | View classes, sections, and subjects |
| | `academics:manage` | Configure classes, sections, and subjects |
| **Staff** | `staff:view` | View staff directory |
| | `staff:manage` | Manage staff profiles and designations |
| **Reports** | `reports:view` | View school operational reports |
| | `reports:export` | Export analytical summaries |
| **System** | `users:view` | View internal staff user accounts |
| | `users:create` | Create staff user accounts |
| | `users:update` | Update staff accounts and lock status |
| | `users:delete` | Deactivate staff accounts |
| | `roles:manage` | Configure roles and map permissions |
| | `audit:view` | Inspect forensic audit logs |
| | `system:config` | Modify school-wide settings |

---

### 4.2 Role $\rightarrow$ Permission Matrix

| Role Code | Role Name | Granted Permissions | Key Boundary Enforced |
| :--- | :--- | :--- | :--- |
| **`SUPER_ADMIN`** | Super Administrator | All 31 permissions (`*` wildcard bypass) | Full system governance |
| **`PRINCIPAL`** | Principal / Admin | `students:*` (except delete), `fees:view`, `fees:export`, `attendance:view`, `exams:*`, `marks:*`, `academics:*`, `staff:*`, `reports:*`, `users:view`, `audit:view` | Complete academic & operational oversight; cannot void fees or delete students directly |
| **`ACCOUNTANT`** | School Accountant | `fees:view`, `fees:collect`, `fees:update`, `fees:export`, `students:view`, `reports:view`, `reports:export` | Strictly restricted from altering exam marks, editing attendance, or managing staff/users |
| **`OFFICE_STAFF`** | Office / Admission Staff | `students:view`, `students:create`, `students:update`, `students:export`, `fees:view`, `attendance:view`, `staff:view`, `academics:view`, `reports:view` | Cannot collect/modify fees or modify exam marks |
| **`TEACHER`** | Teacher | `students:view`, `attendance:view`, `attendance:mark`, `exams:view`, `marks:enter`, `marks:update`, `academics:view` | Cannot view or collect fees, delete students, or change system configurations |
| **`CLASS_TEACHER`** | Class Teacher | All `TEACHER` permissions + `attendance:update`, `reports:view` | Elevated section attendance and progress report access |

---

## 5. Super Admin Provisioning

* Initial Super Admin credentials are read securely from validated environment variables:
  * `SUPER_ADMIN_NAME`: System Administrator
  * `SUPER_ADMIN_USERNAME`: `superadmin`
  * `SUPER_ADMIN_EMAIL`: `admin@kidsworldschool.com`
  * `SUPER_ADMIN_PASSWORD`: Configured via `.env` (Default: `Admin@KWS2026#Secure`)
* The provisioning script (`backend/prisma/seed.ts`) checks for existing accounts by email, username, and `isSuperAdmin` flag, preventing duplicate admin creation.
* The password is encrypted with `bcrypt` (work factor 12) before persistence.
* An initial forensic entry (`SYSTEM_INITIALIZATION_SEEDED`) is recorded in `audit_logs`.

---

## 6. Authentication API Endpoints Reference

All endpoints are prefixed with `/api/v1/auth`:

### 1. `POST /login`
* **Auth Required:** No
* **Rate Limited:** Yes (20 req / 5 min)
* **Request Body:**
  ```json
  {
    "identifier": "admin@kidsworldschool.com",
    "password": "Admin@KWS2026#Secure"
  }
  ```
* **Response (HTTP 200):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": { "id": "uuid", "username": "superadmin", "roles": ["SUPER_ADMIN"], "permissions": [...] },
      "accessToken": "eyJhbGciOi...",
      "expiresIn": "15m"
    },
    "timestamp": "2026-09-27T17:40:00.000Z"
  }
  ```

### 2. `POST /refresh`
* **Auth Required:** No (reads HTTP-Only cookie `refreshToken` or optional JSON body)
* **Response (HTTP 200):** Rotates cookie and issues new access token.

### 3. `POST /logout`
* **Auth Required:** Yes (`Bearer <token>`)
* **Response (HTTP 200):** Revokes refresh token in database, clears cookie, logs audit event.

### 4. `GET /me`
* **Auth Required:** Yes (`Bearer <token>`)
* **Response (HTTP 200):** Returns sanitized user profile, roles, permissions, and institution context.

### 5. `POST /change-password`
* **Auth Required:** Yes (`Bearer <token>`)
* **Request Body:**
  ```json
  {
    "currentPassword": "CurrentPassword123!",
    "newPassword": "NewSecurePassword2026#",
    "confirmPassword": "NewSecurePassword2026#"
  }
  ```
* **Response (HTTP 200):** Updates password, revokes all refresh tokens, invalidates older tokens.
