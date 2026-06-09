// Team + decade metadata for the NBA Drafting Game.
// Colors are franchise-flavored accents used on reels and lineup cards.
window.TEAMS = [
  { abbr: "LAL", city: "Los Angeles", name: "Lakers",  primary: "#552583", secondary: "#FDB927" },
  { abbr: "BOS", city: "Boston",      name: "Celtics", primary: "#007A33", secondary: "#BA9653" },
  { abbr: "CHI", city: "Chicago",     name: "Bulls",   primary: "#CE1141", secondary: "#111111" },
  { abbr: "SAS", city: "San Antonio", name: "Spurs",   primary: "#9EA2A2", secondary: "#111111" },
  { abbr: "DET", city: "Detroit",     name: "Pistons", primary: "#1D428A", secondary: "#C8102E" },
  { abbr: "HOU", city: "Houston",     name: "Rockets", primary: "#CE1141", secondary: "#9EA2A2" },
  { abbr: "UTA", city: "Utah",        name: "Jazz",    primary: "#002B5C", secondary: "#F9A01B" },
  { abbr: "NYK", city: "New York",    name: "Knicks",  primary: "#006BB6", secondary: "#F58426" },
];

window.DECADES = [
  { id: "1980s", short: "80s", label: "1980s" },
  { id: "1990s", short: "90s", label: "1990s" },
  { id: "2000s", short: "00s", label: "2000s" },
  { id: "2010s", short: "10s", label: "2010s" },
];

window.POSITIONS = [
  { id: "PG", name: "Point Guard" },
  { id: "SG", name: "Shooting Guard" },
  { id: "SF", name: "Small Forward" },
  { id: "PF", name: "Power Forward" },
  { id: "C",  name: "Center" },
];

window.teamByAbbr = function (abbr) {
  return window.TEAMS.find((t) => t.abbr === abbr);
};
window.decadeById = function (id) {
  return window.DECADES.find((d) => d.id === id);
};
