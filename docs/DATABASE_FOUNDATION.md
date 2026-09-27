# Kids World School ERP — Database Foundation & Entity Blueprint
**Document Version:** 1.0 (Step 1 Foundation)  
**Database Engine:** PostgreSQL 16+  
**ORM / Migration Tool:** Prisma ORM  

---

## 1. Overview & Foundational Objectives

The database architecture is designed with high relational rigor (ACID transactions, foreign key cascades, and check constraints) to ensure data integrity across decades of school operations.

### Foundational Principles
1. **Multi-Session Isolation:** Student enrollment, attendance, financial ledgers (fees), and examination marks are strictly partitioned by academic session.
2. **Normalized Role-Based Access Control:** Users possess one or more roles; roles possess granular permissions defined as `<module>:<action>`.
3. **Audit Trail by Design:** All critical entity mutations (fee collections, mark changes, logins) record snapshots of old and new states in an append-only audit table.
4. **Tenant Anchor:** Every core record references the primary `School` entity to support future multi-campus or isolated deployments without schema refactoring.

---

## 2. Foundational Entity Specifications

### 2.1 Entity: `School` (`schools`)
* **Purpose:** Represents the physical institution (Kids World School, Madhya Pradesh) and serves as the root foreign-key anchor for all configuration and operational data.
* **Fields:**
  * `id`: String (UUID, Primary Key)
  * `code`: String (Unique, e.g., `"KWS-MP"`)
  * `name`: String (Default: `"Kids World School"`)
  * `affiliationNumber`: String (Nullable)
  * `board`: String (Nullable, e.g., `"State Board"`)
  * `address`: String (Street / locality)
  * `city`: String (Default: `"Madhya Pradesh"`)
  * `state`: String (Default: `"Madhya Pradesh"`)
  * `country`: String (Default: `"India"`)
  * `postalCode`: String (Nullable)
  * `phone`: String (Official school phone number)
  * `email`: String (Official school email)
  * `website`: String (Nullable)
  * `logoUrl`: String (Nullable)
  * `createdAt`: Timestamp (Default: `now()`)
  * `updatedAt`: Timestamp (Automatic update)
* **Indexes:** Unique index on `code`.

---

### 2.2 Entity: `AcademicSession` (`academic_sessions`)
* **Purpose:** Manages school academic years (e.g., April 2026 – March 2027). Acts as the primary partition key for historical records.
* **Fields:**
  * `id`: String (UUID, Primary Key)
  * `schoolId`: String (Foreign Key $\rightarrow$ `schools.id`, ON DELETE CASCADE)
  * `name`: String (e.g., `"2026-2027"`)
  * `code`: String (e.g., `"AY-2026-27"`)
  * `startDate`: Date/Timestamp
  * `endDate`: Date/Timestamp
  * `isCurrent`: Boolean (Default: `false`, marks the currently operational session)
  * `isLocked`: Boolean (Default: `false`, prevents mutations to closed academic years)
  * `description`: String (Nullable)
  * `createdAt`: Timestamp (Default: `now()`)
  * `updatedAt`: Timestamp (Automatic update)
* **Constraints:**
  * `UNIQUE(schoolId, code)`
  * `UNIQUE(schoolId, name)`
* **Indexes:**
  * Index on `[schoolId, isCurrent]` for fast active-session resolution.

---

