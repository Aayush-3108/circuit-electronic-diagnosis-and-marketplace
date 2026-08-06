import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ onClose }) {
  const { login, signup, firebaseConfigured } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
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
      setError(err.message?.replace('Firebase: ', '') || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  const isPasswordWeak = password.length > 0 && password.length < 6;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={() => { if (!loading) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl relative shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Decorative gradient header */}
        <div className="h-2 w-full bg-gradient-to-r from-[var(--sell)] via-[var(--accent)] to-[var(--upgrade)]"></div>
        
        <div className="p-6 md:p-8 space-y-6 bg-[var(--surface)]">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-[var(--text)]">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                {mode === 'login' ? 'Sign in to your account' : 'Join the marketplace'}
              </p>
            </div>
            <button
              onClick={() => { if (!loading) onClose(); }}
              disabled={loading}
              className="btn btn-ghost p-1 text-xl leading-none text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          {!firebaseConfigured && (
            <div className="flex gap-3 bg-[var(--repair-dim)] p-3 rounded-lg border border-[var(--repair)]/30">
              <span className="text-[var(--repair)]">⚠</span>
              <p className="text-xs text-[var(--repair)] leading-relaxed">
                Sandbox mode active. Firebase is not configured, so any credentials will be accepted (min 6 chars).
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="auth-email" className="block text-sm font-medium text-[var(--text)]">Email address</label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full text-base py-2.5"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="auth-password" className="block text-sm font-medium text-[var(--text)]">Password</label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full text-base py-2.5"
                placeholder="••••••••"
              />
              {mode === 'signup' && isPasswordWeak && (
                <p className="text-xs text-[var(--recycle)] mt-1">Password must be at least 6 characters.</p>
              )}
            </div>

            {error && <p className="text-sm text-[var(--recycle)] bg-[var(--recycle-dim)] p-2 rounded">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center text-sm py-3 mt-2 font-semibold shadow-md transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                  </svg>
                  Processing…
                </span>
              ) : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
