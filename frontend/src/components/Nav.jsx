import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV_LINKS = [
  { id: 'analyze',     label: 'Diagnose' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'upgrade',     label: 'Upgrade Advisor' },
];

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

export default function Nav({ view, setView, onShowAuth }) {
  const { user, logout, firebaseConfigured } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    ...NAV_LINKS,
    ...(user ? [{ id: 'dashboard', label: 'Dashboard' }] : []),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 h-18 flex items-center justify-between gap-8">
        {/* Brand Logo */}
        <button
          onClick={() => { setView('landing'); setMobileOpen(false); }}
          className="text-lg font-bold tracking-tight text-[var(--text)] flex items-center gap-2.5 transition-opacity hover:opacity-90"
          aria-label="Circuit homepage"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="4" stroke="var(--accent)" strokeWidth="2.5" />
            <path d="M9 9h6v6H9z" fill="var(--accent)" />
          </svg>
          <span className="font-semibold tracking-tight">Circuit</span>
        </button>

        {/* Clean text link options */}
        <div className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => setView(l.id)}
              className={`text-sm font-medium transition-colors py-1 ${
                view === l.id
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Action Panel Utilities */}
        <div className="flex items-center gap-3">
          {/* Light/Dark Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            title="Toggle theme mode"
            aria-label="Toggle theme mode"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* User Auth CTA */}
          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <button onClick={() => setView('dashboard')} className={`btn btn-ghost text-xs ${view === 'dashboard' ? 'bg-[var(--surface-2)]' : ''}`}>
                Dashboard
              </button>
              <button onClick={() => setView('inbox')} className={`btn btn-ghost text-xs ${view === 'inbox' ? 'bg-[var(--surface-2)]' : ''}`}>
                Inbox
              </button>
              <button
                onClick={logout}
                className="btn btn-outline text-xs px-4 py-2"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => onShowAuth()}
              className="btn btn-primary text-xs px-4 py-2"
            >
              {firebaseConfigured ? 'Sign In' : 'Demo Login'}
            </button>
          )}

          {/* Mobile hamburger menu */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-2)] transition-colors text-sm font-medium"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-4 shadow-lg animate-fade-in">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => { setView(l.id); setMobileOpen(false); }}
              className={`w-full text-left text-sm font-medium py-2 px-3 rounded-lg transition-all ${
                view === l.id
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
              }`}
            >
              {l.label}
            </button>
          ))}
          {user ? (
            <>
              <button
                onClick={() => { setView('dashboard'); setMobileOpen(false); }}
                className="block w-full text-left py-3 px-4 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] font-semibold"
              >
                Dashboard
              </button>
              <button
                onClick={() => { setView('inbox'); setMobileOpen(false); }}
                className="block w-full text-left py-3 px-4 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] font-semibold"
              >
                Inbox
              </button>
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="block w-full text-left py-3 px-4 rounded-[var(--radius-sm)] text-[var(--recycle)] font-semibold"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => { onShowAuth(); setMobileOpen(false); }}
              className="btn btn-primary w-full text-xs py-2.5 justify-center mt-2"
            >
              Sign In
            </button>
          )}
        </div>
      )}
    </header>
  );
}
