# Kids World School ERP — Security, RBAC & Audit Architecture
**Document Version:** 1.0 (Step 1 Foundation)  
**Security Standard:** OWASP Top 10 Aligned Defense-in-Depth  

---

## 1. Authentication Architecture

The ERP implements a stateless, token-based authentication mechanism designed to support desktop browsers, administrative tablets, and future mobile portals.

### 1.1 Password Security & Hashing
* **Algorithm:** `bcrypt` with work factor 12 (computationally intensive to resist brute-force/GPU cracking).
* **Storage Rule:** Plaintext passwords are never stored in memory, logs, or database rows. Only the one-way hash is retained.
* **Complexity Policy:** Minimum 8 characters, requiring mixed-case alphanumeric and special characters.

### 1.2 Brute-Force & Lockout Mitigation
* **Account Lockout:** Upon 5 consecutive failed login attempts, the `User.failedLoginAttempts` counter triggers a temporary account lock (`lockedUntil = now() + 15 minutes`).
* **Rate Limiting:** IP-level rate limiting throttles authentication endpoints (`/api/v1/auth/login`) to 5 attempts per minute per IP address.

### 1.3 Token Lifecycle (Step 2 Design)
* **Access Tokens:** Short-lived JWTs (15–30 minutes) containing minimal user claims (`userId`, `schoolId`, `roles`).
* **Refresh Tokens:** Long-lived cryptographically random strings (7 days) stored securely in `HTTP-Only`, `SameSite=Strict`, `Secure` cookies.
* **Session Revocation:** Passwords updates increment `passwordChangedAt`. Any tokens issued prior to that timestamp are immediately invalidated by authentication middleware.

---

## 2. Role-Based Access Control (RBAC) Architecture

Access control is strictly enforced on the server. The client interface mirrors permissions for user experience, but **the backend API is the final authority**.

### 2.1 Default Roles & Privilege Scope

| Role Code | Operational Scope | Example Permissions |
| :--- | :--- | :--- |
| `SUPER_ADMIN` | Technical administration, role management, audit inspection, backups. | `*` (Full system bypass) |
| `PRINCIPAL` | Complete operational visibility, reports, notices, academic approvals. | `students:read`, `fees:read`, `exams:read`, `reports:*`, `notices:*` |
| `ACCOUNTANT` | Fee setup, invoice generation, payment collection, fee receipts, financial reports. | `fees:*`, `students:read`, `reports:finance` (Forbidden from modifying exam marks) |
| `OFFICE_STAFF` | Student admission registration, parent updates, document verification. | `students:create`, `students:update`, `admissions:*` |
| `TEACHER` | Subject attendance, homework posting, mark entry for assigned subjects. | `attendance:create`, `marks:create`, `marks:update` (Forbidden from collecting fees) |
| `CLASS_TEACHER`| Section master attendance, general student remarks, report card generation. | All teacher rights + `attendance:section`, `reports:cards` |

### 2.2 Permission Checking Middleware Flow
```
Incoming HTTP Request
         |
         v
[verifyJwtToken] -------> Validates signature & expiry. Attaches `req.user`
         |
         v
[requirePermission('fees:collect')]
         |
         +---> If req.user.isSuperAdmin === true  ---> Grant Access
         |
         +---> If req.user.permissions includes 'fees:collect' ---> Grant Access
         |
         +---> Otherwise ---> Reject with 403 Forbidden ("FORBIDDEN")
```

---

## 3. Audit & Application Logging Architecture

A dual-tier logging strategy isolates technical troubleshooting from administrative auditability.

### 3.1 Tier 1: Technical Application Logs (Winston)
* **Audience:** Developers and DevOps.
* **Storage:** Console (colorized in dev) and rotating local files:
  * `logs/error.log`: Fatal errors, unhandled exceptions, and 5xx responses.
  * `logs/combined.log`: Request execution times, system startups, and warnings.
* **Format:** Structured JSON including `timestamp`, `level`, `message`, `correlationId`, `stack`.

### 3.2 Tier 2: Audit Logs (Database `audit_logs` Table)
* **Audience:** School management and administrative investigators.
* **Storage:** Relational table with immutable append-only records.
* **Captured Events:**
  1. **Authentication:** Successful logins, failed logins, password changes.
  2. **Student Lifecycle:** New admissions, promotions, transfer certificates.
  3. **Financials:** Fee structure creation, receipt generation, payment cancellations.
  4. **Academics:** Mark modifications, report card publications.
  5. **Security:** Role modifications, permission assignments.
* **Diff Tracking:** Records capture both `oldValues` and `newValues` JSON snapshots to provide an undeniable history of what changed, who changed it, and when.

---

## 4. API & Infrastructure Security Controls

1. **HTTP Security Headers:** `helmet` applies Content Security Policy (CSP), Strict Transport Security (HSTS), X-Content-Type-Options, and Frameguard (clickjacking prevention).
2. **CORS Restrictions:** Only whitelisted domains can communicate with `/api/v1`.
3. **Payload Sanitization:** `express.json({ limit: '2mb' })` defends against memory exhaustion attacks.
4. **Injection Immunity:** All database interactions utilize Prisma ORM parameterized queries, eliminating SQL injection vulnerabilities.
5. **No Leaked Secrets:** Environment variables are strictly kept in `.env` and excluded via `.gitignore`.
