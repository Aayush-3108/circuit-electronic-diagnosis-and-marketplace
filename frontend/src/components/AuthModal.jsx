import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CloseIcon, InfoIcon } from './Icons';

export default function AuthModal({ onClose, initialMode = 'login' }) {
  const { login, signup, firebaseConfigured } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message?.replace('Firebase: ', '') || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  }

  const isPasswordWeak = password.length > 0 && password.length < 6;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => { if (!loading) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl relative shadow-2xl overflow-hidden bg-[var(--surface)] border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Decorative header accent */}
        <div className="h-1.5 w-full bg-[var(--accent)]" />

        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-[var(--text)]">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {mode === 'login' ? 'Sign in to access ReCircuit' : 'Join ReCircuit to diagnose and trade hardware'}
              </p>
            </div>
            <button
              onClick={() => { if (!loading) onClose(); }}
              disabled={loading}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Close modal"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Mode switch tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="auth-email" className="block text-xs font-semibold text-[var(--text)]">
                Email address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field text-sm"
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="auth-password" className="block text-xs font-semibold text-[var(--text)]">
                  Password
                </label>
              </div>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field text-sm"
                placeholder="Min. 6 characters"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              {mode === 'signup' && isPasswordWeak && (
                <p className="text-[11px] text-[var(--recycle)]">Password must be at least 6 characters.</p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-[var(--recycle-dim)] border border-[var(--recycle)]/30 text-xs text-[var(--recycle)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center text-sm py-3 font-semibold shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                  </svg>
                  Processing...
                </span>
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {!firebaseConfigured && (
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-dim)] pt-2 border-t border-[var(--border-subtle)]">
              <InfoIcon className="w-3.5 h-3.5 shrink-0 text-[var(--accent)]" />
              <span>Offline session mode enabled. Any credentials will create your session.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
