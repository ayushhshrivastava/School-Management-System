import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Layers,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ClassOption {
  id: string;
  name: string;
  code: string;
}

interface SessionOption {
  id: string;
  name: string;
  code: string;
  isCurrent: boolean;
  isLocked: boolean;
}

interface SubjectOption {
  id: string;
  name: string;
  code: string;
  type: string;
}

interface ClassSubjectRecord {
  id: string;
  classId: string;
  subjectId: string;
  academicSessionId: string;
  isCompulsory: boolean;
  weeklyPeriods: number;
  totalMarks: number;
  passingMarks: number;
  isActive: boolean;
  class: { id: string; name: string; code: string };
  subject: { id: string; name: string; code: string; type: string };
  academicSession: { id: string; name: string; code: string; isLocked: boolean };
}

export const ClassSubjectManager: React.FC = () => {
  const { token, hasPermission } = useAuth();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectOption[]>([]);
  const [mappings, setMappings] = useState<ClassSubjectRecord[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ClassSubjectRecord | null>(null);
  const [modalSubjectId, setModalSubjectId] = useState('');
  const [isCompulsory, setIsCompulsory] = useState(true);
  const [weeklyPeriods, setWeeklyPeriods] = useState<number>(5);
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [passingMarks, setPassingMarks] = useState<number>(33);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = hasPermission('class_subjects:manage') || hasPermission('academics:manage');

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const [classesRes, sessionsRes, subjectsRes] = await Promise.all([
        fetch('/api/v1/classes?limit=100', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch('/api/v1/academic-sessions?limit=100', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch('/api/v1/subjects?limit=100', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
      ]);

      const [classesData, sessionsData, subjectsData] = await Promise.all([
        classesRes.json(),
        sessionsRes.json(),
        subjectsRes.json(),
      ]);

      if (classesData.success && classesData.data.length > 0) {
        setClasses(classesData.data);
        setSelectedClassId(classesData.data[0].id);
      }

      if (sessionsData.success && sessionsData.data.length > 0) {
        setSessions(sessionsData.data);
        const current = sessionsData.data.find((s: SessionOption) => s.isCurrent);
        setSelectedSessionId(current ? current.id : sessionsData.data[0].id);
      }

      if (subjectsData.success) {
        setAllSubjects(subjectsData.data);
      }
    } catch {
      setError('Failed to initialize master filter options');
    }
  };

  useEffect(() => {
    if (selectedClassId && selectedSessionId) {
      fetchMappings(selectedClassId, selectedSessionId);
    }
  }, [selectedClassId, selectedSessionId]);

  const fetchMappings = async (classId: string, sessionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/class-subjects?classId=${classId}&academicSessionId=${sessionId}&limit=100`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setMappings(data.data);
      } else {
        setError(data.message || 'Failed to load class-subject mappings');
      }
    } catch {
      setError('Network error loading class-subject mappings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingMapping(null);
    setModalSubjectId(allSubjects[0]?.id || '');
    setIsCompulsory(true);
    setWeeklyPeriods(5);
    setTotalMarks(100);
    setPassingMarks(33);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: ClassSubjectRecord) => {
    setEditingMapping(m);
    setModalSubjectId(m.subjectId);
    setIsCompulsory(m.isCompulsory);
    setWeeklyPeriods(m.weeklyPeriods);
    setTotalMarks(m.totalMarks);
    setPassingMarks(m.passingMarks);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      classId: selectedClassId,
      academicSessionId: selectedSessionId,
      subjectId: modalSubjectId,
      isCompulsory,
      weeklyPeriods: Number(weeklyPeriods),
      totalMarks: Number(totalMarks),
      passingMarks: Number(passingMarks),
    };

    try {
      const url = editingMapping
        ? `/api/v1/class-subjects/${editingMapping.id}`
        : '/api/v1/class-subjects';
      const method = editingMapping ? 'PUT' : 'POST';

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
          editingMapping
            ? 'Class-Subject mapping updated successfully.'
            : 'Subject mapped to class successfully.'
        );
        setIsModalOpen(false);
        fetchMappings(selectedClassId, selectedSessionId);
      }
    } catch {
      setError('Failed to save mapping');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (m: ClassSubjectRecord) => {
    if (!confirm(`Are you sure you want to unmap subject "${m.subject.name}" from class "${m.class.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/class-subjects/${m.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Subject "${m.subject.name}" removed from class.`);
        fetchMappings(selectedClassId, selectedSessionId);
      } else {
        setError(data.message || 'Failed to remove mapping');
      }
    } catch {
      setError('Failed to remove mapping');
    }
  };

  const currentSessionLocked = sessions.find((s) => s.id === selectedSessionId)?.isLocked;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header & Dual Filters */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Class → Subject Mapping
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Map curriculum subjects to classes per academic session with Core vs Elective designations.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Class Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.45rem 0.75rem',
          }}>
            <Layers size={14} color="#6366f1" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.825rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id} style={{ background: 'var(--bg-secondary)' }}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Session Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.45rem 0.75rem',
          }}>
            <Calendar size={14} color="#10b981" />
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.825rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id} style={{ background: 'var(--bg-secondary)' }}>
                  {s.name} {s.isCurrent ? '(Active)' : s.isLocked ? '(Locked)' : ''}
                </option>
              ))}
            </select>
          </div>

          {canManage && !currentSessionLocked && (
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
              <span>Map Subject</span>
            </button>
          )}
        </div>
      </div>

      {currentSessionLocked && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          background: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--status-error)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          fontSize: '0.825rem',
        }}>
          <AlertCircle size={16} />
          <span>This academic session is archived and locked. Subject mappings are read-only.</span>
        </div>
      )}

      {/* Messages */}
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

      {/* Mappings Table/Grid */}
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 size={28} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
          <div>Loading subject mappings...</div>
        </div>
      ) : mappings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
          <BookOpen size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
          <p>No subjects mapped to this class in the selected academic session.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Subject</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Code</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Modality</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Requirement</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Periods/Week</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Marks (Total / Pass)</th>
                  {canManage && !currentSessionLocked && (
                    <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {m.subject.name}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className="code-pill">{m.subject.code}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                      {m.subject.type}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {m.isCompulsory ? (
                        <span className="badge badge-info" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                          Core / Compulsory
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                          Optional / Elective
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>
                      {m.weeklyPeriods} periods
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{m.totalMarks}</strong> / pass: {m.passingMarks}
                    </td>
                    {canManage && !currentSessionLocked && (
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleOpenEdit(m)}
                            title="Edit mapping parameters"
                            style={{
                              padding: '0.35rem 0.55rem',
                              background: 'var(--bg-surface)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleRemove(m)}
                            title="Remove subject mapping"
                            style={{
                              padding: '0.35rem 0.55rem',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: 'var(--status-error)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Map or Edit Subject */}
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
          <div className="card" style={{ width: '100%', maxWidth: '480px', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {editingMapping ? 'Edit Class-Subject Mapping' : 'Map Subject to Class'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Assign academic curriculum subjects, requirement status, and scoring parameters.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Select Subject *
                </label>
                <select
                  value={modalSubjectId}
                  onChange={(e) => setModalSubjectId(e.target.value)}
                  disabled={!!editingMapping}
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
                >
                  {allSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code} • {s.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Course Requirement
                </label>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.35rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="compulsoryRadio"
                      checked={isCompulsory}
                      onChange={() => setIsCompulsory(true)}
                      style={{ accentColor: '#6366f1' }}
                    />
                    <span>Core / Compulsory</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="compulsoryRadio"
                      checked={!isCompulsory}
                      onChange={() => setIsCompulsory(false)}
                      style={{ accentColor: '#f59e0b' }}
                    />
                    <span>Optional / Elective</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Periods/Wk
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={weeklyPeriods}
                    onChange={(e) => setWeeklyPeriods(parseInt(e.target.value) || 1)}
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
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(parseFloat(e.target.value) || 100)}
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
                    Pass Marks
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(parseFloat(e.target.value) || 33)}
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
                    <span>{editingMapping ? 'Update Mapping' : 'Save Mapping'}</span>
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
