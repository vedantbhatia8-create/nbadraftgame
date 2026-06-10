import { useState, useEffect, useRef } from 'react';
import { TEAMS, DECADES, POSITIONS, teamByAbbr, decadeById } from './data/teams';
import { rosterFor } from './data/players';
import { projectWins, evaluatePick, finalVerdict, effectiveRating } from './scoring';
import {
  BasketballIcon, Reel, PlayerRow, Slot, Host, SearchIcon,
  ModeSelect, MiniGame,
} from './components';
import AuthScreen from './AuthScreen';
import AdminDashboard, { isAdmin } from './AdminDashboard';
import { supabase, saveGame, getProfile } from './lib/supabase';

const ACCENTS = ["#FF6A1A", "#2D8CFF"];
const GM_NAMES = ["GM ONE", "GM TWO"];
const POS_LIST = POSITIONS;
const TOTAL_PICKS = 10; // 5 per player × 2 players
const STORE_KEY = "draftEra.v2";

function emptyLineup() {
  return { PG: null, SG: null, SF: null, PF: null, C: null };
}
function freshPlayers() {
  return [
    { name: GM_NAMES[0], lineup: emptyLineup(), lifelines: 3 },
    { name: GM_NAMES[1], lineup: emptyLineup(), lifelines: 3 },
  ];
}
function randInt(n) { return Math.floor(Math.random() * n); }

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.players || s.players.length !== 2 || !s.gameMode) return null;
    return s;
  } catch { return null; }
}

