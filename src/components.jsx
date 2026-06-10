import { useRef, useState, useEffect } from 'react';

const ACCENTS = ["#FF6A1A", "#2D8CFF"];

export function BasketballIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="9.2" />
      <path d="M3 12h18M12 2.8v18.4" />
      <path d="M5.4 5.4C8 8 9 10 9 12s-1 4-3.6 6.6M18.6 5.4C16 8 15 10 15 12s1 4 3.6 6.6" />
    </svg>
  );
}

export function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#FFC53D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function Reel({ items, target, spinKey, kind, durationMs }) {
  const L = items.length;
  const itemH = 46;
  const COPIES = 18;
  const homeCopy = 3;
  const rest = (i) => 36 - (homeCopy * L + i) * itemH;

  const curIndexRef = useRef(target || 0);
  const [ty, setTy] = useState(rest(target || 0));
  const [trans, setTrans] = useState("none");

  useEffect(() => {
    if (!spinKey) return;
    const K = 6 + (spinKey % 3);
    const startI = curIndexRef.current;
    setTrans("none");
    setTy(rest(startI));
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setTrans(`transform ${durationMs}ms cubic-bezier(.1,.64,.2,1)`);
        setTy(36 - ((homeCopy + K) * L + target) * itemH);
      });
    });
    const t = setTimeout(() => {
      setTrans("none");
      setTy(rest(target));
      curIndexRef.current = target;
    }, durationMs + 40);
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);

  const strip = [];
  for (let c = 0; c < COPIES; c++) {
    for (let i = 0; i < L; i++) strip.push({ it: items[i], key: c + "-" + i });
  }

  return (
    <div className="reel">
      <div className="reel-window"></div>
      <div className="reel-strip" style={{ transform: `translateY(${ty}px)`, transition: trans }}>
        {strip.map(({ it, key }) =>
          kind === "team" ? (
            <div className="reel-item" key={key}>
              <span className="reel-swatch" style={{ background: it.primary, boxShadow: `0 0 8px -1px ${it.primary}` }}></span>
              <span className="ri-abbr">{it.abbr}</span>
              <span className="ri-city">{it.name}</span>
            </div>
          ) : (
            <div className="reel-item decade" key={key}>{it.short}</div>
          )
        )}
      </div>
    </div>
  );
}

