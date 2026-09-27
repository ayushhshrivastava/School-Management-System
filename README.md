# Kids World School Management System (School ERP)
**Location:** Madhya Pradesh, India  
**System Type:** Internal Cloud-Based School ERP (Modular Monolith)  
**Current Phase:** Version 1 — Step 1: Project Foundation & System Architecture  

---

## Overview

This repository hosts the digital School Management System (School ERP) for **Kids World School**. It is architected to transition the school's historical paper-based records into a secure, high-integrity, cloud-accessible digital system.

The ERP is designed with an API-first approach, multi-session isolation, and granular role-based access control (RBAC). It will eventually connect to a public-facing school website in a later phase.

---

## Repository Structure

* `backend/`: Node.js (TypeScript) + Express API, Prisma ORM, Winston logging, and security middleware.
* `frontend/`: React + Vite (TypeScript) administrative single-page application foundation.
* `docs/`: In-depth architectural specifications and operational runbooks:
  * `docs/ARCHITECTURE.md`
  * `docs/DATABASE_FOUNDATION.md`
  * `docs/SECURITY_AND_AUDIT.md`
  * `docs/API_STANDARDS.md`
  * `docs/BACKUP_AND_RECOVERY.md`
  * `docs/PROJECT_FOUNDATION_SPECIFICATION.md`

---

## Quick Start (Step 1 Foundation)

### Backend
```bash
cd backend
npm install
npx prisma generate
npm test
npm run dev
```

The backend starts at `http://localhost:5000` with health check at `http://localhost:5000/api/v1/health`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend portal starts at `http://localhost:5173`.