export default function App() {
  const saved = loadState();

  // Auth
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [banned, setBanned] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    if (!supabase) { setUser(null); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        const profile = await getProfile(u.id);
        if (profile?.is_banned) { setBanned(true); supabase.auth.signOut(); }
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setBanned(false);
      if (u) {
        const profile = await getProfile(u.id);
        if (profile?.is_banned) { setBanned(true); supabase.auth.signOut(); }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const [gameMode, setGameMode] = useState(saved?.gameMode ?? null);
  const [players, setPlayers] = useState(saved?.players ?? freshPlayers());
  const [turn, setTurn] = useState(saved?.turn ?? 0);
  const [phase, setPhase] = useState(() => {
    if (!saved?.gameMode) return 'spin';
    if (saved.turn >= TOTAL_PICKS) return 'gameover';
    return 'spin';
  });

  // Active picker: explicit state so contested mode can override turn%2
  const [activePicker, setActivePicker] = useState(saved?.activePicker ?? 0);

  // Spin state
  const [spinKey, setSpinKey] = useState(0);
  const [targets, setTargets] = useState({ t: randInt(TEAMS.length), d: randInt(DECADES.length) });
  const [current, setCurrent] = useState(null); // { abbr, decadeId }

  // Draft state
  const [selected, setSelected] = useState(null);
  const [lastEval, setLastEval] = useState(null);
  const [lastPlaced, setLastPlaced] = useState(null); // for contested second-pick exclusion

  // Contested mode extras
  const [contestWinner, setContestWinner] = useState(null); // 0 | 1
  const [contestSecond, setContestSecond] = useState(false);
  const [excludedPlayer, setExcludedPlayer] = useState(null);

  // UI
  const [host, setHost] = useState("Welcome to Draft Era. Spin the era wheel.");
  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [showCandidates, setShowCandidates] = useState(false);
  const [toast, setToast] = useState(null);
  const [justFilled, setJustFilled] = useState(null);

  const spinTimer = useRef(null);
  const toastTimer = useRef(null);
  const cpuTimer = useRef(null);

  // Persist state
  useEffect(() => {
    if (!gameMode) return;
    localStorage.setItem(STORE_KEY, JSON.stringify({ players, turn, gameMode, activePicker }));
  }, [players, turn, gameMode, activePicker]);

  useEffect(() => () => {
    clearTimeout(spinTimer.current);
    clearTimeout(toastTimer.current);
    clearTimeout(cpuTimer.current);
  }, []);

  // ── Derived ──────────────────────────────────────────────
  const fullRoster = current ? rosterFor(current.abbr, current.decadeId) : [];
  // In contested second pick, exclude what the winner already took
  const roster = (contestSecond && excludedPlayer)
    ? fullRoster.filter(p => !(p.n === excludedPlayer.n && p.t === excludedPlayer.t && p.d === excludedPlayer.d))
    : fullRoster;

  const filteredRoster = roster.filter(p => {
    if (posFilter !== "ALL" && p.p !== posFilter) return false;
    if (query.trim() && !p.n.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });
  const candidates = roster.slice(0, 3);
  const wins = players.map(p => projectWins(p.lineup));

  // ── CPU auto-pick (1P mode) ────────────────────────────
  useEffect(() => {
    if (gameMode !== '1p' || activePicker !== 1 || phase !== 'search' || !roster.length) return;
    cpuTimer.current = setTimeout(() => {
      const open = POS_LIST.filter(q => !players[1].lineup[q.id]);
      if (!open.length) return;
      let best = { eff: -1, player: null, pos: null };
      for (const p of roster) {
        for (const q of open) {
          const eff = effectiveRating(p, q.id);
          if (eff > best.eff) best = { eff, player: p, pos: q.id };
        }
      }
      if (best.player) {
        setHost(`CPU selects ${best.player.n} — sliding into the ${best.pos} slot.`);
        cpuTimer.current = setTimeout(() => makePickFor(1, best.player, best.pos), 700);
      }
    }, 1400);
    return () => clearTimeout(cpuTimer.current);
  }, [phase, activePicker, gameMode]); // eslint-disable-line

  // ── Helpers ───────────────────────────────────────────
  function flash(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1900);
  }

  function makePickFor(gmIdx, player, pos) {
    const ev = evaluatePick(player, pos, fullRoster);
    setPlayers(prev => prev.map((pl, i) => {
      if (i !== gmIdx) return pl;
      return { ...pl, lineup: { ...pl.lineup, [pos]: { player, eval: ev, slot: pos } } };
    }));
    setLastEval(ev);
    setLastPlaced(player);
    setHost(ev.call);
    setSelected(null);
    setJustFilled({ gm: gmIdx, pos });
    setPhase('result');
  }

  // ── Actions ───────────────────────────────────────────
  function doSpin() {
    if (phase === 'spinning') return;
    const t = randInt(TEAMS.length);
    const d = randInt(DECADES.length);
    setTargets({ t, d });
    setSpinKey(k => k + 1);
    setPhase('spinning');
    setSelected(null);
    setCurrent(null);
    setQuery(''); setPosFilter('ALL');
    setHost(`The reels are rolling for ${players[activePicker].name}…`);
    clearTimeout(spinTimer.current);
    spinTimer.current = setTimeout(() => {
      const team = TEAMS[t];
      const dec = DECADES[d];
      setCurrent({ abbr: team.abbr, decadeId: dec.id });
      const prizeName = `${team.city} ${team.name} · ${dec.label}`;
      if (gameMode === 'contest') {
        setPhase('minigame');
        setHost(`${prizeName} — play for first pick!`);
      } else {
        setPhase('search');
        setHost(`${team.city} ${team.name}, the ${dec.label}. Find your best available, ${players[activePicker].name}.`);
      }
    }, 3000);
  }

  function handleMiniGameResult(winner) {
    setContestWinner(winner);
    setContestSecond(false);
    setExcludedPlayer(null);
    setActivePicker(winner);
    setPhase('search');
    setHost(`${players[winner].name} picks first from this era!`);
  }

  function choosePlayer(p) {
    setSelected(p);
    setShowCandidates(false);
    setPhase('placing');
    setHost(`Locked on ${p.n}. Now slot them into your starting five.`);
  }

  function placeAt(pos) {
    if (!selected) return;
    makePickFor(activePicker, selected, pos);
  }

  function continueTurn() {
    setJustFilled(null);
    setLastEval(null);

    // Contested: after winner picks, switch to loser with same era
    if (gameMode === 'contest' && !contestSecond) {
      const loser = 1 - contestWinner;
      setContestSecond(true);
      setExcludedPlayer(lastPlaced);
      setActivePicker(loser);
      setTurn(t => t + 1);
      setPhase('search');
      setQuery(''); setPosFilter('ALL');
      setHost(`${players[loser].name} gets what's left from this era. Make it count.`);
      return;
    }

    // After second pick in contested, or any pick in standard/1P
    setContestSecond(false);
    setExcludedPlayer(null);
    setContestWinner(null);

    const nextTurn = turn + 1;
    setTurn(nextTurn);

    if (nextTurn >= TOTAL_PICKS) {
      setPhase('gameover');
      setHost("That's a wrap. Let's see who built the better ballclub.");
      // Persist game to Supabase if signed in
      if (user) {
        const nextPlayers = players; // already updated via setPlayers above
        const nextWins = nextPlayers.map(p => projectWins(p.lineup));
        saveGame({ userId: user.id, gameMode, players: nextPlayers, wins: nextWins });
      }
      return;
    }

    if (gameMode === 'contest') {
      setPhase('spin');
      setCurrent(null);
      setHost("New era on the line. Spin it!");
    } else {
      const next = nextTurn % 2;
      setActivePicker(next);
      setPhase('spin');
      setCurrent(null);
      if (gameMode === '1p' && next === 1) {
        setHost("CPU is on the clock…");
      } else {
        setHost(`${players[next].name} is on the clock. Spin the era wheel.`);
      }
    }
  }

  function useRespin() {
    if (players[activePicker].lifelines <= 0) { flash("No lifelines left"); return; }
    setPlayers(prev => prev.map((pl, i) =>
      i === activePicker ? { ...pl, lifelines: pl.lifelines - 1 } : pl
    ));
    flash("Lifeline used · Re-spin");
    setSelected(null); setCurrent(null);
    setPhase('spin');
    setHost(`Re-spin it. New team, new era for ${players[activePicker].name}.`);
  }

  function useNarrow() {
    if (players[activePicker].lifelines <= 0) { flash("No lifelines left"); return; }
    setPlayers(prev => prev.map((pl, i) =>
      i === activePicker ? { ...pl, lifelines: pl.lifelines - 1 } : pl
    ));
    flash("Lifeline used · Narrow it down");
    setShowCandidates(true);
  }

  function startGame(mode) {
    clearTimeout(spinTimer.current);
    clearTimeout(cpuTimer.current);
    setGameMode(mode);
    setPlayers(freshPlayers());
    setTurn(0);
    setActivePicker(0);
    setPhase('spin');
    setCurrent(null);
    setSelected(null);
    setLastEval(null);
    setLastPlaced(null);
    setJustFilled(null);
    setContestWinner(null);
    setContestSecond(false);
    setExcludedPlayer(null);
    const greet = mode === '1p'
      ? "You vs The CPU. GM One is on the clock — spin the era wheel."
      : mode === 'contest'
      ? "Contested Draft! Spin to reveal the era you'll both fight over."
      : "Head-to-head! GM One is on the clock — spin the era wheel.";
    setHost(greet);
  }

  function newGame() {
    clearTimeout(spinTimer.current);
    clearTimeout(cpuTimer.current);
    localStorage.removeItem(STORE_KEY);
    setGameMode(null);
    setPlayers(freshPlayers());
    setTurn(0);
    setActivePicker(0);
    setPhase('spin');
    setCurrent(null);
    setSelected(null);
    setLastEval(null);
    setLastPlaced(null);
    setJustFilled(null);
    setContestWinner(null);
    setContestSecond(false);
    setExcludedPlayer(null);
    setHost("Welcome to Draft Era.");
  }

  // ── Render ────────────────────────────────────────────
  if (user === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted-2)', fontFamily: 'var(--cond)', letterSpacing: 2, textTransform: 'uppercase', fontSize: 12 }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <AuthScreen bannedError={banned} />;
  }

  if (showAdmin && isAdmin(user)) {
    return <AdminDashboard user={user} onClose={() => setShowAdmin(false)} />;
  }

  if (!gameMode) {
    return (
      <ModeSelect
        onSelect={startGame}
        user={user}
        onSignOut={() => supabase?.auth.signOut()}
        onAdmin={isAdmin(user) ? () => setShowAdmin(true) : null}
      />
    );
  }

  const prizeName = current
    ? (() => { const tm = teamByAbbr(current.abbr); const dc = decadeById(current.decadeId); return `${tm.city} ${tm.name} · ${dc.label}`; })()
    : '';

  return (
    <div className="stage">
      <Topbar
        turn={turn} activeName={players[activePicker].name}
        activeAccent={ACCENTS[activePicker]} phase={phase}
        gameMode={gameMode} onNew={newGame}
        user={user} onSignOut={() => supabase?.auth.signOut()}
        onAdmin={isAdmin(user) ? () => setShowAdmin(true) : null}
      />

      <div className="body-grid">
        <TeamColumn
          gm={0} player={players[0]} accent={ACCENTS[0]} wins={wins[0]}
          active={activePicker === 0 && phase !== 'gameover'}
          placing={phase === 'placing' && activePicker === 0}
          justFilled={justFilled?.gm === 0 ? justFilled.pos : null}
          onPlace={placeAt}
        />

        <div className="col center">
          <Center
            phase={phase} players={players} activePicker={activePicker}
            targets={targets} spinKey={spinKey} current={current}
            roster={roster} filteredRoster={filteredRoster}
            query={query} setQuery={setQuery}
            posFilter={posFilter} setPosFilter={setPosFilter}
            selected={selected} host={host} lastEval={lastEval}
            onSpin={doSpin} onChoose={choosePlayer}
            onRespin={useRespin} onNarrow={useNarrow}
            onContinue={continueTurn}
            lifelines={players[activePicker].lifelines}
            accent={ACCENTS[activePicker]}
            isLastPick={turn === TOTAL_PICKS - 1 && (gameMode !== 'contest' || contestSecond)}
            gameMode={gameMode}
            contestSecond={contestSecond}
          />
        </div>

        <TeamColumn
          gm={1} player={players[1]} accent={ACCENTS[1]} wins={wins[1]} p2
          active={activePicker === 1 && phase !== 'gameover'}
          placing={phase === 'placing' && activePicker === 1}
          justFilled={justFilled?.gm === 1 ? justFilled.pos : null}
          onPlace={placeAt}
          isCpu={gameMode === '1p'}
        />
      </div>

      {phase === 'minigame' && current && (
        <MiniGame
          onResult={handleMiniGameResult}
          prizeName={prizeName}
          players={players}
        />
      )}
      {showCandidates && (
        <CandidatesModal candidates={candidates} onPick={choosePlayer} onClose={() => setShowCandidates(false)} />
      )}
      {phase === 'gameover' && (
        <GameOver players={players} wins={wins} onNew={newGame} gameMode={gameMode} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ---------- Topbar ---------- */
function Topbar({ turn, activeName, activeAccent, phase, gameMode, onNew, user, onSignOut, onAdmin }) {
  const isContest = gameMode === 'contest';
  const pickLabel = isContest ? 'ROUND' : 'PICK';
  const pickNum = isContest ? Math.floor(turn / 2) + 1 : Math.min(turn + 1, TOTAL_PICKS);
  const pickTotal = isContest ? 5 : TOTAL_PICKS;
  const modeLabel = gameMode === '1p' ? '1P vs CPU' : gameMode === 'contest' ? '⚡ Contested' : '2P Draft';

  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark"><BasketballIcon /></div>
        <div>
          <div className="brand-name">DRAFT <span className="em">ERA</span></div>
          <div className="brand-sub">Spin · Draft · Project</div>
        </div>
      </div>
      <div className="round-chip">{pickLabel} <b>{pickNum}</b> / {pickTotal}</div>
      <div className="round-chip" style={{ fontSize: 11, color: 'var(--muted-2)' }}>{modeLabel}</div>
      {phase !== 'gameover' && (
        <div className="round-chip" style={{ borderColor: activeAccent, color: activeAccent }}>
          ON THE CLOCK · <b style={{ color: activeAccent }}>{activeName}</b>
        </div>
      )}
      {phase !== 'gameover' && (
        <div className="mobile-clock" style={{ color: activeAccent }}>
          <b>{activeName}</b> on the clock
        </div>
      )}
      <button className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '8px 14px' }} onClick={onNew}>
        ← Modes
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontFamily: 'var(--cond)', fontSize: 11, color: 'var(--muted-2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.email}
        </div>
        {onAdmin && (
          <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 11, color: 'var(--gold)', borderColor: 'var(--gold)' }} onClick={onAdmin}>
            Admin
          </button>
        )}
        <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 11 }} onClick={onSignOut}>
          Sign Out
        </button>
      </div>
      <div className="live-pill"><span className="live-dot"></span>Live</div>
    </div>
  );
}

