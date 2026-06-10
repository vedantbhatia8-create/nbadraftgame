import { useState } from 'react';
import { supabase } from './lib/supabase';
import { BasketballIcon } from './components';

export default function AuthScreen({ onGuest }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function handleGoogle() {
    if (!supabase) { setError('Supabase not configured.'); return; }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://nbadraftgame.vercel.app' },
    });
    if (err) { setError(err.message); setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase) { setError('Supabase not configured.'); return; }
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (mode === 'signup') {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) setError(err.message);
      else setSuccess('Check your email to confirm your account, then sign in.');
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="mode-select-overlay">
      <div style={{ width: 'min(440px, 94%)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32 }}><BasketballIcon /></div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 32, textTransform: 'uppercase', lineHeight: 1 }}>
            DRAFT <span style={{ color: 'var(--orange)' }}>ERA</span>
          </div>
        </div>

        <div style={{
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: 16,
          padding: '28px 28px 24px',
          textAlign: 'left',
        }}>
          <div style={{ fontFamily: 'var(--cond)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3, fontSize: 11, color: 'var(--muted-2)', marginBottom: 18, textAlign: 'center' }}>
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </div>

          <button onClick={handleGoogle} disabled={loading} style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '11px 16px',
            background: 'transparent',
            border: '1px solid var(--line)',
            borderRadius: 10,
            color: 'var(--text)',
            fontFamily: 'var(--body)',
            fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 16,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <div style={{ fontFamily: 'var(--cond)', fontSize: 11, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: 1 }}>or</div>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--cond)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 10, color: 'var(--muted-2)', marginBottom: 6 }}>
                  Email
                </label>
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--bg)', border: '1px solid var(--line)',
                    borderRadius: 8, padding: '10px 14px',
                    color: 'var(--text)', fontFamily: 'var(--body)', fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--cond)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 10, color: 'var(--muted-2)', marginBottom: 6 }}>
                  Password
                </label>
                <input
                  type="password" required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--bg)', border: '1px solid var(--line)',
                    borderRadius: 8, padding: '10px 14px',
                    color: 'var(--text)', fontFamily: 'var(--body)', fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 12, fontFamily: 'var(--body)', fontSize: 13, color: '#FF5A5A', background: 'rgba(255,90,90,0.1)', border: '1px solid rgba(255,90,90,0.3)', borderRadius: 8, padding: '8px 12px' }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ marginTop: 12, fontFamily: 'var(--body)', fontSize: 13, color: 'var(--green)', background: 'rgba(43,213,118,0.1)', border: '1px solid rgba(43,213,118,0.3)', borderRadius: 8, padding: '8px 12px' }}>
                {success}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="btn btn-spin"
              style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
            >
              {loading ? 'Loading…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: 14, textAlign: 'center', fontFamily: 'var(--cond)', fontSize: 12, color: 'var(--muted-2)' }}>
            {mode === 'signin' ? (
              <>No account?{' '}
                <button onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--orange)', fontFamily: 'var(--cond)', fontWeight: 700, fontSize: 12, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Sign Up
                </button>
              </>
            ) : (
              <>Already have one?{' '}
                <button onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--orange)', fontFamily: 'var(--cond)', fontWeight: 700, fontSize: 12, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>

        <button
          onClick={onGuest}
          style={{
            marginTop: 16,
            background: 'none',
            border: 'none',
            color: 'var(--muted-2)',
            fontFamily: 'var(--cond)',
            fontWeight: 600,
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: 2,
            cursor: 'pointer',
            padding: '8px 0',
          }}
        >
          Continue as Guest →
        </button>
      </div>
    </div>
  );
}
