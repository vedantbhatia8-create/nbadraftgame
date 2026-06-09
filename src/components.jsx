import { useRef, useState, useEffect } from 'react';

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
