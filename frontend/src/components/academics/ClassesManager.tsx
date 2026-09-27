import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
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

interface SectionSummary {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface ClassRecord {
  id: string;
  name: string;
  code: string;
  displayOrder: number;
  isActive: boolean;
  description?: string | null;
  sections?: SectionSummary[];
  _count?: {
    sections: number;
    classSubjects: number;
    sessionClassSections: number;
  };
}

export const ClassesManager: React.FC = () => {
  const { token, hasPermission } = useAuth();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRecord | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCreate = hasPermission('classes:create') || hasPermission('academics:manage');
  const canUpdate = hasPermission('classes:update') || hasPermission('academics:manage');
  const canDelete = hasPermission('classes:delete') || hasPermission('academics:manage');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/classes?limit=100', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setClasses(data.data);
      } else {
        setError(data.message || 'Failed to load classes');
      }
    } catch {
      setError('Network error while loading classes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingClass(null);
    setName('');
    setCode('');
    setDisplayOrder(classes.length > 0 ? Math.max(...classes.map(c => c.displayOrder)) + 1 : 1);
    setDescription('');
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls: ClassRecord) => {
    setEditingClass(cls);
    setName(cls.name);
    setCode(cls.code);
    setDisplayOrder(cls.displayOrder);
    setDescription(cls.description || '');
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
      displayOrder: Number(displayOrder),
      description,
    };

    try {
      const url = editingClass
        ? `/api/v1/classes/${editingClass.id}`
        : '/api/v1/classes';
      const method = editingClass ? 'PUT' : 'POST';

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
          editingClass
            ? `Class "${name}" updated successfully.`
            : `Class "${name}" created successfully.`
        );
        setIsModalOpen(false);
        fetchClasses();
      }
    } catch {
      setError('An error occurred while saving class.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (cls: ClassRecord) => {
    const nextStatus = !cls.isActive;
    try {
      const res = await fetch(`/api/v1/classes/${cls.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Class "${cls.name}" was ${nextStatus ? 'activated' : 'deactivated'}.`);
        fetchClasses();
      } else {
        setError(data.message || 'Failed to update status');
      }
    } catch {
      setError('Failed to update class status');
    }
  };

  const handleDelete = async (cls: ClassRecord) => {
    if (!confirm(`Are you sure you want to delete or deactivate class "${cls.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/classes/${cls.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message || `Class "${cls.name}" removed/deactivated.`);
        fetchClasses();
      } else {
        setError(data.message || 'Failed to delete class');
      }
    } catch {
      setError('Failed to delete class');
    }
  };

  const filteredClasses = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Action Header & Search */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Class & Grade Master
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Define the school's configurable grades from Nursery to Class 12.
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
              placeholder="Search classes..."
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
              <span>Create Class</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Messages */}
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

      {/* Classes Grid */}
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 size={28} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
          <div>Loading class rosters...</div>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
          <GraduationCap size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
          <p>No classes found matching search criteria.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '1rem',
        }}>
          {filteredClasses.map((cls) => (
            <div
              key={cls.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.25rem',
                opacity: cls.isActive ? 1 : 0.65,
                borderColor: cls.isActive ? 'var(--border-subtle)' : 'rgba(239, 68, 68, 0.2)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {cls.name}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                      <span className="code-pill">{cls.code}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Seq: #{cls.displayOrder}
                      </span>
                    </div>
                  </div>

                  <span className={`badge ${cls.isActive ? 'badge-success' : 'badge-warning'}`}>
                    {cls.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {cls.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                    {cls.description}
                  </p>
                )}

                {/* Section Chips */}
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Configured Sections ({cls.sections?.length || 0}):
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {cls.sections && cls.sections.length > 0 ? (
                      cls.sections.map((s) => (
                        <span
                          key={s.id}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            color: s.isActive ? '#38bdf8' : 'var(--text-muted)',
                          }}
                        >
                          Sec {s.name}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No sections created
                      </span>
                    )}
                  </div>
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
                    onClick={() => handleOpenEdit(cls)}
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
                    onClick={() => handleToggleStatus(cls)}
                    title={cls.isActive ? 'Deactivate class' : 'Activate class'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.45rem 0.65rem',
                      background: cls.isActive ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: cls.isActive ? 'var(--status-warning)' : 'var(--status-success)',
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
                    onClick={() => handleDelete(cls)}
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

      {/* Modal: Create or Edit Class */}
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
              {editingClass ? 'Edit Academic Class' : 'Create Academic Class'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Establish a grade level and its display sequence for the institution.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Class Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Class 1, Nursery, UKG"
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
                    Class Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CLS-01, NUR"
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
                    Display Order *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
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
                  placeholder="Optional notes regarding this grade"
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
                    <span>{editingClass ? 'Update Class' : 'Save Class'}</span>
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
