# Kids World School ERP — System Architecture & Technical Foundation
**Document Version:** 1.0 (Step 1 Foundation)  
**Target Institution:** Kids World School (Madhya Pradesh, India)  
**Status:** Approved & Implemented Foundation

---

## 1. Executive Summary & Architectural Vision

Kids World School is transitioning its complete administrative and educational workflows from manual/paper-based registers into a high-reliability, cloud-accessible digital School Management System (School ERP).

The architectural design prioritizes:
1. **Modularity:** Core systems (Admissions, Fees, Attendance, Academics) operate in discrete domain modules with clean boundaries.
2. **Session Isolation:** Academic years are partitioned dynamically so promoting cohorts or closing books in historical years leaves archived data intact.
3. **API-Ready Decoupling:** The backend functions as an autonomous REST API, ready to power both the internal management UI and a future public-facing school website.
4. **Defense-in-Depth:** Security is anchored at the database and API middleware layers, enforcing role-based permissions, rate limiting, audit logging, and payload validation.

---

## 2. High-Level System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT APPLICATIONS                               |
|                                                                                   |
|   +------------------------------------+   +----------------------------------+   |
|   | Internal ERP Portal (React + Vite) |   | Future Public School Website     |   |
|   | (Admins, Accountants, Teachers)    |   | (Prospective parents, notices)   |   |
|   +-----------------+------------------+   +-----------------+----------------+   |
+---------------------|----------------------------------------|--------------------+
                      | HTTPS / JSON                           | HTTPS / JSON
                      v                                        v
+-----------------------------------------------------------------------------------+
|                         REVERSE PROXY / SECURITY BOUNDARY                         |
|   - SSL / TLS Termination                                                         |
|   - Rate Limiting (express-rate-limit)                                            |
|   - Security Headers (Helmet CSP, HSTS, XSS Protection)                           |
|   - CORS Validation (Whitelist Authorized Origins)                                |
+-----------------------------------------------------------------------------------+
                      |
                      v
+-----------------------------------------------------------------------------------+
|                            CORE BACKEND (Node.js + Express)                       |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Request Lifecycle & Context Middleware Stack                                 |  |
|  | [Correlation ID] -> [Winston Logger] -> [Session Context] -> [Auth & RBAC] |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Modular Domain Controllers & Services (Mounted at /api/v1)                  |  |
|  |                                                                             |  |
|  | +-------------+ +-------------+ +-------------+ +-------------+ +---------+ |  |
|  | | System/Info | | Auth & RBAC | | Sessions    | | Config      | | Audit   | |  |
|  | | (Step 1)    | | (Step 2)    | | (Step 3)    | | (Step 3)    | | (Step 1)| |  |
|  | +-------------+ +-------------+ +-------------+ +-------------+ +---------+ |  |
|  |                                                                             |  |
|  | (Future Modules: Admissions, Students, Staff, Attendance, Fees, Exams)     |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Centralized Error Handling & Response Normalizer                             |  |
|  | Converts AppError, ZodError, Prisma exceptions into standardized JSON       |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                      |
                      v
+-----------------------------------------------------------------------------------+
|                               PERSISTENCE & STORAGE                               |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | PostgreSQL Relational Database (via Prisma ORM)                             |  |
|  | - Core Tables: schools, academic_sessions, users, roles, permissions,       |  |
|  |   user_roles, role_permissions, system_configs, audit_logs                  |  |
|  | - Strict Foreign Keys, Unique Constraints & ACID Transactions               |  |
|  +-----------------------------------------------------------------------------+  |
|  | File / Attachment Storage (Local disk or S3/Cloud Storage for future docs)  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Technology Stack & Rationale

| Layer | Technology | Rationale & Responsibility |
| :--- | :--- | :--- |
| **Backend Engine** | **Node.js (TypeScript) + Express** | High concurrency, lightweight asynchronous runtime, rich ecosystem for file parsing (Excel/CSV), and strict end-to-end type safety. |
| **Database** | **PostgreSQL (v16+)** | Enterprise ACID reliability for financial ledgers (fees) and academic records (grades), relational integrity, JSONB support for dynamic grade scales. |
| **Data Access / ORM** | **Prisma ORM** | Declarative schema definition, automated type-safe client generation, reliable database migrations, and prevention of SQL injection. |
| **Frontend Platform** | **React + Vite (TypeScript)** | Extremely fast development and production build pipeline, responsive UI component architecture for desktop and tablet school management. |
| **Validation Layer** | **Zod** | Runtime schema validation for incoming request bodies, query parameters, and environment configurations. |
| **Logging** | **Winston** | Production-ready structured logging with level management (debug, info, warn, error), console colorization, and rotating file persistence. |
| **Security Layer** | **Helmet, CORS, bcrypt, express-rate-limit** | Industry-standard defense against XSS, clickjacking, MIME sniffing, brute-force denial-of-service, and credential attacks. |
| **Testing** | **Vitest + Supertest** | Blazing-fast unit and HTTP integration testing against Express endpoints. |

