const POS_ORDER = { PG: 0, SG: 1, SF: 2, PF: 3, C: 4 };

function positionFit(naturalPos, slot) {
  const dist = Math.abs(POS_ORDER[naturalPos] - POS_ORDER[slot]);
  return [1.0, 0.94, 0.85, 0.74, 0.66][dist];
}

export function effectiveRating(player, slot) {
  return player.r * positionFit(player.p, slot);
}

function ratingToWins(avgRating) {
  const w = Math.round(41 + (avgRating - 55) * 0.82);
  return Math.max(9, Math.min(73, w));
}

export function projectWins(lineup) {
  const slots = Object.keys(lineup).filter((k) => lineup[k]);
  if (slots.length === 0) return null;
  const total = slots.reduce((sum, k) => sum + effectiveRating(lineup[k].player, k), 0);
  return ratingToWins(total / slots.length);
}

export function teamStrength(lineup) {
  const slots = Object.keys(lineup).filter((k) => lineup[k]);
  if (slots.length === 0) return 0;
  const total = slots.reduce((sum, k) => sum + effectiveRating(lineup[k].player, k), 0);
  return total / slots.length;
}

function letterGrade(eff) {
  if (eff >= 90) return "A+";
  if (eff >= 85) return "A";
  if (eff >= 80) return "A-";
  if (eff >= 75) return "B+";
  if (eff >= 70) return "B";
  if (eff >= 65) return "B-";
  if (eff >= 60) return "C+";
  if (eff >= 55) return "C";
  if (eff >= 50) return "C-";
  if (eff >= 45) return "D+";
  return "D";
}

function gradeColor(grade) {
  if (grade[0] === "A") return "#2BD576";
  if (grade[0] === "B") return "#9BE34A";
  if (grade[0] === "C") return "#FFC53D";
  return "#FF6B5C";
}

function pick(arr, seed) {
  return arr[Math.floor(seed * arr.length) % arr.length];
}

export function evaluatePick(player, slot, roster) {
  const fit = positionFit(player.p, slot);
  const eff = effectiveRating(player, slot);
  const grade = letterGrade(eff);
  const bestRemaining = roster.length ? roster[0].r : player.r;
  const leftOnBoard = bestRemaining - player.r;
  const offPos = player.p !== slot;
  let seed = (player.ppg % 1) + (player.r % 7) / 7;
  seed = seed - Math.floor(seed);

  const lines = [];

  if (eff >= 90) {
    lines.push(pick([
      "Are you KIDDING me? That's a franchise cornerstone right there.",
      "Oh, that's larceny. A first-ballot Hall of Famer in the " + slot + " slot.",
      "Get the banner ready — that is an all-time great selection.",
    ], seed));
  } else if (eff >= 82) {
    lines.push(pick([
      "Outstanding pick. That's an All-Star you can build around.",
      "Now THAT moves the needle. Perennial All-Star production.",
      "Big-time selection — that's a top-tier talent.",
    ], seed));
  } else if (eff >= 72) {
    lines.push(pick([
      "Solid, dependable starter. You can win with that.",
      "Good value. That's a quality two-way contributor.",
      "Smart, steady pick — fills the role nicely.",
    ], seed));
  } else if (eff >= 62) {
    lines.push(pick([
      "Serviceable. A rotation piece, not a needle-mover.",
      "Eh — that's a role player. Gets the job done on a good night.",
      "Fine. Won't lose you games, won't win them either.",
    ], seed));
  } else {
    lines.push(pick([
      "Tough watch. That's a deep-bench body in a starting slot.",
      "Oof. You're going to feel that one in the win column.",
      "That's a reach — the analytics are wincing.",
    ], seed));
  }

  if (offPos) {
    if (fit <= 0.74) {
      lines.push("And you're jamming a natural " + player.p + " in at " + slot + " — that's a stretch, costs you on both ends.");
    } else {
      lines.push("Playing a " + player.p + " at " + slot + " — a little out of position, but workable.");
    }
  }

  if (leftOnBoard >= 12 && roster.length) {
    lines.push("Though " + roster[0].n + " was still on the board — that's value left behind.");
  } else if (leftOnBoard <= 1.5) {
    lines.push("Best name available, too. No notes.");
  }

  return {
    grade,
    gradeColor: gradeColor(grade),
    eff,
    fit,
    offPos,
    call: lines.join(" "),
  };
}

export function finalVerdict(winsA, winsB, nameA, nameB) {
  if (winsA === winsB) {
    return "Dead heat at " + winsA + " wins apiece. We're going to need a Game 7.";
  }
  const winner = winsA > winsB ? nameA : nameB;
  const hi = Math.max(winsA, winsB);
  const lo = Math.min(winsA, winsB);
  const margin = hi - lo;
  const tag = margin >= 15 ? "It's a blowout." : margin >= 7 ? "Comfortable margin." : "A nail-biter to the end.";
  return winner + "'s squad projects to " + hi + " wins against " + lo + ". " + tag;
}
