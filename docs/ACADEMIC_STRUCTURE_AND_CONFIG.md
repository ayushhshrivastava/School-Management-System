# Kids World School ERP — Academic Structure & Master Configuration Management (Step 3)

## 1. Overview & Architecture

**Step 3** establishes the foundational academic structure and centralized master configuration required before any operational ERP modules (Admissions, Attendance, Exams, Fees, Timetable) can function.

In school ERP systems, hardcoding academic structures or assuming single-year immutability causes architectural breakdown. The Kids World School ERP Step 3 architecture decouples **Master Definitions** (classes, sections, subjects) from **Session-Specific Instances** (`SessionClassSection`, `ClassSubject`), allowing academic structures, section counts, and subject allocations to evolve across academic years without breaking historical records.

```mermaid
erDiagram
    SCHOOL ||--o{ ACADEMIC_SESSION : operates
    SCHOOL ||--o{ CLASS : defines
    SCHOOL ||--o{ SUBJECT : defines
    SCHOOL ||--o{ SYSTEM_CONFIG : configures
    CLASS ||--o{ SECTION : contains
    ACADEMIC_SESSION ||--o{ SESSION_CLASS_SECTION : activates
    CLASS ||--o{ SESSION_CLASS_SECTION : instances
    SECTION ||--o{ SESSION_CLASS_SECTION : instances
    CLASS ||--o{ CLASS_SUBJECT : offers
    SUBJECT ||--o{ CLASS_SUBJECT : maps
    ACADEMIC_SESSION ||--o{ CLASS_SUBJECT : assigns
```

---

## 2. Core Entities & Database Schema

### 2.1 Academic Sessions (`academic_sessions`)
Represents multi-year academic calendars (e.g. `2025-2026`, `2026-2027`).
- **Fields**: `id`, `schoolId`, `name`, `code`, `startDate`, `endDate`, `isCurrent`, `isLocked`, `description`, `createdAt`, `updatedAt`.
- **Single-Current Rule**: Exactly one session is marked `isCurrent = true` at any time. Activating another automatically deactivates the prior current session in an atomic database transaction.
- **Date Validation**: Enforces `startDate < endDate`.
- **Locked/Archived Protection**: Once `isLocked = true`, all mutations to sessions, classes, sections, and class-subject mappings are rejected (HTTP 423 Locked).

### 2.2 Class Master (`classes`)
Global grades/classes offered by the school (e.g. Nursery, LKG, UKG, Class 1 to Class 12).
- **Fields**: `id`, `schoolId`, `name`, `code`, `displayOrder`, `isActive`, `description`, `createdAt`, `updatedAt`.
- **Soft Deactivation**: Classes cannot be deleted if active or historical references exist; instead they are deactivated (`isActive = false`).
- **Uniqueness**: `[schoolId, code]` and `[schoolId, name]` are strictly unique.

### 2.3 Section Master (`sections`)
Sections under a specific class (e.g. Class 1 → A, Class 1 → B, Class 10 → A).
- **Fields**: `id`, `classId`, `name`, `code`, `capacity`, `displayOrder`, `isActive`, `createdAt`, `updatedAt`.
- **Intra-Class Uniqueness**: `[classId, code]` and `[classId, name]` are unique. Sections with the same name (e.g. 'A') can exist under different classes.
- **Session Auto-Registration**: Creating a section under an active class automatically provisions it into the active academic session via `SessionClassSection`.

### 2.4 Session-Class-Section (`session_class_sections`)
The junction entity bridging academic sessions with classes and sections.
- **Fields**: `id`, `sessionId`, `classId`, `sectionId`, `capacity`, `isActive`, `roomNumber`.
- **Purpose**: Enables future modules (Step 4 Admissions, Enrollment, Attendance, Timetable) to reference exact session-specific class-sections.

### 2.5 Subject Master (`subjects`)
Curricular and co-curricular subjects (e.g. English, Hindi, Mathematics, Science, Physical Education).
- **Fields**: `id`, `schoolId`, `name`, `code`, `type`, `displayOrder`, `isActive`, `description`.
- **Modality (`SubjectType`)**: `THEORY`, `PRACTICAL`, `BOTH`, `CO_CURRICULAR`.
- **Uniqueness**: `[schoolId, code]` is strictly unique.

