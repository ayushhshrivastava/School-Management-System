import React from 'react';
import { Navbar } from './components/Navbar';
import { FoundationOverview } from './components/FoundationOverview';

export const App: React.FC = () => {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <FoundationOverview />
      </main>
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '1.5rem 2rem',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        background: 'var(--bg-secondary)'
      }}>
        Kids World School ERP • Version 1.0 (Step 1 Foundation) • Madhya Pradesh, India
      </footer>
    </div>
  );
};

export default App;
