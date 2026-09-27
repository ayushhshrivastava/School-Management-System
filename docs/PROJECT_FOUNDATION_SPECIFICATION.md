# Kids World School ERP — Project Foundation Specification
**Version:** 1.0 (Step 0: Initialization)  
**Location:** Madhya Pradesh, India  
**Scope:** Internal School ERP (Pre-K to Primary, with expandable multi-section architecture)

---

## 1. Project Overview & Objectives
* **Mission:** Migrate paper registers and administrative workflows of Kids World School into a unified, secure, cloud-accessible digital platform.
* **Architecture Style:** API-First, Modular Monolith (or isolated service modules) with a centralized relational database.
* **Separation of Concerns:** Internal ERP built first; public-facing school website will interface later via dedicated, secure external API endpoints.

---

## 2. Institutional & Operational Blueprint

### 2.1 Academic Sessions & Historical Retention
* **Multi-Session Architecture:** Academic years are dynamic records (e.g., `2026–2027`), with a single active session toggle.
* **Data Immutability & History:** Student enrollments, attendance, fee ledgers, and exam report cards are strictly scoped by academic session. Promoting or graduating students retains historical snapshots without data loss.

### 2.2 Class & Section Hierarchy
* **Classes:** Nursery, LKG, UKG, Primary (Class 1 upwards, expandable).
* **Sections:** 1-to-many relationship (Every class has at least one section, e.g., "Nursery-A" or "Class 1-Rose").
* **Student Roster:** Students are assigned to a Class-Section within a specific Academic Year.

### 2.3 Evaluation & Grading Paradigm
* Flexible, schema-driven evaluation structure supporting:
  * Raw marks (e.g., 85/100)
  * Percentages
  * Letter grades (e.g., A+, A, B)
  * Qualitative performance remarks

---

## 3. User Roles & Access Control (RBAC)

The system establishes granular, permission-based access mapped to internal staff responsibilities:

| Role | Scope & Permissions |
| :--- | :--- |
| **Super Admin** | Full system control, role assignments, system configurations, audit logs, backup triggers. |
| **Principal / Admin** | Comprehensive view of academic, financial, attendance records; notices and reports. |
| **Accountant** | Fee structures, fee collection, dues tracking, payment receipts, financial logs (restricted from editing exam marks). |
| **Office / Admission Staff** | Student admission forms, parent contact updates, document uploads, transfer certificates. |
| **Teacher** | Attendance marking for assigned subjects, mark entry for exams, homework/class notices. |
| **Class Teacher** | All teacher capabilities + master daily attendance for their section, term remarks, student progress reports. |

*(Note: Parent and Student portals are strictly deferred to future versions).*

---

## 4. Recommended Technology Stack

Based on the requirements (cloud-accessible, relational integrity, audit trails, modularity, future public API support), the production stack is:

* **Database: PostgreSQL**
  * **Rationale:** Gold standard for transactional integrity (ACID), strict foreign-key relationships (crucial for fees and grades), JSONB support for configurable grade systems, and robust point-in-time recovery.
* **Backend API: Node.js with TypeScript & Express (or Fastify)**
  * **Rationale:** Clean REST API endpoints, strict type-safety across models, lightweight deployment, asynchronous I/O for file/import processing, and native compatibility with future web interfaces.
* **Frontend: React + Vite (TypeScript)**
  * **Rationale:** Fast, responsive single-page administrative application with component-level modularity and responsive layouts for desktop/tablet school administration.
* **Data Migration & Ingestion Engine:**
  * Background parsing utilities for Excel/CSV (`xlsx` / `csv-parser`) enabling smooth transition from digitized paper records into database tables with validation checks.
* **Security & Auditing:**
  * JWT auth with HTTP-only secure cookies.
  * Append-only `audit_logs` table tracking sensitive actions (fee collection, marks alteration, user edits).

---

## 5. V1 Module Roadmap & Phasing Plan

Each module will be built independently with distinct database models, services, and route boundaries:

1. **Step 1:** Environment, Repository Structure & Database Setup
2. **Step 2:** Authentication & RBAC Engine
3. **Step 3:** Master Configurations (Academic Years, Classes, Sections, Subjects)
4. **Step 4:** Student & Admission Management (with Parent/Guardian registry)
5. **Step 5:** Staff & Teacher Directory
6. **Step 6:** Daily Attendance Module (Student & Staff)
7. **Step 7:** Fee Management & Invoicing (Structures, Receipts, Outstanding Dues)
8. **Step 8:** Examination & Grading System (Assessment configuration, marks, report cards)
9. **Step 9:** Timetable & Class Schedules
10. **Step 10:** Communication, Notices & Circulars
11. **Step 11:** Reports, Analytics & Principal Dashboard
12. **Step 12:** Audit Logs, Data Backups & System Hardening
