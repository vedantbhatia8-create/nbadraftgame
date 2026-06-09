import { useState, useEffect, useRef } from 'react';
import { TEAMS, DECADES, POSITIONS, teamByAbbr, decadeById } from './data/teams';
import { rosterFor } from './data/players';
import { projectWins, evaluatePick, finalVerdict } from './scoring';
import { BasketballIcon, Reel, PlayerRow, Slot, Host, SearchIcon } from './components';

const ACCENTS = ["#FF6A1A", "#2D8CFF"];
const GM_NAMES = ["GM ONE", "GM TWO"];
const POS_LIST = POSITIONS;
const TOTAL_PICKS = 10;
const STORE_KEY = "draftEra.v1";

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
    if (!s.players || s.players.length !== 2) return null;
    return s;
  } catch (e) { return null; }
}

export default function App() {
  const saved = loadState();
  const [players, setPlayers] = useState(saved ? saved.players : freshPlayers());
  const [turn, setTurn] = useState(saved ? saved.turn : 0);
  const [phase, setPhase] = useState(saved && saved.turn >= TOTAL_PICKS ? "gameover" : "spin");

  const [spinKey, setSpinKey] = useState(0);
  const [targets, setTargets] = useState({ t: randInt(TEAMS.length), d: randInt(DECADES.length) });
  const [current, setCurrent] = useState(null);
  const [selected, setSelected] = useState(null);
  const [lastEval, setLastEval] = useState(null);
  const [host, setHost] = useState("Welcome to Draft Era. GM One is on the clock — spin the era wheel.");

  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [showCandidates, setShowCandidates] = useState(false);
  const [toast, setToast] = useState(null);
  const [justFilled, setJustFilled] = useState(null);

  const spinTimer = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify({ players, turn }));
  }, [players, turn]);

  useEffect(() => () => {
    clearTimeout(spinTimer.current);
    clearTimeout(toastTimer.current);
  }, []);

  const activeGM = turn % 2;
  const roster = current ? rosterFor(current.abbr, current.decadeId) : [];

  function flash(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1900);
  }

  function doSpin() {
    if (phase === "spinning") return;
    const t = randInt(TEAMS.length);
    const d = randInt(DECADES.length);
    setTargets({ t, d });
    setSpinKey((k) => k + 1);
    setPhase("spinning");
    setSelected(null);
    setCurrent(null);
    setQuery(""); setPosFilter("ALL");
    setHost("The reels are rolling for " + players[activeGM].name + "…");
    clearTimeout(spinTimer.current);
    spinTimer.current = setTimeout(() => {
      const team = TEAMS[t];
      const dec = DECADES[d];
      setCurrent({ abbr: team.abbr, decadeId: dec.id });
      setPhase("search");
      setHost(team.city + " " + team.name + ", the " + dec.label + ". Find your best available, " + players[activeGM].name + ".");
    }, 3000);
  }

  function choosePlayer(p) {
    setSelected(p);
    setShowCandidates(false);
    setPhase("placing");
    setHost("Locked on " + p.n + ". Now slot him into your starting five.");
  }

  function placeAt(pos) {
    if (!selected) return;
    const ev = evaluatePick(selected, pos, roster);
    setPlayers((prev) => {
      return prev.map((pl, i) => {
        if (i !== activeGM) return pl;
        const lineup = { ...pl.lineup, [pos]: { player: selected, eval: ev, slot: pos } };
        return { ...pl, lineup };
      });
    });
    setLastEval(ev);
    setHost(ev.call);
    setSelected(null);
    setJustFilled({ gm: activeGM, pos });
    setPhase("result");
  }

  function continueTurn() {
    setJustFilled(null);
    setLastEval(null);
    const nextTurn = turn + 1;
    setTurn(nextTurn);
    if (nextTurn >= TOTAL_PICKS) {
      setPhase("gameover");
      setHost("That's a wrap. Let's see who built the better ballclub.");
    } else {
      setPhase("spin");
      setCurrent(null);
      setHost(players[nextTurn % 2].name + " is on the clock. Spin the era wheel.");
    }
  }

  function useRespin() {
    if (players[activeGM].lifelines <= 0) { flash("No lifelines left"); return; }
    setPlayers((prev) => prev.map((pl, i) =>
      i === activeGM ? { ...pl, lifelines: pl.lifelines - 1 } : pl
    ));
    flash("Lifeline used · Re-spin");
    setSelected(null);
    setCurrent(null);
    setPhase("spin");
    setHost("Re-spin it. New team, new era for " + players[activeGM].name + ".");
  }

  function useNarrow() {
    if (players[activeGM].lifelines <= 0) { flash("No lifelines left"); return; }
    setPlayers((prev) => prev.map((pl, i) =>
      i === activeGM ? { ...pl, lifelines: pl.lifelines - 1 } : pl
    ));
    flash("Lifeline used · Narrow it down");
    setShowCandidates(true);
  }

  function newGame() {
    clearTimeout(spinTimer.current);
    setPlayers(freshPlayers());
    setTurn(0);
    setPhase("spin");
    setCurrent(null);
    setSelected(null);
    setLastEval(null);
    setJustFilled(null);
    setHost("Fresh draft board. GM One is on the clock — spin the era wheel.");
  }

  const wins = players.map((p) => projectWins(p.lineup));

  const filteredRoster = roster.filter((p) => {
    if (posFilter !== "ALL" && p.p !== posFilter) return false;
    if (query.trim() && p.n.toLowerCase().indexOf(query.trim().toLowerCase()) === -1) return false;
    return true;
  });
  const candidates = roster.slice(0, 3);

  return (
    <div className="stage">
      <Topbar turn={turn} activeName={players[activeGM].name} activeAccent={ACCENTS[activeGM]} phase={phase} onNew={newGame} />

      <div className="body-grid">
        <TeamColumn
          gm={0} player={players[0]} accent={ACCENTS[0]} wins={wins[0]}
          active={activeGM === 0 && phase !== "gameover"}
          placing={phase === "placing" && activeGM === 0}
          justFilled={justFilled && justFilled.gm === 0 ? justFilled.pos : null}
          onPlace={placeAt}
        />

        <div className="col center">
          <Center
            phase={phase}
            players={players} activeGM={activeGM}
            targets={targets} spinKey={spinKey} current={current}
            roster={roster} filteredRoster={filteredRoster}
            query={query} setQuery={setQuery}
            posFilter={posFilter} setPosFilter={setPosFilter}
            selected={selected}
            host={host} lastEval={lastEval}
            onSpin={doSpin} onChoose={choosePlayer}
            onRespin={useRespin} onNarrow={useNarrow}
            onContinue={continueTurn}
            lifelines={players[activeGM].lifelines}
            accent={ACCENTS[activeGM]}
            isLastPick={turn === TOTAL_PICKS - 1}
          />
        </div>

        <TeamColumn
          gm={1} player={players[1]} accent={ACCENTS[1]} wins={wins[1]} p2
          active={activeGM === 1 && phase !== "gameover"}
          placing={phase === "placing" && activeGM === 1}
          justFilled={justFilled && justFilled.gm === 1 ? justFilled.pos : null}
          onPlace={placeAt}
        />
      </div>

      {showCandidates && (
        <CandidatesModal candidates={candidates} onPick={choosePlayer} onClose={() => setShowCandidates(false)} />
      )}
      {phase === "gameover" && (
        <GameOver players={players} wins={wins} onNew={newGame} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Topbar({ turn, activeName, activeAccent, phase, onNew }) {
  const pickNo = Math.min(turn + 1, TOTAL_PICKS);
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark"><BasketballIcon /></div>
        <div>
          <div className="brand-name">DRAFT <span className="em">ERA</span></div>
          <div className="brand-sub">Spin · Draft · Project</div>
        </div>
      </div>
      <div className="round-chip">PICK <b>{pickNo}</b> / {TOTAL_PICKS}</div>
      {phase !== "gameover" && (
        <div className="round-chip" style={{ borderColor: activeAccent, color: activeAccent }}>
          ON THE CLOCK · <b style={{ color: activeAccent }}>{activeName}</b>
        </div>
      )}
      <button className="btn btn-ghost" style={{ marginLeft: "auto", padding: "8px 14px" }} onClick={onNew}>New Game</button>
      <div className="live-pill"><span className="live-dot"></span>Live</div>
    </div>
  );
}

function TeamColumn({ gm, player, accent, wins, active, placing, justFilled, onPlace, p2 }) {
  const filled = POS_LIST.filter((q) => player.lineup[q.id]).length;
  return (
    <div className={"col" + (p2 ? " p2" : "")}>
      <div className={"team-header" + (active ? " active" : "")} style={{ "--accent": accent }}>
        <div className="gm-badge">{gm + 1}</div>
        <div className="gm-meta">
          <div className="gm-name">{player.name}</div>
          <div className="gm-label">{filled}/5 starters · {player.lifelines} lifelines</div>
        </div>
        <div className="wins-box">
          <div className="wins-num mono-num" style={{ color: accent }}>{wins == null ? "—" : wins}</div>
          <div className="wins-cap">82-game proj</div>
        </div>
      </div>
      <div className="lineup">
        {POS_LIST.map((q) => (
          <Slot
            key={q.id}
            posId={q.id}
            posName={q.name}
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

function Center(props) {
  const {
    phase, players, activeGM, targets, spinKey, current,
    roster, filteredRoster, query, setQuery, posFilter, setPosFilter,
    selected, host, lastEval, onSpin, onChoose, onRespin, onNarrow,
    onContinue, lifelines, accent, isLastPick,
  } = props;

  const team = current ? teamByAbbr(current.abbr) : null;
  const dec = current ? decadeById(current.decadeId) : null;
  const showSearch = phase === "search" || phase === "placing";

  return (
    <div className="center-inner">
      {(phase === "spin" || phase === "spinning") && (
        <>
          <div className="reel-card">
            <div className="reel-title">Spin the Era Wheel</div>
            <div className="reels">
              <Reel items={TEAMS} target={targets.t} spinKey={spinKey} kind="team" durationMs={2300} />
              <Reel items={DECADES} target={targets.d} spinKey={spinKey} kind="decade" durationMs={2900} />
            </div>
            <div className="spin-row">
              <button className="btn btn-spin" onClick={onSpin} disabled={phase === "spinning"}>
                {phase === "spinning" ? "Rolling…" : "Spin"}
              </button>
            </div>
          </div>
          <Host text={host} />
          <div className="center-idle">
            <div className="big">{players[activeGM].name} on the clock</div>
            <div style={{ marginTop: 6, fontFamily: "var(--cond)", letterSpacing: 1, textTransform: "uppercase", fontSize: 12 }}>
              Build your starting five · one player per spin
            </div>
          </div>
        </>
      )}

      {showSearch && team && (
        <>
          <div className="reel-card" style={{ padding: "14px 16px" }}>
            <div className="matchup-banner" style={{ "--accent": team.primary }}>
              <div className="mb-label">Draft your best available from</div>
              <div className="mb-main">
                <span className="mb-accent">{team.city} {team.name}</span> · {dec.label}
              </div>
            </div>
          </div>

          {phase === "placing" && (
            <div className="picker-hint">Now click an open slot in {players[activeGM].name}'s lineup →</div>
          )}

          <div className="search-wrap" style={{ border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel)", minHeight: 0 }}>
            <div className="search-controls">
              <div className="pos-filter">
                {["ALL", "PG", "SG", "SF", "PF", "C"].map((pf) => (
                  <button key={pf} className={"pf-btn" + (posFilter === pf ? " active" : "")} onClick={() => setPosFilter(pf)}>{pf}</button>
                ))}
              </div>
              <div className="search-input-wrap">
                <SearchIcon />
                <input className="search-input" placeholder="Search players…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>
            <div className="roster-count">{filteredRoster.length} player{filteredRoster.length === 1 ? "" : "s"} available</div>
            <div className="player-list">
              {filteredRoster.length === 0 ? (
                <div className="list-empty">No players match</div>
              ) : (
                filteredRoster.map((p, i) => (
                  <PlayerRow key={p.n + i} player={p} selected={selected && selected.n === p.n} onClick={() => onChoose(p)} />
                ))
              )}
            </div>
          </div>

          <div className="spin-row">
            <button className="btn btn-lifeline" onClick={onRespin} disabled={lifelines <= 0}>
              ↻ Re-spin <span className="ll-count">({lifelines})</span>
            </button>
            <button className="btn btn-lifeline" onClick={onNarrow} disabled={lifelines <= 0}>
              ◎ Narrow it down <span className="ll-count">({lifelines})</span>
            </button>
          </div>
          <Host text={host} />
        </>
      )}

      {phase === "result" && lastEval && (
        <>
          <div className="reel-card" style={{ textAlign: "center" }}>
            <div className="reel-title">The Booth's Verdict</div>
            <div style={{ fontFamily: "var(--display)", fontSize: 72, lineHeight: 0.9, color: lastEval.gradeColor }}>{lastEval.grade}</div>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 2, fontSize: 11, color: "var(--muted-2)", marginTop: 4 }}>
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

function CandidatesModal({ candidates, onPick, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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

function GameOver({ players, wins, onNew }) {
  const a = wins[0] == null ? 0 : wins[0];
  const b = wins[1] == null ? 0 : wins[1];
  const verdict = finalVerdict(a, b, players[0].name, players[1].name);
  const aWin = a > b, bWin = b > a;
  return (
    <div className="overlay">
      <div className="modal gameover">
        <div style={{ textAlign: "center" }}>
          <div className="modal-sub" style={{ color: "var(--gold)" }}>Final Projection</div>
          <div className="modal-title" style={{ fontSize: 34 }}>The Tape Doesn't Lie</div>
        </div>
        <div className="vs-final">
          <div className={"final-team" + (aWin ? " win" : "")}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: ACCENTS[0] }}>{players[0].name}</div>
            <div className="final-wins" style={{ color: ACCENTS[0] }}>{a}</div>
            <div className="final-rec">{a}–{82 - a}</div>
          </div>
          <div className="vs-mid">VS</div>
          <div className={"final-team" + (bWin ? " win" : "")}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: ACCENTS[1] }}>{players[1].name}</div>
            <div className="final-wins" style={{ color: ACCENTS[1] }}>{b}</div>
            <div className="final-rec">{b}–{82 - b}</div>
          </div>
        </div>
        <Host text={verdict} />
        <div className="spin-row" style={{ marginTop: 18 }}>
          <button className="btn btn-spin" onClick={onNew}>Run It Back →</button>
        </div>
      </div>
    </div>
  );
}
