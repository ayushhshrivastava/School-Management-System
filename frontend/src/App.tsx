import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Navbar } from './components/Navbar';
import { FoundationOverview } from './components/FoundationOverview';
import { RbacTester } from './components/RbacTester';
import { AcademicMasterManager } from './components/academics/AcademicMasterManager';
import { Loader2, GraduationCap, ShieldCheck, Activity } from 'lucide-react';

const AuthenticatedApp: React.FC = () => {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const [activeModule, setActiveModule] = useState<'academics' | 'rbac' | 'system'>('academics');

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
        gap: '0.75rem'
      }}>
        <Loader2 size={24} className="spin" color="#6366f1" />
        <span>Verifying active session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const userPermissions = user?.isSuperAdmin 
    ? ['all', ...(user?.permissions || [])] 
    : (user?.permissions || []);

  const primaryRole = user?.roles?.[0] || (user?.isSuperAdmin ? 'SUPER_ADMIN' : 'STAFF');

  return (
    <div className="app-container">
      <Navbar />

      {/* Module Selector Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveModule('academics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeModule === 'academics'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Step 3: Academic Master & Config</span>
            </button>

            <button
              onClick={() => setActiveModule('rbac')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeModule === 'rbac'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Step 2: RBAC Tester</span>
            </button>

            <button
              onClick={() => setActiveModule('system')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeModule === 'system'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Step 1: System Health</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 hidden sm:block">
            Signed in as <span className="font-semibold text-slate-200">{user?.fullName}</span> ({primaryRole})
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeModule === 'academics' && (
          <AcademicMasterManager
            token={token}
            userRole={primaryRole}
            userPermissions={userPermissions}
          />
        )}

        {activeModule === 'rbac' && (
          <div className="space-y-6">
            <RbacTester />
          </div>
        )}

        {activeModule === 'system' && (
          <div className="space-y-6">
            <FoundationOverview />
          </div>
        )}
      </main>

      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '1.5rem 2rem',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        background: 'var(--bg-secondary)'
      }}>
        Kids World School ERP • Version 1.0 (Step 3 Academic Master & Config Active) • Madhya Pradesh, India
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
};

export default App;