/* ---------- Team / lineup column ---------- */
function TeamColumn({ gm, player, accent, wins, active, placing, justFilled, onPlace, p2, isCpu }) {
  const filled = POS_LIST.filter(q => player.lineup[q.id]).length;
  return (
    <div className={"col" + (p2 ? " p2" : "")}>
      <div className={"team-header" + (active ? " active" : "")} style={{ "--accent": accent }}>
        <div className="gm-badge">{gm + 1}</div>
        <div className="gm-meta">
          <div className="gm-name">
            {player.name}
            {isCpu && <span style={{ fontFamily: 'var(--cond)', fontWeight: 600, fontSize: 10, letterSpacing: 2, color: 'var(--muted-2)', marginLeft: 8, textTransform: 'uppercase' }}>CPU</span>}
          </div>
          <div className="gm-label">{filled}/5 starters · {isCpu ? '—' : player.lifelines + ' lifelines'}</div>
        </div>
        <div className="wins-box">
          <div className="wins-num mono-num" style={{ color: accent }}>{wins == null ? "—" : wins}</div>
          <div className="wins-cap">82-game proj</div>
        </div>
      </div>
      <div className="lineup">
        {POS_LIST.map(q => (
          <Slot
            key={q.id} posId={q.id} posName={q.name}
            entry={player.lineup[q.id]}
            isTarget={placing && !player.lineup[q.id]}
            justFilled={justFilled === q.id}
            accent={accent}
            onClick={() => onPlace(q.id)}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- Center stage ---------- */
function Center(props) {
  const {
    phase, players, activePicker, targets, spinKey, current,
    roster, filteredRoster, query, setQuery, posFilter, setPosFilter,
    selected, host, lastEval, onSpin, onChoose, onRespin, onNarrow,
    onContinue, lifelines, accent, isLastPick, gameMode, contestSecond,
  } = props;

  const team = current ? teamByAbbr(current.abbr) : null;
  const dec = current ? decadeById(current.decadeId) : null;
  const showSearch = phase === 'search' || phase === 'placing';
  const isCpuTurn = gameMode === '1p' && activePicker === 1;
  // Hide lifelines in contested mode and when it's CPU's turn
  const showLifelines = gameMode !== 'contest' && !isCpuTurn;

  return (
    <div className="center-inner">
      {(phase === 'spin' || phase === 'spinning') && (
        <>
          <div className="reel-card">
            <div className="reel-title">
              {gameMode === 'contest' ? 'Spin for a Contested Era' : 'Spin the Era Wheel'}
            </div>
            <div className="reels">
              <Reel items={TEAMS} target={targets.t} spinKey={spinKey} kind="team" durationMs={2300} />
              <Reel items={DECADES} target={targets.d} spinKey={spinKey} kind="decade" durationMs={2900} />
            </div>
            <div className="spin-row">
              <button className="btn btn-spin" onClick={onSpin} disabled={phase === 'spinning'}>
                {phase === 'spinning' ? 'Rolling…' : 'Spin'}
              </button>
            </div>
          </div>
          <Host text={host} />
          <div className="center-idle">
            <div className="big">{players[activePicker].name} on the clock</div>
            <div style={{ marginTop: 6, fontFamily: 'var(--cond)', letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 }}>
              {gameMode === 'contest'
                ? 'Both GMs draft from the same era'
                : 'Build your starting five · one player per spin'}
            </div>
          </div>
        </>
      )}

      {showSearch && team && (
        <>
          <div className="reel-card" style={{ padding: '14px 16px' }}>
            <div className="matchup-banner" style={{ "--accent": team.primary }}>
              {contestSecond && (
                <div style={{ fontFamily: 'var(--cond)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, fontSize: 10, color: 'var(--gold)', marginBottom: 4 }}>
                  ⚡ Second Pick — Same Era
                </div>
              )}
              <div className="mb-label">Draft your best available from</div>
              <div className="mb-main">
                <span className="mb-accent">{team.city} {team.name}</span> · {dec.label}
              </div>
            </div>
          </div>

          {phase === 'placing' && (
            <div className="picker-hint">Now click an open slot in {players[activePicker].name}'s lineup →</div>
          )}

          {isCpuTurn && phase === 'search' && (
            <div className="cpu-thinking">CPU is thinking…</div>
          )}

          {!isCpuTurn && (
            <div className="search-wrap" style={{ border: '1px solid var(--line)', borderRadius: 14, background: 'var(--panel)', minHeight: 0 }}>
              <div className="search-controls">
                <div className="pos-filter">
                  {["ALL", "PG", "SG", "SF", "PF", "C"].map(pf => (
                    <button key={pf} className={"pf-btn" + (posFilter === pf ? " active" : "")} onClick={() => setPosFilter(pf)}>{pf}</button>
                  ))}
                </div>
                <div className="search-input-wrap">
                  <SearchIcon />
                  <input className="search-input" placeholder="Search players…" value={query} onChange={e => setQuery(e.target.value)} />
                </div>
              </div>
              <div className="roster-count">{filteredRoster.length} player{filteredRoster.length === 1 ? "" : "s"} available</div>
              <div className="player-list">
                {filteredRoster.length === 0 ? (
                  <div className="list-empty">No players match</div>
                ) : (
                  filteredRoster.map((p, i) => (
                    <PlayerRow key={p.n + i} player={p} selected={selected?.n === p.n} onClick={() => onChoose(p)} />
                  ))
                )}
              </div>
            </div>
          )}

          {showLifelines && (
            <div className="spin-row">
              <button className="btn btn-lifeline" onClick={onRespin} disabled={lifelines <= 0}>
                ↻ Re-spin <span className="ll-count">({lifelines})</span>
              </button>
              <button className="btn btn-lifeline" onClick={onNarrow} disabled={lifelines <= 0}>
                ◎ Narrow it down <span className="ll-count">({lifelines})</span>
              </button>
            </div>
          )}
          <Host text={host} />
        </>
      )}

      {phase === 'result' && lastEval && (
        <>
          <div className="reel-card" style={{ textAlign: 'center' }}>
            <div className="reel-title">The Booth's Verdict</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 72, lineHeight: 0.9, color: lastEval.gradeColor }}>{lastEval.grade}</div>
            <div style={{ fontFamily: 'var(--cond)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, fontSize: 11, color: 'var(--muted-2)', marginTop: 4 }}>
              Pick grade · fit {Math.round(lastEval.fit * 100)}%
            </div>
          </div>
          <Host text={host} grade={lastEval.grade} gradeColor={lastEval.gradeColor} />
          <div className="spin-row">
            <button className="btn btn-spin" onClick={onContinue}>
              {isLastPick ? "See Final Result →" : "Next Pick →"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Candidates modal ---------- */
function CandidatesModal({ candidates, onPick, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Narrow It Down</div>
        <div className="modal-sub">The Booth surfaces the three biggest names of the era</div>
        <div className="cand-grid">
          {candidates.map((p, i) => (
            <PlayerRow key={p.n + i} player={p} onClick={() => onPick(p)} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Game over ---------- */
function GameOver({ players, wins, onNew, gameMode }) {
  const a = wins[0] ?? 0;
  const b = wins[1] ?? 0;
  const verdict = finalVerdict(a, b, players[0].name, players[1].name);
  const aWin = a > b, bWin = b > a;
  const modeNote = gameMode === '1p'
    ? "You vs The CPU"
    : gameMode === 'contest'
    ? "⚡ Contested Draft"
    : "Head-to-Head";

  return (
    <div className="overlay">
      <div className="modal gameover">
        <div style={{ textAlign: 'center' }}>
          <div className="modal-sub" style={{ color: 'var(--gold)' }}>Final Projection · {modeNote}</div>
          <div className="modal-title" style={{ fontSize: 34 }}>The Tape Doesn't Lie</div>
        </div>
        <div className="vs-final">
          <div className={"final-team" + (aWin ? " win" : "")}>
            <div style={{ fontFamily: 'var(--cond)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENTS[0] }}>{players[0].name}</div>
            <div className="final-wins" style={{ color: ACCENTS[0] }}>{a}</div>
            <div className="final-rec">{a}–{82 - a}</div>
          </div>
          <div className="vs-mid">VS</div>
          <div className={"final-team" + (bWin ? " win" : "")}>
            <div style={{ fontFamily: 'var(--cond)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENTS[1] }}>
              {players[1].name}
              {gameMode === '1p' && <span style={{ fontSize: 10, letterSpacing: 2, color: 'var(--muted-2)', display: 'block' }}>CPU</span>}
            </div>
            <div className="final-wins" style={{ color: ACCENTS[1] }}>{b}</div>
            <div className="final-rec">{b}–{82 - b}</div>
          </div>
        </div>
        <Host text={verdict} />
        <div className="spin-row" style={{ marginTop: 18 }}>
          <button className="btn btn-spin" onClick={onNew}>← Back to Modes</button>
        </div>
      </div>
    </div>
  );
}
