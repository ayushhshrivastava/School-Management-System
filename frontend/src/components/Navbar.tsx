import React from 'react';
import { School, ShieldCheck, Database, Calendar } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(17, 24, 39, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0.85rem 2rem'
    }}>
      <div style={{
        maxWidth: '1300px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo & School Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{
            background: 'var(--accent-gradient)',
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <School size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
              Kids World School
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Madhya Pradesh, India • Management ERP
            </div>
          </div>
        </div>

        {/* System Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--bg-surface)',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem'
          }}>
            <Calendar size={14} color="#6366f1" />
            <span style={{ color: 'var(--text-secondary)' }}>Session:</span>
            <span style={{ fontWeight: 600 }}>2026–2027</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--bg-surface)',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem'
          }}>
            <Database size={14} color="#10b981" />
            <span style={{ color: 'var(--text-secondary)' }}>DB:</span>
            <span style={{ fontWeight: 600, color: 'var(--status-success)' }}>PostgreSQL</span>
          </div>

          <div className="badge badge-success">
            <ShieldCheck size={13} />
            <span>Step 1 Initialized</span>
          </div>
        </div>
      </div>
    </header>
  );
};
