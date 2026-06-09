// Scoring engine for the NBA Drafting Game.
// Deterministic: real ratings -> positional fit -> 82-game win projection + Host grade.

(function () {
  var POS_ORDER = { PG: 0, SG: 1, SF: 2, PF: 3, C: 4 };

  // How well a player's natural position covers the slot they're placed in.
  function positionFit(naturalPos, slot) {
    var dist = Math.abs(POS_ORDER[naturalPos] - POS_ORDER[slot]);
    return [1.0, 0.94, 0.85, 0.74, 0.66][dist];
  }

  // A player's value once placed at a slot.
  function effectiveRating(player, slot) {
    return player.r * positionFit(player.p, slot);
  }

  // Map an average effective rating (0-100) to projected wins in 82 games.
  // ~55 average => .500 (41 wins); elite fives push into the high 60s.
  function ratingToWins(avgRating) {
    var w = Math.round(41 + (avgRating - 55) * 0.82);
    return Math.max(9, Math.min(73, w));
  }

  // Project wins for a lineup object { PG, SG, SF, PF, C } of slot entries.
  // Each entry: { player, slot }. Empty slots are ignored (live projection).
  function projectWins(lineup) {
    var slots = Object.keys(lineup).filter(function (k) { return lineup[k]; });
    if (slots.length === 0) return null;
    var total = slots.reduce(function (sum, k) {
      return sum + effectiveRating(lineup[k].player, k);
    }, 0);
    return ratingToWins(total / slots.length);
  }

  // Average effective rating of the filled slots (team strength meter).
  function teamStrength(lineup) {
    var slots = Object.keys(lineup).filter(function (k) { return lineup[k]; });
    if (slots.length === 0) return 0;
    var total = slots.reduce(function (sum, k) {
      return sum + effectiveRating(lineup[k].player, k);
    }, 0);
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

  // Build the Host's call for a pick.
  // roster = full era roster (sorted by rating desc) BEFORE this pick was taken.
  function evaluatePick(player, slot, roster) {
    var fit = positionFit(player.p, slot);
    var eff = effectiveRating(player, slot);
    var grade = letterGrade(eff);
    var bestRemaining = roster.length ? roster[0].r : player.r;
    var leftOnBoard = bestRemaining - player.r; // >0 means a better name was available
    var offPos = player.p !== slot;
    var seed = (player.ppg % 1) + (player.r % 7) / 7; // stable per-player variety
    seed = seed - Math.floor(seed);

    var lines = [];

    // Tier reaction
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

    // Position note
    if (offPos) {
      if (fit <= 0.74) {
        lines.push("And you're jamming a natural " + player.p + " in at " + slot + " — that's a stretch, costs you on both ends.");
      } else {
        lines.push("Playing a " + player.p + " at " + slot + " — a little out of position, but workable.");
      }
    }

    // Value note
    if (leftOnBoard >= 12 && roster.length) {
      lines.push("Though " + roster[0].n + " was still on the board — that's value left behind.");
    } else if (leftOnBoard <= 1.5) {
      lines.push("Best name available, too. No notes.");
    }

    return {
      grade: grade,
      gradeColor: gradeColor(grade),
      eff: eff,
      fit: fit,
      offPos: offPos,
      call: lines.join(" "),
    };
  }

  // Final verdict comparing two finished lineups.
  function finalVerdict(winsA, winsB, nameA, nameB) {
    if (winsA === winsB) {
      return "Dead heat at " + winsA + " wins apiece. We're going to need a Game 7.";
    }
    var winner = winsA > winsB ? nameA : nameB;
    var hi = Math.max(winsA, winsB);
    var lo = Math.min(winsA, winsB);
    var margin = hi - lo;
    var tag = margin >= 15 ? "It's a blowout." : margin >= 7 ? "Comfortable margin." : "A nail-biter to the end.";
    return winner + "'s squad projects to " + hi + " wins against " + lo + ". " + tag;
  }

  window.SCORING = {
    positionFit: positionFit,
    effectiveRating: effectiveRating,
    projectWins: projectWins,
    teamStrength: teamStrength,
    ratingToWins: ratingToWins,
    evaluatePick: evaluatePick,
    finalVerdict: finalVerdict,
    letterGrade: letterGrade,
    gradeColor: gradeColor,
  };
})();