### 2.3 Entity: `User` (`users`)
* **Purpose:** Represents authenticated internal staff members (Principals, Accountants, Teachers, Clerks).
* **Fields:**
  * `id`: String (UUID, Primary Key)
  * `schoolId`: String (Foreign Key $\rightarrow$ `schools.id`, ON DELETE CASCADE)
  * `username`: String (Unique, alphanumeric handle)
  * `email`: String (Unique, for communications and password reset)
  * `passwordHash`: String (Bcrypt salted hash with work factor 12)
  * `fullName`: String (Staff member's legal full name)
  * `phone`: String (Nullable, contact number)
  * `isActive`: Boolean (Default: `true`, instant account disablement)
  * `isSuperAdmin`: Boolean (Default: `false`, bypass flag for root setup)
  * `lastLoginAt`: Timestamp (Nullable)
  * `passwordChangedAt`: Timestamp (Nullable)
  * `failedLoginAttempts`: Integer (Default: `0`, for brute-force lockouts)
  * `lockedUntil`: Timestamp (Nullable)
  * `createdAt`: Timestamp (Default: `now()`)
  * `updatedAt`: Timestamp (Automatic update)
* **Indexes:**
  * Index on `[schoolId, isActive]`
  * Unique indexes on `username` and `email`.

---

### 2.4 RBAC Entities: `Role`, `Permission`, `RolePermission`, `UserRole`
* **Purpose:** Full relational permission system adhering to least privilege.
* **Tables:**
  1. `roles`:
     * `id`: String (UUID, PK)
     * `code`: String (Unique, e.g. `"SUPER_ADMIN"`, `"PRINCIPAL"`, `"ACCOUNTANT"`, `"TEACHER"`)
     * `name`: String (Human-readable name)
     * `description`: String (Nullable)
     * `isSystem`: Boolean (Default: `true`; prevents deletion of critical operational roles)
  2. `permissions`:
     * `id`: String (UUID, PK)
     * `code`: String (Unique, e.g. `"students:read"`, `"fees:collect"`, `"marks:update"`)
     * `module`: String (e.g. `"students"`, `"fees"`, `"attendance"`, `"exams"`)
     * `action`: String (e.g. `"create"`, `"read"`, `"update"`, `"delete"`, `"approve"`)
     * `description`: String (Nullable)
  3. `role_permissions`:
     * Junction table: `roleId`, `permissionId`, `createdAt`
     * Constraint: `UNIQUE(roleId, permissionId)`
  4. `user_roles`:
     * Junction table: `userId`, `roleId`, `assignedAt`, `assignedBy`
     * Constraint: `UNIQUE(userId, roleId)`

---

### 2.5 Entity: `SystemConfig` (`system_configs`)
* **Purpose:** Key-value repository for school-level preferences, eliminating hardcoded rules.
* **Fields:**
  * `id`: String (UUID, Primary Key)
  * `schoolId`: String (Foreign Key $\rightarrow$ `schools.id`, ON DELETE CASCADE)
  * `category`: String (e.g. `"general"`, `"academic"`, `"fees"`, `"grading"`, `"security"`)
  * `key`: String (e.g. `"receipt_number_prefix"`, `"default_due_days"`, `"grading_scale"`)
  * `value`: String (Scalar string or serialized JSON)
  * `dataType`: String (Default: `"string"`, options: `"string"`, `"number"`, `"boolean"`, `"json"`)
  * `isPublic`: Boolean (Default: `false`; flags settings safe for public website consumption)
  * `description`: String (Nullable)
  * `updatedAt`: Timestamp
* **Constraint:** `UNIQUE(schoolId, category, key)`

---

### 2.6 Entity: `AuditLog` (`audit_logs`)
* **Purpose:** Tamper-resistant trail of security events and data modifications.
* **Fields:**
  * `id`: String (UUID, Primary Key)
  * `schoolId`: String (Foreign Key $\rightarrow$ `schools.id`)
  * `userId`: String (Nullable Foreign Key $\rightarrow$ `users.id`, ON DELETE SET NULL)
  * `action`: String (e.g. `"LOGIN"`, `"STUDENT_CREATED"`, `"FEE_COLLECTED"`, `"MARKS_SAVED"`)
  * `module`: String (e.g. `"AUTH"`, `"ADMISSIONS"`, `"FEES"`, `"EXAMS"`)
  * `entityType`: String (Nullable, e.g. `"Student"`, `"FeePayment"`)
  * `entityId`: String (Nullable, UUID of the modified record)
  * `oldValues`: Text (JSON string capturing pre-mutation snapshot)
  * `newValues`: Text (JSON string capturing post-mutation snapshot)
  * `ipAddress`: String (Nullable)
  * `userAgent`: String (Nullable)
  * `status`: String (Default: `"SUCCESS"`, options: `"SUCCESS"`, `"FAILED"`, `"WARNING"`)
  * `details`: String (Nullable)
  * `createdAt`: Timestamp (Default: `now()`)
* **Indexes:**
  * Index on `[schoolId, module, action]`
  * Index on `userId`
  * Index on `createdAt` (for time-range audit reports)

---

## 3. Academic Session Architecture & Query Scoping

```
                                [AcademicSession]
                                   (2026-2027)
                                        |
               +------------------------+------------------------+
               |                        |                        |
               v                        v                        v
      [StudentEnrollment]        [FeeInvoices]            [ExamSchedules]
      - Student ID               - Student ID             - Subject ID
      - Class/Section ID         - Due Date               - Max Marks
      - Roll Number              - Amount Collected       - Passing Marks
               |                        |                        |
               v                        v                        v
      [DailyAttendance]          [FeePayments]            [StudentMarks]
      - Date                     - Receipt No             - Marks Obtained
      - Status (P/A/L)           - Mode (Cash/UPI)        - Grade & Remarks
```

### Prevention of Session Cross-Contamination
1. **The Active Session Resolver:** The application identifies the working session from the `x-academic-session-id` header or the database record where `isCurrent = true`.
2. **Session Guard Middleware:** State-changing requests (`POST`, `PUT`, `DELETE`) inspect `isLocked`. If a user attempts to edit attendance or fees in an archived year, the server halts the operation with `423 SessionLockedError`.
3. **Session Promotion (Step 4+):** Moving a student to the next grade generates a new `StudentEnrollment` record in the target `AcademicSession`, preserving the old year's attendance, fees, and report cards permanently.

---

## 4. Integration Hooks for Future ERP Modules

| Module (Future Step) | Primary Entity | Connecting Foreign Keys to Foundation |
| :--- | :--- | :--- |
| **Step 3: Classes & Sections** | `Class`, `Section` | References `School` |
| **Step 4: Admissions & Students** | `Student`, `Guardian` | References `School`; Enrolled via `StudentEnrollment` $\rightarrow$ `AcademicSession` + `ClassSection` |
| **Step 5: Staff Management** | `Staff` | References `School` and optionally links 1:1 to `User` |
| **Step 6: Attendance** | `AttendanceRecord` | References `StudentEnrollment` + `AcademicSession` |
| **Step 7: Fees & Billing** | `FeeStructure`, `FeeInvoice` | References `AcademicSession` + `Class` + `StudentEnrollment` |
| **Step 8: Examinations** | `Exam`, `StudentMark` | References `AcademicSession` + `ClassSection` + `StudentEnrollment` |