### 2.6 Class-Subject Mapping (`class_subjects`)
Associates subjects with classes for an academic session.
- **Fields**: `id`, `classId`, `subjectId`, `sessionId`, `isCompulsory`, `weeklyPeriods`, `maxTheoryMarks`, `maxPracticalMarks`, `displayOrder`, `isActive`.
- **Core vs Elective**: Differentiates compulsory subjects from elective options.
- **Uniqueness**: `[classId, subjectId, sessionId]` ensures a subject is mapped only once per class per session.

### 2.7 System Configuration (`system_configs`)
Centralized institutional configuration avoiding code hardcoding.
- **Fields**: `id`, `schoolId`, `category`, `key`, `value`, `dataType`, `description`, `isPublic`.
- **Data Types**: `STRING`, `NUMBER`, `BOOLEAN`, `JSON`.
- **Categories**: `general`, `academic`, `fees`, `grading`.

---

## 3. REST API Reference

All endpoints are prefixed with `/api/v1` and protected by authentication and RBAC permissions.

### 3.1 Academic Sessions (`/api/v1/academics/sessions`)
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/` | `academic_sessions:view` | List all sessions |
| `GET` | `/current` | Authenticated | Retrieve currently active session |
| `GET` | `/:id` | `academic_sessions:view` | Retrieve single session details |
| `POST` | `/` | `academic_sessions:create` | Create a new academic session |
| `PUT` | `/:id` | `academic_sessions:update` | Update academic session |
| `POST` | `/:id/activate` | `academic_sessions:activate` | Set session as current |
| `POST` | `/:id/lock` | `academic_sessions:lock` | Lock/archive academic session |

### 3.2 Classes (`/api/v1/academics/classes`)
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/` | `classes:view` | List classes (with sections) |
| `GET` | `/:id` | `classes:view` | Retrieve single class |
| `POST` | `/` | `classes:create` | Create new class |
| `PUT` | `/:id` | `classes:update` | Update class details |
| `PATCH` | `/:id/status` | `classes:update` | Activate or deactivate class |

### 3.3 Sections (`/api/v1/academics/sections`)
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/` | `sections:view` | List sections (filterable by `classId`) |
| `GET` | `/:id` | `sections:view` | Retrieve single section |
| `POST` | `/` | `sections:create` | Create new section |
| `PUT` | `/:id` | `sections:update` | Update section details |
| `PATCH` | `/:id/status` | `sections:update` | Activate or deactivate section |

### 3.4 Subjects (`/api/v1/academics/subjects`)
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/` | `subjects:view` | List subjects catalog |
| `GET` | `/:id` | `subjects:view` | Retrieve single subject |
| `POST` | `/` | `subjects:create` | Create new subject |
| `PUT` | `/:id` | `subjects:update` | Update subject details |
| `PATCH` | `/:id/status` | `subjects:update` | Activate or deactivate subject |

### 3.5 Class-Subject Mapping (`/api/v1/academics/class-subjects`)
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/` | `class_subjects:view` | List mappings (filterable by `classId` & `sessionId`) |
| `GET` | `/:id` | `class_subjects:view` | Retrieve single mapping |
| `POST` | `/` | `class_subjects:create` | Map subject to class |
| `PUT` | `/:id` | `class_subjects:update` | Update mapping parameters |
| `DELETE` | `/:id` | `class_subjects:delete` | Remove or deactivate mapping |

### 3.6 System Configuration (`/api/v1/config`)
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/` | `system:config:view` | List all configurations |
| `GET` | `/public` | Public / None | Retrieve public configs (e.g. school name) |
| `GET` | `/:key` | `system:config:view` | Get specific configuration value |
| `PUT` | `/:key` | `system:config:edit` | Update configuration value |
| `POST` | `/` | `system:config:edit` | Create new configuration key |

---

## 4. RBAC Permissions Matrix

The following granular permissions govern Step 3 capabilities:

