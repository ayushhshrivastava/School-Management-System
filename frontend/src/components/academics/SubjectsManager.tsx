import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Power,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SubjectRecord {
  id: string;
  name: string;
  code: string;
  type: string;
  displayOrder: number;
  isActive: boolean;
  description?: string | null;
  _count?: {
    classSubjects: number;
  };
}

export const SubjectsManager: React.FC = () => {
  const { token, hasPermission } = useAuth();
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectRecord | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('THEORY');
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCreate = hasPermission('subjects:create') || hasPermission('academics:manage');
  const canUpdate = hasPermission('subjects:update') || hasPermission('academics:manage');
  const canDelete = hasPermission('subjects:delete') || hasPermission('academics:manage');

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/subjects?limit=100', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubjects(data.data);
      } else {
        setError(data.message || 'Failed to load subjects');
      }
    } catch {
      setError('Network error while loading subjects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingSubject(null);
    setName('');
    setCode('');
    setType('THEORY');
    setDisplayOrder(subjects.length > 0 ? Math.max(...subjects.map((s) => s.displayOrder)) + 1 : 1);
    setDescription('');
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub: SubjectRecord) => {
    setEditingSubject(sub);
    setName(sub.name);
    setCode(sub.code);
    setType(sub.type);
    setDisplayOrder(sub.displayOrder);
    setDescription(sub.description || '');
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
      type,
      displayOrder: Number(displayOrder),
      description,
    };

    try {
      const url = editingSubject
        ? `/api/v1/subjects/${editingSubject.id}`
        : '/api/v1/subjects';
      const method = editingSubject ? 'PUT' : 'POST';

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
          editingSubject
            ? `Subject "${name}" updated successfully.`
            : `Subject "${name}" created successfully.`
        );
        setIsModalOpen(false);
        fetchSubjects();
      }
    } catch {
      setError('An error occurred while saving subject.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (sub: SubjectRecord) => {
    const nextStatus = !sub.isActive;
    try {
      const res = await fetch(`/api/v1/subjects/${sub.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Subject "${sub.name}" was ${nextStatus ? 'activated' : 'deactivated'}.`);
        fetchSubjects();
      } else {
        setError(data.message || 'Failed to update subject status');
      }
    } catch {
      setError('Failed to update subject status');
    }
  };

  const handleDelete = async (sub: SubjectRecord) => {
    if (!confirm(`Are you sure you want to delete or deactivate subject "${sub.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/subjects/${sub.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message || `Subject "${sub.name}" deleted/deactivated.`);
        fetchSubjects();
      } else {
        setError(data.message || 'Failed to delete subject');
      }
    } catch {
      setError('Failed to delete subject');
    }
  };

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header & Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Subject Catalog
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Manage the institution's repository of subjects across Theory, Practical, and Co-curricular tracks.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.45rem 0.75rem',
          }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.825rem',
                outline: 'none',
                width: '160px',
              }}
            />
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
              <span>Create Subject</span>
            </button>
          )}
        </div>
      </div>

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

      {/* Subject Cards */}
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 size={28} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
          <div>Loading subjects catalog...</div>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
          <BookOpen size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
          <p>No subjects found in the catalog.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '1rem',
        }}>
          {filteredSubjects.map((sub) => (
            <div
              key={sub.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.25rem',
                opacity: sub.isActive ? 1 : 0.65,
                borderColor: sub.isActive ? 'var(--border-subtle)' : 'rgba(239, 68, 68, 0.2)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {sub.name}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                      <span className="code-pill">{sub.code}</span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: sub.type === 'THEORY' ? '#38bdf8' : sub.type === 'PRACTICAL' ? '#f59e0b' : '#a855f7',
                      }}>
                        {sub.type}
                      </span>
                    </div>
                  </div>

                  <span className={`badge ${sub.isActive ? 'badge-success' : 'badge-warning'}`}>
                    {sub.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {sub.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                    {sub.description}
                  </p>
                )}

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Mapped Classes: <strong>{sub._count?.classSubjects || 0}</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '0.75rem',
                marginTop: '1rem',
              }}>
                {canUpdate && (
                  <button
                    onClick={() => handleOpenEdit(sub)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.45rem',
                      fontSize: '0.775rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                )}

                {canUpdate && (
                  <button
                    onClick={() => handleToggleStatus(sub)}
                    title={sub.isActive ? 'Deactivate subject' : 'Activate subject'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.45rem 0.65rem',
                      background: sub.isActive ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: sub.isActive ? 'var(--status-warning)' : 'var(--status-success)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    <Power size={13} />
                  </button>
                )}

                {canDelete && (
                  <button
                    onClick={() => handleDelete(sub)}
                    title="Delete or safe deactivate"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.45rem 0.65rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--status-error)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create or Edit Subject */}
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
              {editingSubject ? 'Edit Subject' : 'Create Subject'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Establish a curriculum course, short code, and delivery modality.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Subject Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics, Science, French"
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MATH, SCI"
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

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Type / Modality *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
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
                    <option value="THEORY">Theory</option>
                    <option value="PRACTICAL">Practical</option>
                    <option value="BOTH">Theory & Practical</option>
                    <option value="CO_CURRICULAR">Co-Curricular</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Display Sequence Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
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
                  Description / Syllabus Outline
                </label>
                <textarea
                  placeholder="Optional curriculum notes"
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
                    <span>{editingSubject ? 'Update Subject' : 'Save Subject'}</span>
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
