import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Edit2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AcademicSession {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isLocked: boolean;
  description?: string | null;
  _count?: {
    sessionClassSections: number;
    classSubjects: number;
  };
}

export const SessionsManager: React.FC<{ onSessionUpdated?: () => void }> = ({ onSessionUpdated }) => {
  const { token, hasPermission, user } = useAuth();
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AcademicSession | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCreate = hasPermission('academic_sessions:create') || hasPermission('academics:manage');
  const canUpdate = hasPermission('academic_sessions:update') || hasPermission('academics:manage');
  const canActivate = hasPermission('academic_sessions:activate') || user?.isSuperAdmin;
  const canLock = hasPermission('academic_sessions:lock') || user?.isSuperAdmin;

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/academic-sessions', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSessions(data.data);
      } else {
        setError(data.message || 'Failed to load academic sessions');
      }
    } catch {
      setError('Network error while loading academic sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingSession(null);
    setName('');
    setCode('');
    setStartDate('2027-04-01');
    setEndDate('2028-03-31');
    setDescription('');
    setIsCurrent(false);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (session: AcademicSession) => {
    if (session.isLocked) {
      setError(`Session "${session.name}" is archived and locked. Modifications are prohibited.`);
      return;
    }
    setEditingSession(session);
    setName(session.name);
    setCode(session.code);
    setStartDate(session.startDate.split('T')[0]);
    setEndDate(session.endDate.split('T')[0]);
    setDescription(session.description || '');
    setIsCurrent(session.isCurrent);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      name,
      code,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      description,
      ...(editingSession ? {} : { isCurrent }),
    };

    try {
      const url = editingSession
        ? `/api/v1/academic-sessions/${editingSession.id}`
        : '/api/v1/academic-sessions';
      const method = editingSession ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Operation failed');
      } else {
        setSuccess(
          editingSession
            ? `Academic session "${name}" updated successfully.`
            : `Academic session "${name}" established.`
        );
        setIsModalOpen(false);
        fetchSessions();
        if (onSessionUpdated) onSessionUpdated();
      }
    } catch {
      setError('An error occurred while saving the academic session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (session: AcademicSession) => {
    if (!confirm(`Are you sure you want to make "${session.name}" (${session.code}) the CURRENT active academic session? Previous current session will be deactivated.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/academic-sessions/${session.id}/activate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Active academic session switched to "${session.name}".`);
        fetchSessions();
        if (onSessionUpdated) onSessionUpdated();
      } else {
        setError(data.message || 'Failed to activate session');
      }
    } catch {
      setError('Failed to switch academic session');
    }
  };

  const handleLock = async (session: AcademicSession) => {
    if (session.isCurrent) {
      setError('Cannot lock the currently active session. Switch active session before locking.');
      return;
    }

    if (!confirm(`CAUTION: Are you sure you want to archive and LOCK academic session "${session.name}"? Historical records will be protected from all further modification.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/academic-sessions/${session.id}/lock`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Academic session "${session.name}" has been archived and locked.`);
        fetchSessions();
      } else {
        setError(data.message || 'Failed to lock session');
      }
    } catch {
      setError('Failed to lock academic session');
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Action Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Academic Sessions
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Configure and govern multi-year academic sessions with single-current enforcement and historical archiving.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--accent-gradient)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '0.6rem 1.15rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Plus size={16} />
            <span>Create Session</span>
          </button>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          background: 'var(--status-error-bg)',
          color: 'var(--status-error)',
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          fontSize: '0.85rem',
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          background: 'var(--status-success-bg)',
          color: 'var(--status-success)',
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          fontSize: '0.85rem',
        }}>
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Sessions Grid */}
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 size={28} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
          <div>Loading academic sessions...</div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
          <Calendar size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
          <p>No academic sessions configured yet.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.25rem',
        }}>
          {sessions.map((session) => (
            <div
              key={session.id}
              className="card"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderColor: session.isCurrent
                  ? 'var(--status-success)'
                  : session.isLocked
                  ? 'rgba(239, 68, 68, 0.3)'
                  : 'var(--border-subtle)',
                background: session.isCurrent
                  ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, var(--bg-secondary) 100%)'
                  : 'var(--bg-secondary)',
              }}
            >
              <div>
                {/* Header & Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {session.name}
                    </h3>
                    <span className="code-pill" style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                      {session.code}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {session.isCurrent && (
                      <span className="badge badge-success" style={{ gap: '0.25rem' }}>
                        <CheckCircle size={12} />
                        Active Current
                      </span>
                    )}
                    {session.isLocked && (
                      <span className="badge" style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: 'var(--status-error)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        gap: '0.25rem',
                      }}>
                        <Lock size={12} />
                        Archived / Locked
                      </span>
                    )}
                    {!session.isCurrent && !session.isLocked && (
                      <span className="badge badge-info">
                        <Clock size={12} />
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', margin: '0.75rem 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={14} color="var(--text-muted)" />
                    <span>Duration:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {formatDate(session.startDate)} — {formatDate(session.endDate)}
                    </strong>
                  </div>
                  {session.description && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {session.description}
                    </div>
                  )}
                  {session._count && (
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                      <span>Classes Mapped: <strong>{session._count.sessionClassSections}</strong></span>
                      <span>Subjects Mapped: <strong>{session._count.classSubjects}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Controls */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '0.85rem',
                marginTop: '0.5rem',
                flexWrap: 'wrap',
              }}>
                {!session.isCurrent && canActivate && (
                  <button
                    onClick={() => handleActivate(session)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--status-success)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <CheckCircle size={14} />
                    <span>Set Active</span>
                  </button>
                )}

                {canUpdate && !session.isLocked && (
                  <button
                    onClick={() => handleOpenEdit(session)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.775rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                )}

                {!session.isCurrent && !session.isLocked && canLock && (
                  <button
                    onClick={() => handleLock(session)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--status-error)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.775rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Lock size={13} />
                    <span>Lock</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create or Edit Academic Session */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {editingSession ? 'Edit Academic Session' : 'Create Academic Session'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Specify the session title, code identifier, and active duration.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Session Name / Years *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2027-2028"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Session Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. AY-2027-28"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Description / Remarks
                </label>
                <textarea
                  placeholder="Optional notes regarding this academic year"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {!editingSession && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="isCurrentCheck"
                    checked={isCurrent}
                    onChange={(e) => setIsCurrent(e.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="isCurrentCheck" style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    Make this the current active academic session immediately
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  style={{
                    padding: '0.6rem 1.15rem',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1.25rem',
                    background: 'var(--accent-gradient)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingSession ? 'Update Session' : 'Save Session'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