---

## 4. Complete Project Directory Layout

```
School Management System/
├── .gitignore                      # Git ignore rules for node_modules, .env, logs, build artifacts
├── README.md                       # Project overview and setup instructions
├── docs/                           # Architecture, database, security, and API documentation
│   ├── ARCHITECTURE.md             # This document
│   ├── DATABASE_FOUNDATION.md      # Foundational schema specifications & entity diagrams
│   ├── SECURITY_AND_AUDIT.md       # Security controls, RBAC, audit log specification
│   ├── API_STANDARDS.md            # HTTP status codes, error models, and pagination standards
│   └── PROJECT_FOUNDATION_SPECIFICATION.md
├── backend/                        # Node.js + Express + TypeScript Backend
│   ├── package.json                # Dependencies and npm run scripts
│   ├── tsconfig.json               # TypeScript compiler configuration
│   ├── .env.example                # Environment variable blueprint
│   ├── .env                        # Local development environment configuration
│   ├── prisma/
│   │   └── schema.prisma           # Foundational database schema & relationship definitions
│   ├── logs/                       # Rotating application error and combined logs
│   ├── src/
│   │   ├── config/
│   │   │   └── index.ts            # Zod-validated environment configuration loader
│   │   ├── core/
│   │   │   ├── audit/
│   │   │   │   └── auditLogger.ts  # Standardized audit persistence helper
│   │   │   ├── database/
│   │   │   │   └── prisma.ts       # Singleton PrismaClient connection wrapper
│   │   │   ├── errors/
│   │   │   │   └── AppError.ts     # Standardized operational error hierarchy
│   │   │   ├── logger/
│   │   │   │   └── logger.ts       # Structured Winston logger configuration
│   │   │   └── middleware/
│   │   │       ├── errorHandler.ts # Global Express error handling middleware
│   │   │       ├── rateLimiter.ts  # Express rate limiter configuration
│   │   │       ├── requestLogger.ts# HTTP request access logger with correlation ID
│   │   │       └── sessionContext.ts # Academic session extraction and lock guard
│   │   ├── modules/
│   │   │   └── system/             # Step 1 Foundational Module
│   │   │       ├── system.controller.ts # Health check and system info handlers
│   │   │       └── system.routes.ts     # Route definitions (/health, /system/info)
│   │   │   # Future Step Modules:
│   │   │   # ├── auth/             # (Step 2: Login, Password Reset, RBAC middleware)
│   │   │   # ├── academic-session/ # (Step 3: Session management & Year toggle)
│   │   │   # ├── classes/          # (Step 3: Classes & Sections)
│   │   │   # ├── students/         # (Step 4: Admission, Student profiles, Guardian registry)
│   │   │   # ├── staff/            # (Step 5: Staff/Teacher directory)
│   │   │   # ├── attendance/       # (Step 6: Daily student & staff attendance)
│   │   │   # ├── fees/             # (Step 7: Invoicing, Receipts, Defaulters)
│   │   │   # └── exams/            # (Step 8: Assessment, Marks, Report cards)
│   │   ├── types/
│   │   │   └── index.ts            # Global TypeScript types (ApiResponse, SessionContext, etc.)
│   │   ├── app.ts                  # Express application factory and middleware assembler
│   │   └── server.ts               # HTTP server bootstrap with graceful shutdown
│   └── tests/
│       └── system.test.ts          # Step 1 foundation API tests
└── frontend/                       # React + Vite + TypeScript Frontend
    ├── package.json                # Frontend dependencies
    ├── vite.config.ts              # Vite configuration with API proxy
    ├── tsconfig.json               # Frontend TypeScript configuration
    ├── index.html                  # HTML entry point with modern typography
    └── src/
        ├── App.tsx                 # Root application shell
        ├── main.tsx                # React DOM mount point
        ├── components/
        │   ├── Navbar.tsx          # ERP top navigation with session and status chips
        │   └── FoundationOverview.tsx # Visual dashboard of Step 1 architecture & entities
        └── styles/
            └── index.css           # Curated design system tokens and responsive styles
```

---

## 5. Scalability & Maintainability Design

1. **Independent Module Boundaries:** Each ERP feature (e.g. Fees, Exams) resides in its own isolated subfolder under `backend/src/modules/` containing its routes, controller, service, validation schemas, and DTOs.
2. **Stateless Backend:** Authentication and session information reside in signed tokens (JWT) or are resolved from the database on a per-request basis. This allows horizontal scaling across multiple container instances behind a load balancer without sticky sessions.
3. **Database Indexing:** All foreign keys and query lookups (e.g., `[schoolId, isCurrent]`, `[schoolId, module, action]`) are indexed from Day 1 to ensure sub-millisecond query performance as student rosters grow over decades.
4. **Standardized Response Envelopes:** All endpoints adhere strictly to the `{ success, message, data, meta, timestamp }` format, ensuring frontend components and mobile apps never break due to unexpected response shapes.
