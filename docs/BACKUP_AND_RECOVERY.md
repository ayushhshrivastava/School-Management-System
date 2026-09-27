# Kids World School ERP — Backup & Disaster Recovery Architecture
**Document Version:** 1.0 (Step 1 Foundation)  
**Database:** PostgreSQL 16+  
**Target:** Continuous Data Protection & Historical Retention  

---

## 1. Backup Strategy Overview

A school ERP contains irreplaceable legal, financial, and educational records. The backup strategy ensures high durability, zero accidental data loss, and point-in-time recovery.

---

## 2. Backup Tiers & Schedules

| Backup Type | Frequency | Tool / Mechanism | Storage Target |
| :--- | :--- | :--- | :--- |
| **Transaction Logs (WAL)** | Continuous / Hourly | PostgreSQL WAL Archiving | Encrypted Cloud Bucket / Secondary Drive |
| **Full Logical Dump** | Daily (2:00 AM IST) | `pg_dump -Fc` (Compressed binary) | Local Backup Directory + Remote Cloud Replica |
| **Session Archive Snapshot** | On Academic Year Closure | Full schema + data archive dump | Immutable Cold Storage |

---

## 3. Retention Policy

* **Daily Backups:** Retained for 14 days.
* **Weekly Backups (Sundays):** Retained for 8 weeks.
* **Monthly Backups:** Retained for 12 months.
* **End-of-Session Archives:** Retained indefinitely for historical audits and student transcript verification.

---

## 4. Disaster Recovery & Restoration Runbook

### 4.1 Creating a Manual Foundation Backup
```powershell
# From local machine with PostgreSQL installed
pg_dump -h localhost -U postgres -d kids_world_school_erp -F c -b -v -f "D:\Kids School\backups\kws_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump"
```

### 4.2 Restoring from Backup
```powershell
# Drop or recreate target database
dropdb -h localhost -U postgres kids_world_school_erp
createdb -h localhost -U postgres kids_world_school_erp

# Restore from compressed archive
pg_restore -h localhost -U postgres -d kids_world_school_erp -v "D:\Kids School\backups\kws_backup_target.dump"
```

### 4.3 Restoration Verification Testing
Every quarter, a scheduled automated restoration test restores the latest backup onto an isolated test instance and runs database integrity checks:
1. Verifies that all `School`, `AcademicSession`, and `User` records match source counts.
2. Runs foreign key constraint checks.
3. Tests student enrollment and fee ledger consistency.
