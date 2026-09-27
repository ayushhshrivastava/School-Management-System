import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Power,
  Users,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ClassOption {
  id: string;
  name: string;
  code: string;
}

interface SectionRecord {
  id: string;
  classId: string;
  name: string;
  code: string;
  capacity: number;
  displayOrder: number;
  isActive: boolean;
  class: {
    id: string;
    name: string;
    code: string;
  };
}

export const SectionsManager: React.FC = () => {
  const { token, hasPermission } = useAuth();
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionRecord | null>(null);
  const [modalClassId, setModalClassId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState<number>(40);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCreate = hasPermission('sections:create') || hasPermission('academics:manage');
  const canUpdate = hasPermission('sections:update') || hasPermission('academics:manage');
  const canDelete = hasPermission('sections:delete') || hasPermission('academics:manage');

  useEffect(() => {
    loadClasses();
    fetchSections();
  }, []);

  const loadClasses = async () => {
    try {
      const res = await fetch('/api/v1/classes?limit=100', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setClasses(data.data);
      }
    } catch {
      // Ignored
    }
  };

  const fetchSections = async (classId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const targetClass = classId !== undefined ? classId : selectedClassId;
      const url =
        targetClass && targetClass !== 'ALL'
          ? `/api/v1/sections?classId=${targetClass}&limit=100`
          : '/api/v1/sections?limit=100';

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSections(data.data);
      } else {
        setError(data.message || 'Failed to load sections');
      }
    } catch {
      setError('Network error while loading sections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassFilterChange = (cId: string) => {
    setSelectedClassId(cId);
    fetchSections(cId);
  };

  const handleOpenCreate = () => {
    setEditingSection(null);
    setModalClassId(selectedClassId !== 'ALL' ? selectedClassId : classes[0]?.id || '');
    setName('');
    setCode('');
    setCapacity(40);
    setDisplayOrder(1);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sec: SectionRecord) => {
    setEditingSection(sec);
    setModalClassId(sec.classId);
    setName(sec.name);
    setCode(sec.code);
    setCapacity(sec.capacity);
    setDisplayOrder(sec.displayOrder);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      classId: modalClassId,
      name,
      code,
      capacity: Number(capacity),
      displayOrder: Number(displayOrder),
    };

    try {
      const url = editingSection
        ? `/api/v1/sections/${editingSection.id}`
        : '/api/v1/sections';
      const method = editingSection ? 'PUT' : 'POST';

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
          editingSection
            ? `Section "${name}" updated successfully.`
            : `Section "${name}" created successfully.`
        );
        setIsModalOpen(false);
        fetchSections();
      }
    } catch {
      setError('An error occurred while saving section.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (sec: SectionRecord) => {
    const nextStatus = !sec.isActive;
    try {
      const res = await fetch(`/api/v1/sections/${sec.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Section "${sec.name}" was ${nextStatus ? 'activated' : 'deactivated'}.`);
        fetchSections();
      } else {
        setError(data.message || 'Failed to update section status');
      }
    } catch {
      setError('Failed to update status');
    }
  };

  const handleDelete = async (sec: SectionRecord) => {
    if (!confirm(`Are you sure you want to delete or deactivate section "${sec.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/sections/${sec.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message || `Section "${sec.name}" removed/deactivated.`);
        fetchSections();
      } else {
        setError(data.message || 'Failed to delete section');
      }
    } catch {
      setError('Failed to delete section');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Action Header & Class Filter */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Section Master
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Organize student cohorts into sections under their parent classes.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Class Filter Dropdown */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.45rem 0.75rem',
          }}>
            <Filter size={15} color="var(--text-muted)" />
            <select
              value={selectedClassId}
              onChange={(e) => handleClassFilterChange(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.825rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL" style={{ background: 'var(--bg-secondary)' }}>All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id} style={{ background: 'var(--bg-secondary)' }}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
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
              <span>Create Section</span>
            </button>
          )}
        </div>
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

      {/* Sections Cards */}
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 size={28} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
          <div>Loading class sections...</div>
        </div>
      ) : sections.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
          <Tag size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
          <p>No sections found for the selected class filter.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
        }}>
          {sections.map((sec) => (
            <div
              key={sec.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.25rem',
                opacity: sec.isActive ? 1 : 0.65,
                borderColor: sec.isActive ? 'var(--border-subtle)' : 'rgba(239, 68, 68, 0.2)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {sec.class.name}
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Section {sec.name}
                    </h3>
                  </div>

                  <span className={`badge ${sec.isActive ? 'badge-success' : 'badge-warning'}`}>
                    {sec.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  <Users size={14} color="var(--text-muted)" />
                  <span>Target Capacity:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{sec.capacity} students</strong>
                </div>
              </div>

              {/* Action Controls */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '0.75rem',
                marginTop: '0.75rem',
              }}>
                {canUpdate && (
                  <button
                    onClick={() => handleOpenEdit(sec)}
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
                    onClick={() => handleToggleStatus(sec)}
                    title={sec.isActive ? 'Deactivate section' : 'Activate section'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.45rem 0.65rem',
                      background: sec.isActive ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: sec.isActive ? 'var(--status-warning)' : 'var(--status-success)',
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
                    onClick={() => handleDelete(sec)}
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

      {/* Modal: Create or Edit Section */}
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
              {editingSection ? 'Edit Section' : 'Create Section'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Define a section under a class. Names/codes are unique within that class.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Parent Class *
                </label>
                <select
                  value={modalClassId}
                  onChange={(e) => setModalClassId(e.target.value)}
                  disabled={!!editingSection}
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
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Section Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A, B, Rose"
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
                    Section Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A, B"
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Classroom Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={150}
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 40)}
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
                    Display Order
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
                    <span>{editingSection ? 'Update Section' : 'Save Section'}</span>
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
