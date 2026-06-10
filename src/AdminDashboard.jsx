import { useState, useEffect } from 'react';
import { getAllUsers, setBanned } from './lib/supabase';
import { BasketballIcon } from './components';

const ADMIN_EMAIL = 'vedantbhatia8@gmail.com';

export function isAdmin(user) {
  const email = user?.email || user?.user_metadata?.email;
  return email === ADMIN_EMAIL;
}

export default function AdminDashboard({ user, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // userId being toggled

  useEffect(() => {
    getAllUsers().then(data => { setUsers(data); setLoading(false); });
  }, []);

  async function toggleBan(u) {
    setBusy(u.id);
    const err = await setBanned(u.id, !u.is_banned);
    if (!err) {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_banned: !x.is_banned } : x));
    }
    setBusy(null);
  }

  const banned = users.filter(u => u.is_banned).length;
  const total = users.length;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      zIndex: 1000, overflowY: 'auto', padding: '24px 20px',
    }}>
      {/* Header */}
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <div style={{ width: 28, height: 28 }}><BasketballIcon /></div>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 24, textTransform: 'uppercase', lineHeight: 1 }}>
              DRAFT <span style={{ color: 'var(--orange)' }}>ERA</span>
              <span style={{ fontFamily: 'var(--cond)', fontSize: 12, letterSpacing: 3, color: 'var(--gold)', marginLeft: 12, verticalAlign: 'middle' }}>ADMIN</span>
            </div>
            <div style={{ fontFamily: 'var(--cond)', fontSize: 11, color: 'var(--muted-2)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>
              {user.email}
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ marginLeft: 'auto', padding: '8px 16px' }}
          >
            ← Back to Game
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Users', value: total },
            { label: 'Banned', value: banned, color: banned > 0 ? '#FF5A5A' : undefined },
            { label: 'Active', value: total - banned, color: 'var(--green)' },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, background: 'var(--panel)', border: '1px solid var(--line)',
              borderRadius: 12, padding: '14px 18px',
            }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 32, lineHeight: 1, color: s.color ?? 'var(--text)' }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--cond)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--muted-2)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* User table */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--cond)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, fontSize: 11, color: 'var(--muted-2)' }}>
            All Users
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--cond)', color: 'var(--muted-2)', letterSpacing: 2, fontSize: 12, textTransform: 'uppercase' }}>
              Loading…
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--cond)', color: 'var(--muted-2)', fontSize: 12 }}>
              No users yet
            </div>
          ) : (
            users.map((u, i) => {
              const isYou = u.email === ADMIN_EMAIL;
              return (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 20px',
                  borderBottom: i < users.length - 1 ? '1px solid var(--line)' : 'none',
                  background: u.is_banned ? 'rgba(255,90,90,0.05)' : 'transparent',
                  opacity: u.is_banned ? 0.7 : 1,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email ?? '—'}
                      </div>
                      {isYou && (
                        <span style={{ fontFamily: 'var(--cond)', fontWeight: 700, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 4, padding: '2px 5px' }}>
                          You
                        </span>
                      )}
                      {u.is_banned && (
                        <span style={{ fontFamily: 'var(--cond)', fontWeight: 700, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#FF5A5A', border: '1px solid #FF5A5A', borderRadius: 4, padding: '2px 5px' }}>
                          Banned
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--cond)', fontSize: 11, color: 'var(--muted-2)', marginTop: 3, letterSpacing: 1 }}>
                      Joined {new Date(u.created_at).toLocaleDateString()}
                      {u.last_played
                        ? ` · Last played ${new Date(u.last_played).toLocaleDateString()}`
                        : ' · Never played'}
                    </div>
                  </div>

                  {!isYou && (
                    <button
                      onClick={() => toggleBan(u)}
                      disabled={busy === u.id}
                      style={{
                        background: 'none',
                        border: `1px solid ${u.is_banned ? 'var(--green)' : '#FF5A5A'}`,
                        borderRadius: 8,
                        padding: '6px 14px',
                        color: u.is_banned ? 'var(--green)' : '#FF5A5A',
                        fontFamily: 'var(--cond)',
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 1.5,
                        cursor: busy === u.id ? 'not-allowed' : 'pointer',
                        opacity: busy === u.id ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {busy === u.id ? '…' : u.is_banned ? 'Unban' : 'Ban'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