export function PlayerRow({ player, selected, onClick }) {
  const stats = [
    ["PPG", player.ppg], ["RPG", player.rpg], ["APG", player.apg],
    ["SPG", player.spg], ["BPG", player.bpg],
  ];
  return (
    <div className={"player-row" + (selected ? " sel" : "")} onClick={onClick}>
      <div className="pr-pos">{player.p}</div>
      <div className="pr-main">
        <div className="pr-name">{player.n}</div>
        <div className="pr-meta">{player.t} · {player.d}</div>
      </div>
      <div className="pr-stats">
        {stats.map(([k, v]) => (
          <div className="pr-stat" key={k}>
            <div className="v mono-num">{v.toFixed(1)}</div>
            <div className="k">{k}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Slot({ posId, posName, entry, isTarget, justFilled, accent, onClick }) {
  const filled = !!entry;
  const cls = ["slot"];
  if (filled) cls.push("filled");
  else cls.push("empty");
  if (isTarget) cls.push("target");
  if (justFilled) cls.push("justfilled");
  return (
    <div className={cls.join(" ")} style={{ "--accent": accent }} onClick={isTarget ? onClick : undefined}>
      <div className="slot-pos">{posId}</div>
      <div className="slot-main">
        {filled ? (
          <>
            <div className="slot-name">{entry.player.n}</div>
            <div className="slot-sub">{entry.player.t} · {entry.player.d} · nat. {entry.player.p}</div>
          </>
        ) : (
          <>
            <div className="slot-name placeholder">{isTarget ? "Place here →" : posName}</div>
            <div className="slot-sub">{posId}</div>
          </>
        )}
      </div>
      {filled && <div className="slot-grade" style={{ color: entry.eval.gradeColor }}>{entry.eval.grade}</div>}
    </div>
  );
}

export function Host({ text, grade, gradeColor }) {
  return (
    <div className="host">
      <div className="host-avatar"><MicIcon /></div>
      <div className="host-body">
        <div className="host-name">
          The Booth
          {grade && <span className="host-grade-tag" style={{ color: gradeColor }}>{grade}</span>}
        </div>
        <div className="host-text">{text}</div>
      </div>
    </div>
  );
}

/* ============================================================
   MODE SELECT
   ============================================================ */
export function ModeSelect({ onSelect, user, onSignOut, onAdmin }) {
  const modes = [
    {
      key: '1p',
      icon: '👤',
      title: '1 Player',
      desc: 'Build your lineup against the CPU — The Booth auto-drafts for the other GM.',
      accent: ACCENTS[0],
    },
    {
      key: '2p',
      icon: '⚔️',
      title: '2 Players',
      desc: 'Classic head-to-head. Alternate spins and build your starting five.',
      accent: ACCENTS[1],
    },
    {
      key: 'contest',
      icon: '⚡',
      title: 'Contested',
      desc: 'Both GMs draft from the same era. Win a mini-game to pick first.',
      accent: '#FFC53D',
    },
  ];

  return (
    <div className="mode-select-overlay">
      <div style={{ width: 'min(860px, 96%)', textAlign: 'center' }}>
        {/* Auth row */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--cond)', fontSize: 11, color: 'var(--muted-2)' }}>{user?.email}</span>
            {onAdmin && (
              <button onClick={onAdmin}
                style={{ background: 'none', border: '1px solid var(--gold)', borderRadius: 8, padding: '5px 10px', color: 'var(--gold)', fontFamily: 'var(--cond)', fontWeight: 700, fontSize: 11, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>
                Admin
              </button>
            )}
            <button
              onClick={onSignOut}
              style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: '5px 10px', color: 'var(--muted-2)', fontFamily: 'var(--cond)', fontSize: 11, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>
              Sign Out
            </button>
          </div>
        </div>

        <div style={{ fontFamily: 'var(--cond)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 4, fontSize: 12, color: 'var(--muted-2)', marginBottom: 8 }}>
          NBA Decade Drafting Game
        </div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 52, textTransform: 'uppercase', lineHeight: 0.9, marginBottom: 6 }}>
          DRAFT <span style={{ color: 'var(--orange)' }}>ERA</span>
        </div>
        <div style={{ fontFamily: 'var(--cond)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 3, fontSize: 11, color: 'var(--muted-2)', marginBottom: 0 }}>
          Spin · Draft · Project
        </div>
        <div className="mode-grid">
          {modes.map(m => (
            <div key={m.key} className="mode-card" onClick={() => onSelect(m.key)}
              style={{ borderColor: 'var(--line)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = m.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
            >
              <div className="mc-icon">{m.icon}</div>
              <div className="mc-title" style={{ color: m.accent }}>{m.title}</div>
              <div className="mc-desc">{m.desc}</div>
              <div className="mc-cta" style={{ color: m.accent, borderColor: m.accent }}>Select</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MINI-GAME
   ============================================================ */
const MG_TYPES = ['reaction', 'rapid', 'coin'];
const MG_NAMES = { reaction: 'Reaction Race', rapid: 'Tap War', coin: 'Coin Flip' };
const MG_INSTRS = {
  reaction: 'Wait for GREEN — first to click wins. Click early = false start.',
  rapid: 'Tap as fast as you can for 3 seconds. Most taps wins.',
  coin: 'GM 1 calls it. The coin decides.',
};

export function MiniGame({ onResult, prizeName, players }) {
  const [type] = useState(() => MG_TYPES[Math.floor(Math.random() * MG_TYPES.length)]);
  const [winner, setWinner] = useState(null);
  const autoRef = useRef(null);

  function handleWinner(w) {
    setWinner(w);
    autoRef.current = setTimeout(() => onResult(w), 2200);
  }

  useEffect(() => () => clearTimeout(autoRef.current), []);

  return (
    <div className="overlay">
      <div className="modal mg-wrap">
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div className="mg-prize">⚡ Contested Pick · {prizeName}</div>
          <div className="mg-type">{MG_NAMES[type]}</div>
          <div className="mg-instr">{MG_INSTRS[type]}</div>
        </div>

        {winner !== null ? (
          <div className="mg-winner-banner">
            <div className="mg-winner-label">Picks First</div>
            <div className="mg-winner-name" style={{ color: ACCENTS[winner] }}>{players[winner].name}</div>
            <div className="mg-winner-sub">Drafting from {prizeName} · Starting in 2s…</div>
          </div>
        ) : (
          <>
            {type === 'reaction' && <ReactionGame onWin={handleWinner} players={players} />}
            {type === 'rapid'    && <RapidGame    onWin={handleWinner} players={players} />}
            {type === 'coin'     && <CoinGame     onWin={handleWinner} players={players} />}
          </>
        )}
      </div>
    </div>
  );
}

/* ---- Reaction Race ---- */
function ReactionGame({ onWin, players }) {
  const [phase, setPhase] = useState('wait'); // wait | go | done
  const [result, setResult] = useState(null); // { winner, msg }
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setPhase('go'), 1400 + Math.random() * 2600);
    return () => clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!result) return;
    onWin(result.winner);
  }, [result]); // eslint-disable-line

  // Keyboard support: Q = P1, P = P2
  useEffect(() => {
    const handler = (e) => {
      if (e.repeat) return;
      if (e.key === 'q' || e.key === 'Q') doClick(0);
      if (e.key === 'p' || e.key === 'P') doClick(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }); // re-bind every render so phase/result are current

  function doClick(player) {
    if (result) return;
    clearTimeout(timerRef.current);
    if (phase === 'go') {
      setPhase('done');
      setResult({ winner: player, msg: `${players[player].name} reacted fastest!` });
    } else {
      // False start
      const other = 1 - player;
      setPhase('done');
      setResult({ winner: other, msg: `False start by ${players[player].name}!` });
    }
  }

  const btnClass = (p) => {
    if (!result) return phase === 'go' ? 'ready' : 'idle';
    if (result.winner === p) return 'win';
    return phase === 'done' && result.winner !== p ? 'false-start' : 'lose';
  };

  return (
    <div>
      <div className="mg-arena">
        <div className="mg-side">
          <div className="mg-gm-label" style={{ color: ACCENTS[0] }}>{players[0].name} · Q key</div>
          <button className={`mg-btn ${btnClass(0)}`} onClick={() => doClick(0)}>
            {result?.winner === 0 ? '✓ GOT IT' : result ? '✗ MISS' : 'CLICK'}
          </button>
        </div>
        <div className="mg-mid">
          <div className={`mg-signal ${phase === 'go' ? 'green' : phase === 'done' ? 'wait' : 'red'}`} />
          <div className="mg-go-text">{phase === 'go' ? 'GO!' : phase === 'wait' ? 'Wait…' : ''}</div>
        </div>
        <div className="mg-side">
          <div className="mg-gm-label" style={{ color: ACCENTS[1] }}>{players[1].name} · P key</div>
          <button className={`mg-btn ${btnClass(1)}`} onClick={() => doClick(1)}>
            {result?.winner === 1 ? '✓ GOT IT' : result ? '✗ MISS' : 'CLICK'}
          </button>
        </div>
      </div>
      {result && (
        <div style={{ textAlign: 'center', fontFamily: 'var(--cond)', fontWeight: 700, fontSize: 14, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
          {result.msg}
        </div>
      )}
    </div>
  );
}

/* ---- Tap War ---- */
function RapidGame({ onWin, players }) {
  const [phase, setPhase] = useState('countdown'); // countdown | go | done
  const [countdown, setCountdown] = useState(3);
  const [clicks, setClicks] = useState([0, 0]);
  const [pct, setPct] = useState(100);
  const clicksRef = useRef([0, 0]);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const DURATION = 3000;

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
    setPhase('go');
  }, [countdown]);

  useEffect(() => {
    if (phase !== 'go') return;
    startRef.current = Date.now();
    function tick() {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 1 - elapsed / DURATION);
      setPct(remaining * 100);
      if (remaining <= 0) {
        setPhase('done');
        const [c0, c1] = clicksRef.current;
        onWin(c0 >= c1 ? 0 : 1);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]); // eslint-disable-line

  useEffect(() => {
    if (phase !== 'go') return;
    const handler = (e) => {
      if (e.key === 'q' || e.key === 'Q') tap(0);
      if (e.key === 'p' || e.key === 'P') tap(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase]); // eslint-disable-line

  function tap(player) {
    if (phase !== 'go') return;
    clicksRef.current[player]++;
    setClicks([clicksRef.current[0], clicksRef.current[1]]);
  }

  const maxC = Math.max(clicks[0], clicks[1], 1);

  if (phase === 'countdown') {
    return (
      <div className="mg-countdown-big" style={{ color: 'var(--orange)' }}>
        {countdown > 0 ? countdown : 'GO!'}
      </div>
    );
  }

  return (
    <div>
      <div className="mg-arena">
        <div className="mg-side">
          <div className="mg-gm-label" style={{ color: ACCENTS[0] }}>{players[0].name} · Q key</div>
          <button
            className={`mg-btn ${phase === 'go' ? 'ready' : clicks[0] > clicks[1] ? 'win' : 'lose'}`}
            onClick={() => tap(0)}
          >
            <div className="mg-tap-count">{clicks[0]}</div>
            <div style={{ fontSize: 12, fontFamily: 'var(--cond)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted-2)' }}>taps</div>
          </button>
          <div className="mg-tap-bar-wrap" style={{ marginTop: 8 }}>
            <div className="mg-tap-bar" style={{ width: `${(clicks[0] / maxC) * 100}%`, background: ACCENTS[0] }} />
          </div>
        </div>
        <div className="mg-mid">
          <div className="mg-timer-ring" style={{ fontSize: 28, color: pct > 33 ? 'var(--green)' : pct > 10 ? 'var(--gold)' : 'var(--red)' }}>
            {phase === 'go' ? (pct / 33.33).toFixed(1) + 's' : 'DONE'}
          </div>
          <div className="mg-go-text" style={{ marginTop: 6 }}>{phase === 'go' ? 'TAP!' : ''}</div>
        </div>
        <div className="mg-side">
          <div className="mg-gm-label" style={{ color: ACCENTS[1] }}>{players[1].name} · P key</div>
          <button
            className={`mg-btn ${phase === 'go' ? 'ready' : clicks[1] > clicks[0] ? 'win' : 'lose'}`}
            onClick={() => tap(1)}
          >
            <div className="mg-tap-count">{clicks[1]}</div>
            <div style={{ fontSize: 12, fontFamily: 'var(--cond)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted-2)' }}>taps</div>
          </button>
          <div className="mg-tap-bar-wrap" style={{ marginTop: 8 }}>
            <div className="mg-tap-bar" style={{ width: `${(clicks[1] / maxC) * 100}%`, background: ACCENTS[1] }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Coin Flip ---- */
function CoinGame({ onWin, players }) {
  const [phase, setPhase] = useState('call'); // call | flip | reveal
  const [call, setCall] = useState(null); // 'H' | 'T'
  const [landed, setLanded] = useState(null);
  const timerRef = useRef(null);

  function makeCall(choice) {
    setCall(choice);
    setPhase('flip');
    timerRef.current = setTimeout(() => {
      const result = Math.random() < 0.5 ? 'H' : 'T';
      setLanded(result);
      setPhase('reveal');
      onWin(result === choice ? 0 : 1);
    }, 1800);
  }

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div>
      {phase === 'call' && (
        <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
          <div className="mg-call-label" style={{ color: ACCENTS[0] }}>{players[0].name} calls it →</div>
          <div className="mg-call-btns">
            <button className="mg-call-btn" onClick={() => makeCall('H')}>🟡 Heads</button>
            <button className="mg-call-btn" onClick={() => makeCall('T')}>⚪ Tails</button>
          </div>
        </div>
      )}
      {phase === 'flip' && (
        <div style={{ textAlign: 'center', padding: '14px 0' }}>
          <span className="mg-coin flipping">🪙</span>
          <div className="mg-go-text" style={{ marginTop: 8 }}>Flipping…</div>
        </div>
      )}
      {phase === 'reveal' && (
        <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
          <span className="mg-coin">{landed === 'H' ? '🟡' : '⚪'}</span>
          <div className="mg-result-reveal">{landed === 'H' ? 'Heads' : 'Tails'}</div>
          <div style={{ fontFamily: 'var(--cond)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted-2)' }}>
            {players[0].name} called {call === 'H' ? 'heads' : 'tails'} ·{' '}
            {landed === call ? players[0].name + ' wins' : players[1].name + ' wins'}
          </div>
        </div>
      )}
    </div>
  );
}
