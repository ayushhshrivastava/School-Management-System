import React, { useState } from 'react';
import { 
  Calendar, 
  Layers, 
  Grid, 
  BookOpen, 
  Network, 
  Sliders, 
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { SessionsManager } from './SessionsManager';
import { ClassesManager } from './ClassesManager';
import { SectionsManager } from './SectionsManager';
import { SubjectsManager } from './SubjectsManager';
import { ClassSubjectManager } from './ClassSubjectManager';
import { SystemConfigManager } from './SystemConfigManager';

interface AcademicMasterManagerProps {
  token: string | null;
  userRole?: string;
  userPermissions?: string[];
}

export const AcademicMasterManager: React.FC<AcademicMasterManagerProps> = ({
  token,
  userRole = 'GUEST',
  userPermissions = []
}) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'classes' | 'sections' | 'subjects' | 'mappings' | 'config'>('sessions');

  const tabs = [
    { id: 'sessions', label: 'Academic Sessions', icon: Calendar, desc: 'Multi-year calendar & session states' },
    { id: 'classes', label: 'Class Master', icon: Layers, desc: 'Grades & display sequence' },
    { id: 'sections', label: 'Section Master', icon: Grid, desc: 'Section hierarchy & capacity' },
    { id: 'subjects', label: 'Subject Catalog', icon: BookOpen, desc: 'Theory, practical & co-curricular' },
    { id: 'mappings', label: 'Class-Subject Mapping', icon: Network, desc: 'Curriculum & core/elective rules' },
    { id: 'config', label: 'System Configuration', icon: Sliders, desc: 'Centralized school ERP parameters' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/60 via-slate-900/90 to-purple-900/40 border border-indigo-500/20 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Step 3 Master Configuration Management</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-indigo-400" />
              Kids World School — Academic Master Console
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Foundation layer establishing multi-year academic sessions, class rosters, section hierarchies, subject catalogs, class-subject curricula, and centralized institutional parameters.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Role</span>
              <span className="text-xs font-mono font-bold text-amber-400">{userRole}</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-700 hidden sm:block" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Access Scope</span>
              <span className="text-xs font-mono text-emerald-400">
                {userPermissions.length} Active Permissions
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pt-6 mt-6 border-t border-slate-700/50 scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-xs whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-indigo-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab View */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
        {activeTab === 'sessions' && <SessionsManager />}
        {activeTab === 'classes' && <ClassesManager />}
        {activeTab === 'sections' && <SectionsManager />}
        {activeTab === 'subjects' && <SubjectsManager />}
        {activeTab === 'mappings' && <ClassSubjectManager />}
        {activeTab === 'config' && (
          <SystemConfigManager token={token} permissions={userPermissions} />
        )}
      </div>
    </div>
  );
};
