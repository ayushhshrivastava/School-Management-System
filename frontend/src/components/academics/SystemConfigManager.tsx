import React, { useState, useEffect } from 'react';
import { Sliders, Save, RefreshCw, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';

interface ConfigItem {
  id: string;
  category: string;
  key: string;
  value: string;
  dataType: string;
  description?: string;
  isPublic: boolean;
  updatedAt: string;
}

interface SystemConfigManagerProps {
  token: string | null;
  permissions: string[];
}

export const SystemConfigManager: React.FC<SystemConfigManagerProps> = ({ token, permissions }) => {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const canEdit = permissions.includes('system:config:edit') || permissions.includes('system:config') || permissions.includes('all');

  const fetchConfigs = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/config', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch configuration');
      setConfigs(data.data || []);
      // Reset edit draft
      const drafts: Record<string, string> = {};
      (data.data || []).forEach((c: ConfigItem) => {
        drafts[c.key] = c.value;
      });
      setEditedValues(drafts);
    } catch (err: any) {
      setError(err.message || 'Error loading system configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [token]);

  const handleValueChange = (key: string, val: string) => {
    setEditedValues(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async (key: string) => {
    if (!token || !canEdit) return;
    setSavingKey(key);
    setError(null);
    setSuccess(null);
    try {
      const newValue = editedValues[key];
      const res = await fetch(`/api/v1/config/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ value: newValue })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update config setting');
      setSuccess(`Configuration '${key}' updated successfully.`);
      fetchConfigs();
    } catch (err: any) {
      setError(err.message || 'Error updating configuration');
    } finally {
      setSavingKey(null);
    }
  };

  const categories = ['all', ...Array.from(new Set(configs.map(c => c.category)))];

  const filteredConfigs = activeCategory === 'all'
    ? configs
    : configs.filter(c => c.category === activeCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            Centralized School & System Configuration
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Configure institutional parameters, grading scales, term preferences, and fee prefixes.
          </p>
        </div>

        <button
          onClick={fetchConfigs}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-300 text-sm">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {!canEdit && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-amber-300 text-xs">
          <ShieldAlert className="w-4 h-4" />
          <span>Read-only mode: You do not possess elevated privileges (<code>system:config:edit</code>) to modify system settings.</span>
        </div>
      )}

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
              activeCategory === cat
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredConfigs.map(item => {
          const isModified = editedValues[item.key] !== item.value;
          const isSaving = savingKey === item.key;

          return (
            <div
              key={item.id}
              className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 flex flex-col justify-between transition space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                    {item.key}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {item.dataType}
                    </span>
                    {item.isPublic && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                        Public
                      </span>
                    )}
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-slate-400 mb-3">{item.description}</p>
                )}

                <div className="mt-2">
                  {item.dataType === 'BOOLEAN' ? (
                    <select
                      value={editedValues[item.key] ?? item.value}
                      onChange={e => handleValueChange(item.key, e.target.value)}
                      disabled={!canEdit || isSaving}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="true">true (Enabled)</option>
                      <option value="false">false (Disabled)</option>
                    </select>
                  ) : item.dataType === 'JSON' ? (
                    <textarea
                      rows={3}
                      value={editedValues[item.key] ?? item.value}
                      onChange={e => handleValueChange(item.key, e.target.value)}
                      disabled={!canEdit || isSaving}
                      className="w-full font-mono text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 focus:outline-none focus:border-indigo-500"
                    />
                  ) : (
                    <input
                      type={item.dataType === 'NUMBER' ? 'number' : 'text'}
                      value={editedValues[item.key] ?? item.value}
                      onChange={e => handleValueChange(item.key, e.target.value)}
                      disabled={!canEdit || isSaving}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-500">
                  Last updated: {new Date(item.updatedAt).toLocaleDateString()}
                </span>

                {canEdit && (
                  <button
                    onClick={() => handleSave(item.key)}
                    disabled={!isModified || isSaving}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      isModified
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
