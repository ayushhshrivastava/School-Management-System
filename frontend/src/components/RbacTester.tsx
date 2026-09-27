import React, { useState } from 'react';
import { KeyRound, Play, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const RbacTester: React.FC = () => {
  const { user, token } = useAuth();
  const [testResult, setTestResult] = useState<{
    endpoint: string;
    status: number;
    message: string;
    success: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const testEndpoint = async (url: string, name: string) => {
    setLoading(true);
    setTestResult(null);

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setTestResult({
        endpoint: name,
        status: res.status,
        message: data.message || JSON.stringify(data),
        success: res.ok,
      });
    } catch (err: any) {
      setTestResult({
        endpoint: name,
        status: 500,
        message: err.message,
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            background: 'rgba(99, 102, 241, 0.15)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)',
            color: '#818cf8'
          }}>
            <KeyRound size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Live RBAC & Authorization Sandbox</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Test server-side authorization enforcement against your current credentials
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className="badge badge-info">Active User: {user.username}</span>
          <span className="badge badge-success">{user.roles.join(', ')}</span>
        </div>
      </div>

      {/* Permissions Breakdown */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          Effective Permissions ({user.permissions.length} total granted):
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '120px', overflowY: 'auto', padding: '0.5rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          {user.permissions.map((p) => (
            <span key={p} className="code-pill" style={{ fontSize: '0.75rem' }}>
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Live Test Actions */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button
          onClick={() => testEndpoint('/api/v1/auth/test-permission', 'Permission Guard (students:view)')}
          disabled={loading}
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.6rem 1rem',
            color: '#38bdf8',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Play size={14} />
          <span>Test `requirePermission('students:view')`</span>
        </button>

        <button
          onClick={() => testEndpoint('/api/v1/auth/test-role', 'Role Guard (ACCOUNTANT / SUPER_ADMIN)')}
          disabled={loading}
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.6rem 1rem',
            color: '#fbbf24',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Play size={14} />
          <span>Test `requireRole('ACCOUNTANT', 'SUPER_ADMIN')`</span>
        </button>
      </div>

      {/* Live Server Response Display */}
      {testResult && (
        <div style={{
          background: testResult.success ? 'var(--status-success-bg)' : 'var(--status-error-bg)',
          border: `1px solid ${testResult.success ? 'var(--status-success)' : 'var(--status-error)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.15rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
        }}>
          {testResult.success ? (
            <CheckCircle2 size={20} color="var(--status-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
          ) : (
            <XCircle size={20} color="var(--status-error)" style={{ flexShrink: 0, marginTop: '2px' }} />
          )}
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: testResult.success ? '#6ee7b7' : '#fca5a5' }}>
              {testResult.endpoint} — HTTP {testResult.status} {testResult.success ? 'Access Granted' : 'Access Denied'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              {testResult.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
