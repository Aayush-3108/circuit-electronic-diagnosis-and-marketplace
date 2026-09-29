import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CircuitIcon, DiagnoseIcon, MarketplaceIcon, UpgradeIcon } from './Icons';

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
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const mainFeatures = [
    { id: 'analyze', label: 'Diagnose', icon: DiagnoseIcon },
    { id: 'marketplace', label: 'Marketplace', icon: MarketplaceIcon },
    { id: 'upgrade', label: 'Upgrade Advisor', icon: UpgradeIcon },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 h-18 flex items-center justify-between gap-6">
        {/* Brand Logo */}
        <button
          onClick={() => { setView(user ? 'analyze' : 'landing'); setMobileOpen(false); }}
          className="text-lg font-bold tracking-tight text-[var(--text)] flex items-center gap-2.5 transition-opacity hover:opacity-90"
          aria-label="ReCircuit homepage"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center shadow-sm">
            <CircuitIcon className="w-5 h-5" />
          </div>
          <span className="font-bold tracking-tight text-lg text-[var(--text)]">ReCircuit</span>
        </button>

        {/* If user is logged in, show the 3 main features in the top navbar */}
        {user ? (
          <div className="hidden md:flex items-center gap-6">
            {mainFeatures.map((f) => {
              const Icon = f.icon;
              const isActive = view === f.id || (f.id === 'marketplace' && (view === 'sell' || view === 'listing_page')) || (f.id === 'upgrade' && view === 'shops');
              return (
                <button
                  key={f.id}
                  onClick={() => setView(f.id)}
                  className={`flex items-center gap-2 text-sm font-semibold transition-colors py-1.5 px-3 rounded-lg ${
                    isActive
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">
              Diagnose · Trade · Upgrade
            </span>
          </div>
        )}

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Theme mode toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            title="Toggle theme mode"
            aria-label="Toggle theme mode"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* User Auth: Standard SaaS Buttons */}
          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setView('dashboard')}
                className={`btn btn-ghost text-xs px-3 py-2 ${view === 'dashboard' ? 'bg-[var(--surface-2)] font-semibold text-[var(--text)]' : ''}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setView('inbox')}
                className={`btn btn-ghost text-xs px-3 py-2 ${view === 'inbox' || view === 'chat' ? 'bg-[var(--surface-2)] font-semibold text-[var(--text)]' : ''}`}
              >
                Inbox
              </button>
              <button
                onClick={logout}
                className="btn btn-outline text-xs px-3.5 py-2 ml-1"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2.5">
              <button
                onClick={() => onShowAuth('login')}
                className="btn btn-ghost text-xs font-semibold px-4 py-2 text-[var(--text)] hover:bg-[var(--surface-2)]"
              >
                Log In
              </button>
              <button
                onClick={() => onShowAuth('signup')}
                className="btn btn-primary text-xs font-semibold px-4 py-2 shadow-sm"
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Mobile hamburger menu */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-2)] transition-colors text-sm font-medium"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-3 shadow-lg">
          {user ? (
            <>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] px-2 mb-1">
                Main Features
              </div>
              {mainFeatures.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setView(f.id); setMobileOpen(false); }}
                  className={`w-full text-left text-sm font-medium py-2.5 px-3 rounded-lg transition-all ${
                    view === f.id
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <div className="border-t border-[var(--border)] my-2" />
              <button
                onClick={() => { setView('dashboard'); setMobileOpen(false); }}
                className="w-full text-left py-2 px-3 rounded-lg text-sm text-[var(--text)] font-medium hover:bg-[var(--surface-2)]"
              >
                Dashboard
              </button>
              <button
                onClick={() => { setView('inbox'); setMobileOpen(false); }}
                className="w-full text-left py-2 px-3 rounded-lg text-sm text-[var(--text)] font-medium hover:bg-[var(--surface-2)]"
              >
                Inbox
              </button>
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="w-full text-left py-2 px-3 rounded-lg text-sm text-[var(--recycle)] font-semibold hover:bg-[var(--surface-2)]"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="space-y-3 pt-2">
              <button
                onClick={() => { onShowAuth('login'); setMobileOpen(false); }}
                className="btn btn-outline w-full text-sm py-2.5 justify-center"
              >
                Log In
              </button>
              <button
                onClick={() => { onShowAuth('signup'); setMobileOpen(false); }}
                className="btn btn-primary w-full text-sm py-2.5 justify-center"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