| Permission | Description | Roles Assigned |
|---|---|---|
| `academic_sessions:view` | View academic session calendars | SUPER_ADMIN, PRINCIPAL, ACCOUNTANT, OFFICE_STAFF, TEACHER, CLASS_TEACHER |
| `academic_sessions:create` | Create new academic years | SUPER_ADMIN, PRINCIPAL |
| `academic_sessions:update` | Edit session details | SUPER_ADMIN, PRINCIPAL |
| `academic_sessions:activate` | Set the active current session | SUPER_ADMIN, PRINCIPAL |
| `academic_sessions:lock` | Lock/archive completed sessions | SUPER_ADMIN, PRINCIPAL |
| `classes:view` | View classes and grades | SUPER_ADMIN, PRINCIPAL, ACCOUNTANT, OFFICE_STAFF, TEACHER, CLASS_TEACHER |
| `classes:create` | Add new classes | SUPER_ADMIN, PRINCIPAL |
| `classes:update` | Edit classes & toggle status | SUPER_ADMIN, PRINCIPAL |
| `sections:view` | View sections under classes | SUPER_ADMIN, PRINCIPAL, ACCOUNTANT, OFFICE_STAFF, TEACHER, CLASS_TEACHER |
| `sections:create` | Create new sections | SUPER_ADMIN, PRINCIPAL |
| `sections:update` | Edit sections & toggle status | SUPER_ADMIN, PRINCIPAL |
| `subjects:view` | View subject catalog | SUPER_ADMIN, PRINCIPAL, ACCOUNTANT, OFFICE_STAFF, TEACHER, CLASS_TEACHER |
| `subjects:create` | Add new subjects | SUPER_ADMIN, PRINCIPAL |
| `subjects:update` | Edit subjects & toggle status | SUPER_ADMIN, PRINCIPAL |
| `class_subjects:view` | View curriculum subject mappings | SUPER_ADMIN, PRINCIPAL, ACCOUNTANT, OFFICE_STAFF, TEACHER, CLASS_TEACHER |
| `class_subjects:create` | Map subjects to classes | SUPER_ADMIN, PRINCIPAL |
| `class_subjects:update` | Update credit hours/marks | SUPER_ADMIN, PRINCIPAL |
| `class_subjects:delete` | Remove subject mapping | SUPER_ADMIN, PRINCIPAL |
| `system:config:view` | View system configuration settings | SUPER_ADMIN, PRINCIPAL |
| `system:config:edit` | Edit institutional system configuration | SUPER_ADMIN |

---

## 5. Audit Logging Architecture

Every mutation to academic master records triggers an immutable entry in `audit_logs`:

| Action | Entity | Captured Metadata |
|---|---|---|
| `SESSION_CREATED` | `AcademicSession` | Name, code, start/end dates |
| `SESSION_UPDATED` | `AcademicSession` | Modified fields, prior values |
| `SESSION_ACTIVATED` | `AcademicSession` | Previously active session ID, new active session ID |
| `SESSION_LOCKED` | `AcademicSession` | Session code, locked timestamp |
| `CLASS_CREATED` | `Class` | Class name, code, display order |
| `CLASS_UPDATED` | `Class` | Updated attributes |
| `CLASS_STATUS_CHANGED` | `Class` | `isActive` state transition |
| `SECTION_CREATED` | `Section` | Class ID, section name, capacity |
| `SECTION_UPDATED` | `Section` | Modified fields |
| `SECTION_STATUS_CHANGED` | `Section` | `isActive` state transition |
| `SUBJECT_CREATED` | `Subject` | Subject name, code, type |
| `SUBJECT_UPDATED` | `Subject` | Modified fields |
| `SUBJECT_STATUS_CHANGED` | `Subject` | `isActive` state transition |
| `CLASS_SUBJECT_MAPPED` | `ClassSubject` | Class ID, subject ID, session ID, compulsory flag |
| `CLASS_SUBJECT_UPDATED` | `ClassSubject` | Updated periods/marks |
| `CLASS_SUBJECT_REMOVED` | `ClassSubject` | Deactivated or deleted mapping ID |
| `CONFIG_UPDATED` | `SystemConfig` | Key, old value, new value |

---

## 6. Future ERP Module Integration Guidelines

Step 3 master data provides the foundational relational references required by future modules:

1. **Step 4: Student Admissions & Enrollment**:
   - Enrollment records MUST link to `SessionClassSection` rather than raw `Class` or `Section`, ensuring accurate historical cohort tracking.
2. **Attendance Module**:
   - Daily and period attendance MUST reference `sessionClassSectionId` to ensure attendance data belongs to the correct academic calendar year.
3. **Examination & Marks Module**:
   - Exam schedules and grade books MUST link to `ClassSubject` for the relevant academic session, respecting `maxTheoryMarks`, `maxPracticalMarks`, and `isCompulsory` flags.
4. **Fees Module**:
   - Fee structures can be defined per `Class` and per `AcademicSession` without duplicating student records.
5. **Timetable Module**:
   - Weekly schedules will resolve teacher allocations to `SessionClassSection` and `ClassSubject`.
