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
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel max-w-sm rounded-[var(--radius-md)] relative tech-bracket"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6 md:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <h2 className="font-mono text-xs tracking-wider text-[var(--accent)] uppercase font-semibold">
                {mode === 'login' ? 'SIGN_IN' : 'CREATE_ACCOUNT'}
              </h2>
            </div>
            <button onClick={onClose} className="btn btn-ghost p-1 text-xs font-mono" aria-label="Close modal">
              ✕
            </button>
          </div>

          {!firebaseConfigured && (
            <p className="font-mono text-[9px] text-[var(--repair)] bg-[var(--repair-dim)] p-3 rounded-[var(--radius-sm)] leading-relaxed border border-[var(--repair)]/30">
              [WARN: AUTH_CLIENT_OFFLINE] Sandbox mode active. Any credentials accepted (min 6 chars).
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="auth-email" className="block font-mono text-[9px] uppercase text-[var(--text-dim)]">[USER_EMAIL]</label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field font-mono text-xs uppercase"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="auth-password" className="block font-mono text-[9px] uppercase text-[var(--text-dim)]">[USER_PASSWORD]</label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field font-mono text-xs"
                placeholder="••••••"
              />
              {mode === 'signup' && isPasswordWeak && (
                <p className="font-mono text-[8px] text-[var(--recycle)] uppercase">[ERROR: WEAK_PASSWD_MIN_6_CHAR]</p>
              )}
            </div>

            {error && <p className="font-mono text-xs text-[var(--recycle)]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-warm w-full justify-center text-xs"
            >
              {loading ? 'PROCESSING...' : mode === 'login' ? 'SUBMIT: SIGN_IN' : 'SUBMIT: CREATE_ACCOUNT'}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="w-full text-center font-mono text-[9px] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors mt-2"
          >
            {mode === 'login' ? "[ACTION: SWITCH_TO_SIGNUP]" : "[ACTION: SWITCH_TO_LOGIN]"}
          </button>
        </div>
      </div>
    </div>
  );
}
