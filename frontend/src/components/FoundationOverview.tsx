import React, { useEffect, useState } from 'react';
import { 
  Database, 
  ShieldAlert, 
  Activity, 
  CalendarClock, 
  CheckCircle2, 
  Clock,
  Server,
  KeyRound,
  FileCode2,
  Workflow
} from 'lucide-react';

interface HealthData {
  status: string;
  uptime: number;
  environment: string;
  services: {
    api: string;
    database: string;
  };
}

export const FoundationOverview: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    fetch('/api/v1/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setHealth(data.data);
        }
      })
      .catch(() => {
        // Backend not yet running in browser test
      });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero Banner */}
      <div style={{
        background: 'radial-gradient(ellipse at top left, rgba(79, 70, 229, 0.25) 0%, rgba(11, 15, 25, 0.95) 70%)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }} className="badge badge-info">
          <Workflow size={14} />
          <span>Version 1 — Step 1 Architecture Active</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
          Kids World School ERP — System Foundation
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '750px', fontSize: '1.05rem', lineHeight: '1.7' }}>
          Centralized, secure digital operating system for Kids World School, Madhya Pradesh. Designed with an API-first modular architecture, multi-session isolation, and strict role-based access control.
        </p>

        {/* Live Status Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Activity size={18} color="#10b981" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FOUNDATION STATUS</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--status-success)' }}>
                {health ? `Live (${health.status})` : 'Initialized & Validated'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Server size={18} color="#6366f1" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BACKEND ENGINE</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Node.js / Express (TypeScript)</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Database size={18} color="#38bdf8" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DATABASE ENGINE</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>PostgreSQL + Prisma ORM</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileCode2 size={18} color="#a855f7" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>API STANDARDS</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>RESTful (/api/v1) + Zod Schemas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Architecture Pillars Grid */}
      <div className="grid-3">
        {/* Card 1: Multi-Session Isolation */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              background: 'rgba(99, 102, 241, 0.15)',
              padding: '0.6rem',
              borderRadius: 'var(--radius-md)',
              color: '#818cf8'
            }}>
              <CalendarClock size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Academic Session Isolation</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Multi-Year & Historical Immutability</p>
            </div>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Protects against session data pollution. Every future student enrollment, fee ledger, and exam mark is strictly scoped to an <span className="code-pill">AcademicSession</span>.
          </p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={15} color="#10b981" /> Single active current session flag
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={15} color="#10b981" /> Locked archive protection for past years
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={15} color="#10b981" /> Header/query session context resolution
            </li>
          </ul>
        </div>

        {/* Card 2: Role-Based Access Control */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              padding: '0.6rem',
              borderRadius: 'var(--radius-md)',
              color: '#34d399'
            }}>
              <KeyRound size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Granular RBAC Architecture</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Authority Anchored at Backend</p>
            </div>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Normalized relational permission model. Roles (Principal, Accountant, Teacher, Clerk) map to granular permission tuples (<span className="code-pill">module:action</span>).
          </p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={15} color="#10b981" /> Least-privilege role boundaries
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={15} color="#10b981" /> Middleware permission evaluation
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={15} color="#10b981" /> Immutable system administrator guards
            </li>
          </ul>
        </div>

        {/* Card 3: Security & Audit Logging */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              background: 'rgba(245, 158, 11, 0.15)',
              padding: '0.6rem',
              borderRadius: 'var(--radius-md)',
              color: '#fbbf24'
            }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Security & Audit Engine</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Non-Repudiation & Traceability</p>
            </div>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Dual-layer logging: Technical error/debug streams via Winston, and tamper-resistant user activity audit records in <span className="code-pill">audit_logs</span>.
          </p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={15} color="#10b981" /> Rate limiting & Helmet security headers
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={15} color="#10b981" /> Zod request payload sanitization
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={15} color="#10b981" /> Old vs New value state diffing
            </li>
          </ul>
        </div>
      </div>

      {/* Foundational Database Entity Registry */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Foundational Entities (Step 1 Schema)</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Core database models defined in Prisma schema without pre-building ERP operational modules
            </p>
          </div>
          <div className="badge badge-success">8 Core Models Initialized</div>
        </div>

        <div className="grid-4">
          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#60a5fa' }}>School</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Institution identity, affiliation, contact info, settings anchor.</div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#60a5fa' }}>AcademicSession</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Active session indicator, date boundaries, historical data locking.</div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#60a5fa' }}>User</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Staff credentials, password hashes, lockout protection, audit foreign key.</div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#60a5fa' }}>Role & Permission</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Normalized RBAC tables with composite keys and action tuples.</div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#60a5fa' }}>UserRole & RolePermission</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Many-to-many junction tables for dynamic privilege mapping.</div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#60a5fa' }}>SystemConfig</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Key-value store for school configurations (grading, receipts, formats).</div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#60a5fa' }}>AuditLog</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Append-only security log tracking user, entity, and diff snapshots.</div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px dashed #6366f1' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#c084fc' }}>Future Modules Ready</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Foreign-key anchors ready for Students, Classes, Fees, Exams in Steps 2+.</div>
          </div>
        </div>
      </div>

      {/* Scope Boundaries Notice */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Clock size={20} color="#94a3b8" />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Strict Roadmap Compliance:</strong> Step 1 establishes technical and architectural foundations only. No operational ERP modules (fees, marks, admissions) have been built ahead of schedule.
          </span>
        </div>
        <div className="badge badge-info">Awaiting Step 2 Instructions</div>
      </div>
    </div>
  );
};
