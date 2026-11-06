const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* =========================================================================
   NSL S2 — NATIONAL SUPER LEAGUE SEASON 2
   Complete Tournament Environment & Enterprise Cricket Scoring Engine
   ========================================================================= */

/* ---------------------------------------------------------
   COLOR PALETTE & DESIGN SYSTEM
--------------------------------------------------------- */
const C = {
  bg: "#0A110D",
  bg2: "#0E1813",
  panel: "#14221A",
  panel2: "#1A2D23",
  panelBorder: "#273E30",
  tape: "#F2A93B",       // NSL Gold
  tape2: "#F2661D",      // NSL Orange
  wicket: "#E0483B",     // Crimson Out
  free: "#4FA8D6",       // Cyan Free Hit
  ink: "#F5F3EC",
  inkDim: "#9EB0A3",
  inkFaint: "#607569",
  win: "#52C474",        // Grass Green
  orangeCap: "#FF7A00",  // Orange Cap
  purpleCap: "#8B5CF6",  // Purple Cap
  cardBg: "#111C15",
};

const FONT_DISPLAY = "'Teko', system-ui, -apple-system, sans-serif";
const FONT_BODY = "'Manrope', system-ui, -apple-system, sans-serif";
const FONT_MONO = "'Space Mono', monospace";

/* ---------------------------------------------------------
   NSL FRANCHISE TEAMS, LOGOS & ROSTERS
--------------------------------------------------------- */
const DEFAULT_NSL_TEAMS = {
  KTG: {
    id: "KTG",
    name: "KHAN TIGERS",
    short: "KTG",
    color: "#F2A93B",
    logo: "assets/logos/ktg.jpg",
    captain: "Arbaz M",
    players: [
      "Arbaz M (C)", "Azhar M", "Farhan Iq", "Farhan J", "Amir K", "Adeel K",
      "Zohaib Ir", "Saqib G", "Ghayoor A", "Faheem D", "Ayaz D", "Aliyan S"
    ]
  },
  ASK: {
    id: "ASK",
    name: "ARSLAN ASLAM SUPER KINGS",
    short: "ASK",
    color: "#F2D024",
    logo: "assets/logos/ask.jpg",
    captain: "Aslam K",
    players: [
      "Aslam K (C)", "Shahzad M", "Kashif K", "Zeeshan Iq", "Irfan F", "Ali N",
      "Noman Ij", "Atif M", "Hasan J", "Danish R"
    ]
  },
  NKG: {
    id: "NKG",
    name: "NAWAB KINGS",
    short: "NKG",
    color: "#3B82F6",
    logo: "assets/logos/nkg.jpg",
    captain: "AKHTIAR H",
    players: [
      "AKHTIAR H (C)", "Zeehsan Sh", "Asim P", "Amir Ib", "Sadeeq D", "Rehan J",
      "Shabeer D", "Ali B", "Saqib S", "Ayan A"
    ]
  },
  ALW: {
    id: "ALW",
    name: "ALI WALY",
    short: "ALW",
    color: "#10B981",
    logo: "assets/logos/alw.jpg",
    captain: "Imtiaz K",
    players: [
      "Imtiaz K (C)", "Saddam D", "Ijaz H", "Saqlain Ir", "Hasan Ch", "Shahzad R",
      "Bilal D", "Asad D", "Azhar Cf", "Aftab Im"
    ]
  }
};

/* ---------------------------------------------------------
   NSL FIXTURES: ROUND 1 (6 MATCHES) + PLAYOFFS
--------------------------------------------------------- */
const DEFAULT_SCHEDULE = [
  { id: "m1", matchNum: 1, round: 1, teamA: "ASK", teamB: "KTG", status: "pending", result: "", winner: "", stageName: "Round 1 · Match 1", isPlayoff: false },
  { id: "m2", matchNum: 2, round: 1, teamA: "ALW", teamB: "NKG", status: "pending", result: "", winner: "", stageName: "Round 1 · Match 2", isPlayoff: false },
  { id: "m3", matchNum: 3, round: 1, teamA: "ASK", teamB: "ALW", status: "pending", result: "", winner: "", stageName: "Round 1 · Match 3", isPlayoff: false },
  { id: "m4", matchNum: 4, round: 1, teamA: "KTG", teamB: "NKG", status: "pending", result: "", winner: "", stageName: "Round 1 · Match 4", isPlayoff: false },
  { id: "m5", matchNum: 5, round: 1, teamA: "ASK", teamB: "NKG", status: "pending", result: "", winner: "", stageName: "Round 1 · Match 5", isPlayoff: false },
  { id: "m6", matchNum: 6, round: 1, teamA: "ALW", teamB: "KTG", status: "pending", result: "", winner: "", stageName: "Round 1 · Match 6", isPlayoff: false },
  // Playoff Bracket (Isolated from Round 1 group standings):
  { id: "m7", matchNum: 7, round: 2, teamA: "Rank 2", teamB: "Rank 3", status: "locked", result: "", winner: "", stageName: "KNOCKOUT QUALIFIER (2nd vs 3rd)", isPlayoff: true },
  { id: "m8", matchNum: 8, round: 3, teamA: "Rank 1", teamB: "Winner Knockout", status: "locked", result: "", winner: "", stageName: "GRAND FINAL", isPlayoff: true }
];

/* ---------------------------------------------------------
   LOCAL STORAGE & REAL-TIME API SYNC ENGINE
--------------------------------------------------------- */
function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("storage"));
    return true;
  } catch (e) {
    return false;
  }
}

function loadLocal(key, defaultVal = null) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? JSON.parse(val) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function getApiBaseUrl() {
  const configured = loadLocal("tapeball:vps_url");
  if (configured) return configured.replace(/\/$/, "");
  // If running locally or on server port 8000/5000:
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.port === "8000" || window.location.port === "5000") {
    return "";
  }
  // Default VPS API for Vercel/mobile web hosting:
  return "http://169.58.44.255:5000";
}

async function apiFetch(endpoint, method = "GET", data = null) {
  const baseUrl = getApiBaseUrl();
  try {
    const options = { 
      method, 
      headers: { "Content-Type": "application/json" } 
    };
    if (data && method !== "GET") options.body = JSON.stringify(data);
    const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
    const res = await fetch(url, options);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function genCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function oversStr(balls) {
  const o = Math.floor(balls / 6);
  const b = balls % 6;
  return `${o}.${b}`;
}

function emptyBatsman(name) {
  return {
    name,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    out: false,
    how: "",
    bowler: "",
    fielder: ""
  };
}

function emptyBowler(name) {
  return {
    name,
    balls: 0,
    runs: 0,
    wkts: 0,
    maidens: 0,
    overLog: []
  };
}

function newInnings(battingTeam, bowlingTeam, battingPlayers, bowlingPlayers, oversLimit = 8, target = null) {
  return {
    battingTeam,
    bowlingTeam,
    oversLimit,
    target,
    score: 0,
    wkts: 0,
    legalBalls: 0,
    extras: { wd: 0, nb: 0, b: 0, lb: 0 },
    striker: null,
    nonStriker: null,
    currentBowler: null,
    prevBowler: null,
    batsmen: {},
    bowlers: {},
    order: [],
    battingPlayers: [...battingPlayers],
    bowlingPlayers: [...bowlingPlayers],
    currentOverBalls: [],
    curOverRuns: 0,
    curOverWkts: 0,
    freeHit: false,
    completedOvers: [],
    commentary: [],
    isComplete: false
  };
}

/* ---------------------------------------------------------
   PHASE 1: CORRECT STANDINGS & ICC NRR CALCULATION ENGINE
   Strictly isolates playoff matches from group standings!
--------------------------------------------------------- */
function calculateStandings(completedMatches = []) {
  const teams = ["KTG", "ASK", "NKG", "ALW"];
  const stats = {};

  teams.forEach((t) => {
    stats[t] = {
      teamKey: t,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      pts: 0,
      runsScored: 0,
      ballsFaced: 0,
      runsConceded: 0,
      ballsBowled: 0,
      nrr: 0,
      form: []
    };
  });

  (completedMatches || []).forEach((m) => {
    // Strictly exclude playoff/knockout matches from group standings
    if (m.isPlayoff || m.round > 1 || (m.stageName && m.stageName.toLowerCase().includes("knockout")) || (m.stageName && m.stageName.toLowerCase().includes("final"))) {
      return;
    }
    if (!m.innings || m.innings.length < 1) return;

    const inn1 = m.innings[0];
    const inn2 = m.innings[1];
    const tA = m.teamAKey || "KTG";
    const tB = m.teamBKey || "ASK";

    if (!stats[tA] || !stats[tB]) return;

    stats[tA].played += 1;
    stats[tB].played += 1;

    const teamAName = m.teamA;
    const teamBName = m.teamB;
    const isWinA = m.winner === teamAName || m.winner === tA;
    const isWinB = m.winner === teamBName || m.winner === tB;

    if (isWinA) {
      stats[tA].won += 1; stats[tA].pts += 2; stats[tA].form.push("W");
      stats[tB].lost += 1; stats[tB].form.push("L");
    } else if (isWinB) {
      stats[tB].won += 1; stats[tB].pts += 2; stats[tB].form.push("W");
      stats[tA].lost += 1; stats[tA].form.push("L");
    } else {
      stats[tA].tied += 1; stats[tA].pts += 1; stats[tA].form.push("T");
      stats[tB].tied += 1; stats[tB].pts += 1; stats[tB].form.push("T");
    }

    // 1st Innings stats:
    const t1Key = (inn1.battingTeam === teamAName || inn1.battingTeam === tA) ? tA : tB;
    const t2Key = t1Key === tA ? tB : tA;

    stats[t1Key].runsScored += inn1.score;
    // Standard All Out rule: If all wickets lost, count full allocated overs (e.g. 8 ov = 48 balls)
    const maxWkts1 = Math.max((inn1.battingPlayers?.length || 11) - 1, 1);
    const allOut1 = inn1.wkts >= maxWkts1;
    const ballsFaced1 = allOut1 ? inn1.oversLimit * 6 : inn1.legalBalls;
    stats[t1Key].ballsFaced += ballsFaced1;

    stats[t2Key].runsConceded += inn1.score;
    stats[t2Key].ballsBowled += ballsFaced1;

    // 2nd Innings stats:
    if (inn2) {
      stats[t2Key].runsScored += inn2.score;
      const maxWkts2 = Math.max((inn2.battingPlayers?.length || 11) - 1, 1);
      const allOut2 = inn2.wkts >= maxWkts2;
      const ballsFaced2 = allOut2 ? inn2.oversLimit * 6 : inn2.legalBalls;
      stats[t2Key].ballsFaced += ballsFaced2;

      stats[t1Key].runsConceded += inn2.score;
      stats[t1Key].ballsBowled += ballsFaced2;
    }
  });

  // Calculate ICC NRR
  Object.values(stats).forEach((s) => {
    const batOvers = s.ballsFaced / 6;
    const bowlOvers = s.ballsBowled / 6;
    const batRate = batOvers > 0 ? s.runsScored / batOvers : 0;
    const bowlRate = bowlOvers > 0 ? s.runsConceded / bowlOvers : 0;
    s.nrr = batRate - bowlRate;
  });

  return Object.values(stats).sort((a, b) => b.pts - a.pts || b.nrr - a.nrr || b.won - a.won);
}

/* ---------------------------------------------------------
   PHASE 3 & 4: TOURNAMENT LEADERBOARDS & PLAYER STATS ENGINE
--------------------------------------------------------- */
function calculateOverallLeaderboard(completedMatches = [], nslTeams = DEFAULT_NSL_TEAMS) {
  const batsmen = {};
  const bowlers = {};

  (completedMatches || []).forEach((m) => {
    if (!m.innings) return;

    m.innings.forEach((inn) => {
      if (!inn) return;

      const battingTeamName = inn.battingTeam;
      const bowlingTeamName = inn.bowlingTeam;

      if (inn.batsmen) {
        Object.values(inn.batsmen).forEach((b) => {
          if (!b || !b.name) return;
          const cleanName = b.name.replace(" (C)", "").trim();
          if (!batsmen[cleanName]) {
            batsmen[cleanName] = {
              name: cleanName,
              rawName: b.name,
              team: battingTeamName,
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              dismissals: 0,
              highScore: 0,
              innings: 0,
              notOuts: 0
            };
          }
          if (b.balls > 0 || b.runs > 0 || b.out) {
            batsmen[cleanName].innings += 1;
            batsmen[cleanName].runs += b.runs;
            batsmen[cleanName].balls += b.balls;
            batsmen[cleanName].fours += b.fours || 0;
            batsmen[cleanName].sixes += b.sixes || 0;
            if (b.runs > batsmen[cleanName].highScore) batsmen[cleanName].highScore = b.runs;
            if (b.out) batsmen[cleanName].dismissals += 1;
            else batsmen[cleanName].notOuts += 1;
          }
        });
      }

      if (inn.bowlers) {
        Object.values(inn.bowlers).forEach((bw) => {
          if (!bw || !bw.name || bw.balls === 0) return;
          const cleanName = bw.name.replace(" (C)", "").trim();
          if (!bowlers[cleanName]) {
            bowlers[cleanName] = {
              name: cleanName,
              rawName: bw.name,
              team: bowlingTeamName,
              balls: 0,
              runs: 0,
              wkts: 0,
              maidens: 0,
              bestWkts: 0,
              bestRuns: 999
            };
          }
          bowlers[cleanName].balls += bw.balls;
          bowlers[cleanName].runs += bw.runs;
          bowlers[cleanName].wkts += bw.wkts;
          bowlers[cleanName].maidens += bw.maidens || 0;
          if (bw.wkts > bowlers[cleanName].bestWkts || (bw.wkts === bowlers[cleanName].bestWkts && bw.runs < bowlers[cleanName].bestRuns)) {
            bowlers[cleanName].bestWkts = bw.wkts;
            bowlers[cleanName].bestRuns = bw.runs;
          }
        });
      }
    });
  });

  const batList = Object.values(batsmen).map((b) => {
    const sr = b.balls > 0 ? (b.runs / b.balls) * 100 : 0;
    const avg = b.dismissals > 0 ? b.runs / b.dismissals : b.runs;
    return { ...b, sr, avg };
  }).sort((a, b) => b.runs - a.runs || b.sr - a.sr);

  const bowlList = Object.values(bowlers).map((bw) => {
    const overs = bw.balls / 6;
    const econ = overs > 0 ? bw.runs / overs : 0;
    const avg = bw.wkts > 0 ? bw.runs / bw.wkts : bw.runs;
    return { ...bw, overs, econ, avg };
  }).sort((a, b) => b.wkts - a.wkts || a.econ - b.econ);

  const sixesList = [...batList].sort((a, b) => b.sixes - a.sixes || b.runs - a.runs);

  const allPlayerNames = new Set([...Object.keys(batsmen), ...Object.keys(bowlers)]);
  const mvpList = Array.from(allPlayerNames).map((pName) => {
    const b = batsmen[pName] || { runs: 0, sixes: 0, fours: 0, team: "" };
    const bw = bowlers[pName] || { wkts: 0, maidens: 0, team: "" };
    const points = (b.runs * 1) + (b.sixes * 2) + (b.fours * 1) + (bw.wkts * 20) + (bw.maidens * 10);
    return {
      name: pName,
      team: b.team || bw.team || "NSL",
      runs: b.runs,
      wkts: bw.wkts,
      sixes: b.sixes,
      points
    };
  }).sort((a, b) => b.points - a.points);

  return { batList, bowlList, sixesList, mvpList };
}

/* ---------------------------------------------------------
   MATCH TOP PERFORMERS (MOST RUNS & MOST WICKETS PER MATCH)
--------------------------------------------------------- */
function getMatchTopPerformers(m) {
  let topBatsman = null;
  let topBowler = null;

  (m.innings || []).forEach((inn) => {
    if (!inn) return;
    Object.values(inn.batsmen || {}).forEach((b) => {
      if (!b || (!b.runs && !b.balls && !b.out)) return;
      if (!topBatsman || b.runs > topBatsman.runs || (b.runs === topBatsman.runs && b.balls < topBatsman.balls)) {
        const sr = b.balls > 0 ? (b.runs / b.balls) * 100 : 0;
        topBatsman = { ...b, team: inn.battingTeam, sr };
      }
    });

    Object.values(inn.bowlers || {}).forEach((bw) => {
      if (!bw || (!bw.balls && !bw.runs && !bw.wkts)) return;
      if (!topBowler || bw.wkts > topBowler.wkts || (bw.wkts === topBowler.wkts && bw.runs < topBowler.runs)) {
        const ovs = bw.balls / 6;
        const econ = ovs > 0 ? bw.runs / ovs : 0;
        topBowler = { ...bw, team: inn.bowlingTeam, econ };
      }
    });
  });

  return { topBatsman, topBowler };
}

/* ---------------------------------------------------------
   COMMENTARY GENERATOR
--------------------------------------------------------- */
function createCommentaryText(ballData, batsmanName, bowlerName) {
  const { type, runs, label, outType } = ballData;
  if (type === "wicket") {
    if (outType === "bowled") return `OUT! Clean bowled! ${bowlerName} shatters the stumps! ${batsmanName} departs.`;
    if (outType === "caught") return `OUT! Caught! High in the air and taken safely! ${batsmanName} has to walk back.`;
    if (outType === "lbw") return `OUT! Trapped right in front! Big appeal and the finger goes up! LBW!`;
    if (outType === "run out") return `OUT! Direct hit or quick work at the stumps! Run out!`;
    if (outType === "stumped") return `OUT! Beaten outside off, foot dragged out, and the bails are off! Stumped!`;
    return `OUT! Huge breakthrough for ${bowlerName}! ${batsmanName} is dismissed.`;
  }
  if (type === "wide") return `Wide called outside off stump by the umpire. Extra run conceded by ${bowlerName}.`;
  if (type === "noball") return `NO BALL! Overstepping or height warning! Extra run and FREE HIT awarded!`;
  if (type === "bye") return `Bye taken! Ball beats keeper and batsmen sneak through.`;
  if (type === "legbye") return `Leg bye! Deflected off the pads, rotating the strike.`;
  if (runs === 0) return `Dot ball. Good tight length from ${bowlerName}, no run scored.`;
  if (runs === 1) return `Single taken. Pushed gently into the gap, easy single for ${batsmanName}.`;
  if (runs === 2) return `Good running between the wickets! Turned into the deep for a quick brace.`;
  if (runs === 3) return `Superb hustle! Three runs gathered with aggressive running.`;
  if (runs === 4) return `FOUR! Boundary! Cracking shot through the infield, races to the fence!`;
  if (runs === 6) return `SIX! MAXIMUM! Smoked out of the ground! Colossal strike from ${batsmanName}!`;
  return `${label} scored.`;
}

/* --- UI Utility Components --- */
function Panel({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.panel,
        borderRadius: 12,
        border: `1px solid ${C.panelBorder}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
        ...style
      }}
    >
      {children}
    </div>
  );
}

function Chip({ children, active, onClick, color = C.tape, style = {} }) {
  return (
    <button
      onClick={onClick}
      className="tb-btn"
      style={{
        background: active ? color : C.panel2,
        color: active ? "#0A110D" : C.ink,
        fontWeight: active ? 800 : 600,
        fontSize: 12,
        padding: "6px 12px",
        borderRadius: 20,
        border: `1px solid ${active ? color : C.panelBorder}`,
        cursor: "pointer",
        ...style
      }}
    >
      {children}
    </button>
  );
}

function BigButton({ children, onClick, bg = C.tape, color = "#0A110D", style = {}, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="tb-btn"
      style={{
        background: disabled ? C.panel2 : bg,
        color: disabled ? C.inkFaint : color,
        border: "none",
        borderRadius: 10,
        padding: "14px 18px",
        fontWeight: 800,
        fontSize: 16,
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "center",
        boxShadow: disabled ? "none" : "0 4px 12px rgba(0,0,0,0.25)",
        ...style
      }}
    >
      {children}
    </button>
  );
}

function Label({ children, style = {} }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        color: C.inkDim,
        textTransform: "uppercase",
        letterSpacing: "0.8px",
        ...style
      }}
    >
      {children}
    </div>
  );
}

function TeamLogo({ shortKey, size = 32, style = {} }) {
  const team = DEFAULT_NSL_TEAMS[shortKey] || {};
  const logo = team.logo || `assets/logos/${(shortKey || "ktg").toLowerCase()}.jpg`;
  return (
    <img
      src={logo}
      alt={shortKey}
      onError={(e) => { e.target.style.display = 'none'; }}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `1.5px solid ${team.color || C.tape}`,
        objectFit: "cover",
        background: "#000",
        ...style
      }}
    />
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
    >
      <div
        className="tb-fadein"
        style={{
          background: C.bg2,
          border: `1px solid ${C.panelBorder}`,
          borderRadius: 16,
          width: "100%",
          maxWidth: 460,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 12px 40px rgba(0,0,0,0.85)"
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${C.panelBorder}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: 1, color: C.tape }}>
            {title}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: C.inkDim,
                fontSize: 22,
                cursor: "pointer",
                padding: 4
              }}
            >
              ✕
            </button>
          )}
        </div>
        <div style={{ padding: 20, overflowY: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   TOP NAVIGATION & ROLE BAR (WITH LIVE SYNC INDICATOR)
   ========================================================================= */
function TopNav({ role, onOpenRoleModal, activeMatch, onWatchLive, syncStatus }) {
  const roleBadge = {
    admin: { label: "👑 ADMIN", bg: "rgba(242,169,59,0.2)", border: C.tape, color: C.tape },
    scorer: { label: "⚡ SCORER", bg: "rgba(82,196,116,0.2)", border: C.win, color: C.win },
    spectator: { label: "👁 SPECTATOR", bg: "rgba(79,168,214,0.2)", border: C.free, color: C.free }
  }[role] || { label: "SPECTATOR", bg: C.panel2, border: C.panelBorder, color: C.ink };

  return (
    <div
      style={{
        background: C.bg2,
        borderBottom: `1px solid ${C.panelBorder}`,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 50
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${C.tape}, ${C.tape2})`,
            color: "#0A110D",
            fontFamily: FONT_DISPLAY,
            fontSize: 20,
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: 6,
            letterSpacing: 1
          }}
        >
          NSL S2
        </div>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, lineHeight: 1, letterSpacing: 0.5 }}>
            NATIONAL SUPER LEAGUE
          </div>
          <div style={{ fontSize: 10, color: C.inkDim, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 4 }}>
            <span>SEASON 2</span>
            <span>·</span>
            <span style={{ color: syncStatus === "online" ? C.win : C.tape }}>
              {syncStatus === "online" ? "● Live Sync" : "○ Local Cache"}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {activeMatch && activeMatch.status !== "done" && (
          <button
            onClick={onWatchLive}
            className="tb-btn tb-pulse"
            style={{
              background: "rgba(224,72,59,0.2)",
              border: `1px solid ${C.wicket}`,
              color: C.wicket,
              borderRadius: 20,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.wicket }} />
            LIVE
          </button>
        )}

        <button
          onClick={onOpenRoleModal}
          className="tb-btn"
          style={{
            background: roleBadge.bg,
            border: `1px solid ${roleBadge.border}`,
            color: roleBadge.color,
            borderRadius: 20,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          {roleBadge.label} ▾
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   BOTTOM NAVIGATION BAR
   ========================================================================= */
function BottomNav({ screen, setScreen }) {
  const navItems = [
    { key: "home", label: "Home", icon: "🏠" },
    { key: "live_centre", label: "Live", icon: "🔴" },
    { key: "fixtures", label: "Fixtures", icon: "📅" },
    { key: "standings", label: "Points", icon: "📊" },
    { key: "leaderboards", label: "Cap Awards", icon: "👑" },
    { key: "teams", label: "Teams", icon: "🛡️" },
    { key: "results", label: "Results", icon: "📜" },
    { key: "admin", label: "Admin", icon: "⚙️" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: C.bg2,
        borderTop: `1px solid ${C.panelBorder}`,
        display: "flex",
        justifyContent: "space-around",
        padding: "6px 4px max(8px, env(safe-area-inset-bottom, 8px))",
        zIndex: 900
      }}
    >
      {navItems.map((item) => {
        const isActive = screen === item.key;
        return (
          <button
            key={item.key}
            onClick={() => setScreen(item.key)}
            className="tb-btn"
            style={{
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "4px 6px",
              cursor: "pointer",
              color: isActive ? C.tape : C.inkDim,
              position: "relative"
            }}
          >
            <span style={{ fontSize: 18, filter: isActive ? "none" : "grayscale(60%)" }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 800 : 600, marginTop: 2 }}>{item.label}</span>
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  bottom: -2,
                  width: 14,
                  height: 3,
                  borderRadius: 2,
                  background: C.tape
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================================
   ROLE & PERMISSIONS AUTH MODAL (PHASE 2)
   ========================================================================= */
function RoleModal({ currentRole, onClose, onRoleChange }) {
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleVerify = () => {
    setError("");
    if (selectedRole === "spectator") {
      onRoleChange("spectator");
      onClose();
      return;
    }
    // PIN Validation: Admin default 7860, Scorer default 1234
    if (selectedRole === "admin") {
      if (pin === "7860") {
        onRoleChange("admin");
        onClose();
      } else {
        setError("Invalid Admin PIN (Default: 7860)");
      }
    } else if (selectedRole === "scorer") {
      if (pin === "1234" || pin === "7860") {
        onRoleChange("scorer");
        onClose();
      } else {
        setError("Invalid Scorer PIN (Default: 1234)");
      }
    }
  };

  return (
    <ModalShell title="Select User Role & Permissions" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Label>Choose Application Role</Label>
        <div style={{ display: "flex", gap: 8 }}>
          <Chip active={selectedRole === "spectator"} onClick={() => { setSelectedRole("spectator"); setError(""); }} color={C.free}>
            👁 Spectator
          </Chip>
          <Chip active={selectedRole === "scorer"} onClick={() => { setSelectedRole("scorer"); setError(""); }} color={C.win}>
            ⚡ Scorer
          </Chip>
          <Chip active={selectedRole === "admin"} onClick={() => { setSelectedRole("admin"); setError(""); }} color={C.tape}>
            👑 Admin
          </Chip>
        </div>

        {selectedRole !== "spectator" && (
          <div>
            <Label style={{ marginTop: 8 }}>Enter Security PIN</Label>
            <input
              type="password"
              inputMode="numeric"
              placeholder={selectedRole === "admin" ? "Admin PIN (7860)" : "Scorer PIN (1234)"}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                background: C.panel2,
                border: `1px solid ${C.panelBorder}`,
                borderRadius: 8,
                color: C.ink,
                fontFamily: FONT_MONO,
                fontSize: 18,
                letterSpacing: 4,
                marginTop: 6
              }}
            />
            <div style={{ fontSize: 11, color: C.inkDim, marginTop: 4 }}>
              Default PINs: Admin = <code>7860</code> · Scorer = <code>1234</code>
            </div>
          </div>
        )}

        {error && <div style={{ color: C.wicket, fontSize: 12, fontWeight: 700 }}>{error}</div>}

        <BigButton onClick={handleVerify} bg={C.tape} style={{ marginTop: 10 }}>
          Confirm Role Access
        </BigButton>
      </div>
    </ModalShell>
  );
}

/* =========================================================================
   PHASE 3: HOME DASHBOARD SCREEN
   ========================================================================= */
function HomeScreen({
  nslTeams,
  schedule,
  completedMatches,
  activeMatch,
  announcements,
  onStartMatch,
  onWatchLive,
  onViewScorecard,
  onNavigateTab
}) {
  const standings = useMemo(() => calculateStandings(completedMatches), [completedMatches]);
  const leaderboards = useMemo(() => calculateOverallLeaderboard(completedMatches, nslTeams), [completedMatches, nslTeams]);

  const totalMatchesCompleted = completedMatches.length;
  const totalRuns = completedMatches.reduce((acc, m) => acc + (m.runsA || 0) + (m.runsB || 0), 0);
  const totalWkts = completedMatches.reduce((acc, m) => acc + (m.wktsA || 0) + (m.wktsB || 0), 0);
  const totalSixes = leaderboards.sixesList.reduce((acc, b) => acc + (b.sixes || 0), 0);

  const orangeCapHolder = leaderboards.batList[0] || null;
  const purpleCapHolder = leaderboards.bowlList[0] || null;

  const nextPendingMatch = (schedule || []).find((m) => m.status === "pending" || m.status === "live");

  return (
    <div className="tb-fadein" style={{ padding: "16px 16px 80px", maxWidth: 720, margin: "0 auto" }}>
      {/* HERO BANNER */}
      <Panel
        style={{
          background: `linear-gradient(135deg, rgba(242,169,59,0.18), rgba(20,34,26,0.95))`,
          border: `1.5px solid ${C.tape}`,
          padding: 18,
          marginBottom: 16
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 800, background: C.tape, color: "#0A110D", padding: "2px 6px", borderRadius: 4, letterSpacing: 0.5 }}>
              NSL SEASON 2
            </span>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, letterSpacing: 1, marginTop: 4, lineHeight: 1 }}>
              TAPEBALL CRICKET CHAMPIONSHIP
            </div>
            <div style={{ fontSize: 12, color: C.inkDim, marginTop: 4 }}>
              4 Elite Franchises · 8 High-Stakes Matches · 1 Supreme Trophy
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {["KTG", "ASK", "NKG", "ALW"].map((k) => (
              <TeamLogo key={k} shortKey={k} size={28} />
            ))}
          </div>
        </div>

        {/* ACTIVE LIVE MATCH BANNER */}
        {activeMatch && activeMatch.status !== "done" ? (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              background: "rgba(224,72,59,0.15)",
              border: `1px solid ${C.wicket}`,
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <div style={{ color: C.wicket, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                <span className="tb-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: C.wicket }} />
                MATCH IN PROGRESS
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, marginTop: 2 }}>
                {activeMatch.teamA} vs {activeMatch.teamB}
              </div>
            </div>
            <BigButton onClick={onWatchLive} bg={C.wicket} color="#fff" style={{ padding: "8px 14px", fontSize: 14 }}>
              Enter Match Centre
            </BigButton>
          </div>
        ) : nextPendingMatch ? (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              background: C.panel2,
              border: `1px solid ${C.panelBorder}`,
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <div style={{ color: C.tape, fontSize: 11, fontWeight: 800 }}>NEXT UPCOMING FIXTURE</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, marginTop: 2 }}>
                {nextPendingMatch.stageName}: {nextPendingMatch.teamA} vs {nextPendingMatch.teamB}
              </div>
            </div>
            <button
              onClick={() => onStartMatch(nextPendingMatch)}
              className="tb-btn"
              style={{
                background: C.tape,
                border: "none",
                borderRadius: 8,
                color: "#0A110D",
                fontWeight: 800,
                fontSize: 13,
                padding: "8px 14px",
                cursor: "pointer"
              }}
            >
              Start / Score
            </button>
          </div>
        ) : null}
      </Panel>

      {/* QUICK TOURNAMENT METRICS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Matches", val: `${totalMatchesCompleted}/8`, icon: "🏏" },
          { label: "Runs Scored", val: totalRuns, icon: "🔥" },
          { label: "Sixes Hit", val: totalSixes, icon: "💥" },
          { label: "Wickets", val: totalWkts, icon: "🎯" },
        ].map((stat, i) => (
          <Panel key={i} style={{ padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 18 }}>{stat.icon}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: C.tape, marginTop: 2 }}>{stat.val}</div>
            <div style={{ fontSize: 10, color: C.inkDim, fontWeight: 700 }}>{stat.label}</div>
          </Panel>
        ))}
      </div>

      {/* CAP AWARDS PREVIEW */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <Panel style={{ padding: 14, borderLeft: `4px solid ${C.orangeCap}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>🟠</span>
            <Label style={{ color: C.orangeCap }}>ORANGE CAP LEADER</Label>
          </div>
          {orangeCapHolder ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20 }}>{orangeCapHolder.name}</div>
              <div style={{ fontSize: 11, color: C.inkDim }}>{orangeCapHolder.team}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 16, color: C.tape, marginTop: 4, fontWeight: 700 }}>
                {orangeCapHolder.runs} Runs <span style={{ fontSize: 11, color: C.inkDim }}>({orangeCapHolder.sixes} Sixes)</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 8 }}>Waiting for matches</div>
          )}
        </Panel>

        <Panel style={{ padding: 14, borderLeft: `4px solid ${C.purpleCap}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>🟣</span>
            <Label style={{ color: C.purpleCap }}>PURPLE CAP LEADER</Label>
          </div>
          {purpleCapHolder ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20 }}>{purpleCapHolder.name}</div>
              <div style={{ fontSize: 11, color: C.inkDim }}>{purpleCapHolder.team}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 16, color: C.purpleCap, marginTop: 4, fontWeight: 700 }}>
                {purpleCapHolder.wkts} Wickets <span style={{ fontSize: 11, color: C.inkDim }}>({purpleCapHolder.econ.toFixed(1)} Econ)</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 8 }}>Waiting for matches</div>
          )}
        </Panel>
      </div>

      {/* OFFICIAL TOURNAMENT BROADCASTS & ANNOUNCEMENTS */}
      <Panel style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Label>📢 Official Tournament Broadcasts</Label>
          <span style={{ fontSize: 10, color: C.win, fontWeight: 800 }}>● Live Feed</span>
        </div>
        {(announcements || []).length === 0 ? (
          <div style={{ fontSize: 12, color: C.inkFaint }}>No announcements broadcast yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {announcements.slice(0, 4).map((ann, i) => (
              <div key={ann.id || i} style={{ padding: 10, background: C.panel2, borderRadius: 6, borderLeft: `3px solid ${C.tape}` }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{ann.title}</div>
                <div style={{ fontSize: 12, color: C.inkDim, marginTop: 2, lineHeight: 1.4 }}>{ann.content}</div>
                <div style={{ fontSize: 9, color: C.inkFaint, marginTop: 4 }}>
                  {new Date(ann.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* POINTS TABLE GLANCE */}
      <Panel style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Label>🏆 Group Standings (Round 1)</Label>
          <button
            onClick={() => onNavigateTab("standings")}
            style={{ background: "none", border: "none", color: C.tape, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            Full Table ➔
          </button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
          <thead>
            <tr style={{ color: C.inkDim, borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center" }}>
              <th style={{ textAlign: "left", padding: "6px 0" }}>Team</th>
              <th>P</th>
              <th>W</th>
              <th>L</th>
              <th>PTS</th>
              <th>NRR</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((st, idx) => {
              const isFirst = idx === 0;
              const isPlayoffZone = idx === 1 || idx === 2;
              return (
                <tr key={st.teamKey} style={{ borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center" }}>
                  <td style={{ textAlign: "left", padding: "8px 0", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: isFirst ? C.tape : isPlayoffZone ? C.free : C.wicket }}>
                      {idx + 1}
                    </span>
                    <TeamLogo shortKey={st.teamKey} size={20} />
                    <span style={{ fontWeight: 700, color: C.ink }}>{st.teamKey}</span>
                  </td>
                  <td>{st.played}</td>
                  <td style={{ color: C.win }}>{st.won}</td>
                  <td style={{ color: C.wicket }}>{st.lost}</td>
                  <td style={{ fontWeight: 800, color: C.tape }}>{st.pts}</td>
                  <td style={{ color: st.nrr >= 0 ? C.win : C.wicket }}>
                    {st.nrr > 0 ? `+${st.nrr.toFixed(3)}` : st.nrr.toFixed(3)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* =========================================================================
   PHASE 1: PRE-MATCH SETUP (PLAYING XI, TOSS & OPENERS)
   ========================================================================= */
function MatchSetupModal({ schedMatch, nslTeams, onClose, onStartMatchLive, onAddPlayer }) {
  const teamAKey = schedMatch.teamA;
  const teamBKey = schedMatch.teamB;
  const teamA = nslTeams[teamAKey] || DEFAULT_NSL_TEAMS[teamAKey] || { name: teamAKey, short: teamAKey, players: [] };
  const teamB = nslTeams[teamBKey] || DEFAULT_NSL_TEAMS[teamBKey] || { name: teamBKey, short: teamBKey, players: [] };

  // Setup Wizard Steps: "toss" -> "decision" -> "openers"
  const [setupStep, setSetupStep] = useState("toss");

  // Coin Toss 3D Animation State
  const [isFlipping, setIsFlipping] = useState(false);
  const [rotationY, setRotationY] = useState(0);
  const [tossWinner, setTossWinner] = useState(null);
  const [tossDecision, setTossDecision] = useState("bat");
  const [oversLimit, setOversLimit] = useState(8);

  const [selectedA, setSelectedA] = useState(() => (teamA.players || []).slice(0, 11));
  const [selectedB, setSelectedB] = useState(() => (teamB.players || []).slice(0, 11));

  // Emergency player state
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyTeam, setEmergencyTeam] = useState(teamAKey);

  // Active teams based on toss winner & decision
  const battingFirstKey = tossDecision === "bat"
    ? (tossWinner || teamAKey)
    : ((tossWinner || teamAKey) === teamAKey ? teamBKey : teamAKey);
  const bowlingFirstKey = battingFirstKey === teamAKey ? teamBKey : teamAKey;

  const battingTeam = battingFirstKey === teamAKey ? teamA : teamB;
  const bowlingTeam = bowlingFirstKey === teamAKey ? teamA : teamB;

  const activeBatPlayers = battingFirstKey === teamAKey ? selectedA : selectedB;
  const activeBowlPlayers = bowlingFirstKey === teamAKey ? selectedA : selectedB;

  const [striker, setStriker] = useState("");
  const [nonStriker, setNonStriker] = useState("");
  const [bowler, setBowler] = useState("");

  // Keep openers synced when batting/bowling team is established
  useEffect(() => {
    if (activeBatPlayers.length > 0) {
      if (!striker || !activeBatPlayers.includes(striker)) {
        setStriker(activeBatPlayers[0] || "");
      }
      if (!nonStriker || !activeBatPlayers.includes(nonStriker) || nonStriker === activeBatPlayers[0]) {
        setNonStriker(activeBatPlayers[1] || activeBatPlayers[0] || "");
      }
    }
    if (activeBowlPlayers.length > 0) {
      if (!bowler || !activeBowlPlayers.includes(bowler)) {
        setBowler(activeBowlPlayers[0] || "");
      }
    }
  }, [setupStep, battingFirstKey, selectedA, selectedB]);

  // 100% 50-50 Fair Coin Flip with Smooth 3D Animation
  const handleFlipCoin = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setTossWinner(null);

    // Exactly 50-50 chances:
    const isTeamAWinner = Math.random() < 0.5;
    const winnerKey = isTeamAWinner ? teamAKey : teamBKey;

    // Front of coin = 0 deg (Team A), Back of coin = 180 deg (Team B).
    // Rotate 6 full spins (2160 deg) and land precisely on winner side:
    const baseSpins = 6 * 360;
    const currentBase = Math.floor(rotationY / 360) * 360;
    const targetAngle = isTeamAWinner
      ? currentBase + baseSpins
      : currentBase + baseSpins + 180;

    setRotationY(targetAngle);

    setTimeout(() => {
      setIsFlipping(false);
      setTossWinner(winnerKey);
      setSetupStep("decision");
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }
    }, 2650);
  };

  const handleAddEmergencyPlayer = () => {
    if (!emergencyName.trim()) return;
    const clean = emergencyName.trim();
    if (emergencyTeam === teamAKey) {
      if (!selectedA.includes(clean)) setSelectedA((prev) => [...prev, clean]);
    } else {
      if (!selectedB.includes(clean)) setSelectedB((prev) => [...prev, clean]);
    }
    if (onAddPlayer) onAddPlayer(emergencyTeam, clean);
    setEmergencyName("");
  };

  const handleConfirm = () => {
    if (activeBatPlayers.length < 2 || activeBowlPlayers.length < 2) {
      alert("Each team must have at least 2 players!");
      return;
    }
    if (!striker || !nonStriker || striker === nonStriker) {
      alert("Please select two different opening batsmen (Striker & Non-Striker)!");
      return;
    }
    if (!bowler) {
      alert("Please select an opening bowler!");
      return;
    }

    const code = genCode();
    const inn1 = newInnings(battingTeam.name, bowlingTeam.name, activeBatPlayers, activeBowlPlayers, oversLimit, null);
    inn1.batsmen[striker] = emptyBatsman(striker);
    inn1.batsmen[nonStriker] = emptyBatsman(nonStriker);
    inn1.bowlers[bowler] = emptyBowler(bowler);
    inn1.striker = striker;
    inn1.nonStriker = nonStriker;
    inn1.currentBowler = bowler;
    inn1.order = [striker, nonStriker];

    const newMatch = {
      code,
      scheduleId: schedMatch.id,
      matchNum: schedMatch.matchNum,
      stageName: schedMatch.stageName,
      isPlayoff: Boolean(schedMatch.isPlayoff),
      teamA: teamA.name,
      teamB: teamB.name,
      teamAKey,
      teamBKey,
      oversLimit,
      toss: {
        winner: tossWinner || teamAKey,
        decision: tossDecision || "bat"
      },
      playingXI: {
        [teamAKey]: selectedA,
        [teamBKey]: selectedB
      },
      innings: [inn1],
      currentInningsIdx: 0,
      status: "live",
      result: "",
      winner: "",
      createdAt: Date.now()
    };

    onStartMatchLive(newMatch);
  };

  const winnerObj = tossWinner ? (nslTeams[tossWinner] || DEFAULT_NSL_TEAMS[tossWinner]) : null;

  return (
    <ModalShell title={`Pre-Match Setup · Match ${schedMatch.matchNum}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        
        {/* MATCH HEADER INFO */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.panelBorder}`, paddingBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: C.tape, fontWeight: 800 }}>{schedMatch.stageName}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20 }}>
              {teamA.name} vs {teamB.name}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Label>Overs:</Label>
            <input
              type="number"
              min="2"
              max="20"
              value={oversLimit}
              onChange={(e) => setOversLimit(Number(e.target.value))}
              style={{
                width: 44,
                padding: "4px 6px",
                background: C.panel2,
                border: `1px solid ${C.panelBorder}`,
                color: C.tape,
                fontFamily: FONT_MONO,
                fontWeight: 700,
                borderRadius: 6,
                textAlign: "center"
              }}
            />
          </div>
        </div>

        {/* STEP 1: INTERACTIVE 3D COIN TOSS */}
        {setupStep === "toss" && (
          <Panel style={{ padding: 16, textAlign: "center", background: `radial-gradient(circle at center, rgba(242,169,59,0.08), ${C.panel})` }}>
            <Label style={{ fontSize: 13, color: C.tape }}>🪙 OFFICIAL COIN TOSS (50-50 CHANCE)</Label>
            <div style={{ fontSize: 11, color: C.inkDim, marginTop: 4 }}>
              Two sides of the coin feature official team logos. Tap below to flip!
            </div>

            {/* 3D COIN ELEMENT */}
            <div className="coin-scene" onClick={handleFlipCoin} title="Tap coin to flip!">
              <div
                className="coin-object"
                style={{
                  transform: `rotateY(${rotationY}deg)`
                }}
              >
                {/* Front Side: Team A */}
                <div className="coin-side coin-front">
                  <img
                    src={`assets/logos/${teamAKey.toLowerCase()}.jpg`}
                    alt={teamAKey}
                    className="coin-logo-img"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="coin-team-tag">{teamA.short || teamAKey}</div>
                </div>

                {/* Back Side: Team B */}
                <div className="coin-side coin-back">
                  <img
                    src={`assets/logos/${teamBKey.toLowerCase()}.jpg`}
                    alt={teamBKey}
                    className="coin-logo-img"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="coin-team-tag">{teamB.short || teamBKey}</div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 6, fontSize: 11, color: C.inkDim }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <TeamLogo shortKey={teamAKey} size={18} />
                <span>Side A: <strong>{teamA.short || teamAKey}</strong></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <TeamLogo shortKey={teamBKey} size={18} />
                <span>Side B: <strong>{teamB.short || teamBKey}</strong></span>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <BigButton
                onClick={handleFlipCoin}
                disabled={isFlipping}
                bg={isFlipping ? C.panel2 : C.tape}
                color={isFlipping ? C.inkFaint : "#0A110D"}
                style={{ width: "100%", padding: "12px 0", fontSize: 16, fontWeight: 800 }}
              >
                {isFlipping ? "🪙 Flipping Coin in Air..." : "🪙 FLIP COIN FOR TOSS"}
              </BigButton>
            </div>
          </Panel>
        )}

        {/* STEP 2: TOSS DECISION */}
        {setupStep === "decision" && (
          <Panel style={{ padding: 18, textAlign: "center", background: `radial-gradient(circle at center, rgba(82,196,116,0.12), ${C.panel})` }}>
            <div style={{ fontSize: 32 }}>🏆</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.tape, marginTop: 4 }}>
              {winnerObj?.name || tossWinner} WON THE TOSS!
            </div>
            <div style={{ fontSize: 13, color: C.ink, marginTop: 6 }}>
              What will <strong>{winnerObj?.short || tossWinner}</strong> choose to do?
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 }}>
              <BigButton
                onClick={() => {
                  setTossDecision("bat");
                  setSetupStep("playingXI");
                }}
                bg={C.win}
                color="#0A110D"
                style={{ padding: "16px 8px", fontSize: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
              >
                <span style={{ fontSize: 26 }}>🏏</span>
                <span style={{ fontWeight: 800 }}>BAT FIRST</span>
              </BigButton>

              <BigButton
                onClick={() => {
                  setTossDecision("bowl");
                  setSetupStep("playingXI");
                }}
                bg={C.free}
                color="#0A110D"
                style={{ padding: "16px 8px", fontSize: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
              >
                <span style={{ fontSize: 26 }}>⚾</span>
                <span style={{ fontWeight: 800 }}>BOWL FIRST</span>
              </BigButton>
            </div>

            <button
              onClick={() => {
                setSetupStep("toss");
                setTossWinner(null);
              }}
              style={{ background: "none", border: "none", color: C.inkDim, fontSize: 12, marginTop: 16, cursor: "pointer", textDecoration: "underline" }}
            >
              🔄 Re-flip Coin Toss
            </button>
          </Panel>
        )}

        {/* STEP 3: SELECT PLAYING XI FOR BOTH TEAMS */}
        {setupStep === "playingXI" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: "8px 12px", background: "rgba(242,169,59,0.12)", border: `1px solid ${C.tape}`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: C.tape, fontWeight: 700 }}>
                🪙 {winnerObj?.short || tossWinner} won toss & elected to {tossDecision.toUpperCase()} first
              </div>
              <button
                onClick={() => setSetupStep("decision")}
                style={{ background: "none", border: "none", color: C.inkDim, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
              >
                Change Toss
              </button>
            </div>

            {/* TEAM A PLAYING XI SELECTION */}
            <Panel style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <TeamLogo shortKey={teamAKey} size={20} />
                  <Label>{teamA.name} Playing Squad</Label>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.tape }}>
                  {selectedA.length} Selected
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.inkDim, marginBottom: 8 }}>
                Select players in the playing lineup for this match:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 120, overflowY: "auto" }}>
                {(teamA.players || []).map((p) => {
                  const isSel = selectedA.includes(p);
                  return (
                    <Chip
                      key={p}
                      active={isSel}
                      onClick={() => {
                        setSelectedA((prev) => isSel ? prev.filter((x) => x !== p) : [...prev, p]);
                      }}
                      style={{ fontSize: 11, padding: "5px 9px" }}
                    >
                      {isSel ? "✓ " : "+ "}{p}
                    </Chip>
                  );
                })}
              </div>
            </Panel>

            {/* TEAM B PLAYING XI SELECTION */}
            <Panel style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <TeamLogo shortKey={teamBKey} size={20} />
                  <Label>{teamB.name} Playing Squad</Label>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.tape }}>
                  {selectedB.length} Selected
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.inkDim, marginBottom: 8 }}>
                Select players in the playing lineup for this match:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 120, overflowY: "auto" }}>
                {(teamB.players || []).map((p) => {
                  const isSel = selectedB.includes(p);
                  return (
                    <Chip
                      key={p}
                      active={isSel}
                      onClick={() => {
                        setSelectedB((prev) => isSel ? prev.filter((x) => x !== p) : [...prev, p]);
                      }}
                      style={{ fontSize: 11, padding: "5px 9px" }}
                    >
                      {isSel ? "✓ " : "+ "}{p}
                    </Chip>
                  );
                })}
              </div>
            </Panel>

            {/* EMERGENCY SQUAD ADDITION */}
            <Panel style={{ padding: 12 }}>
              <Label style={{ fontSize: 11 }}>+ Add Emergency Player to Squad</Label>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <select
                  value={emergencyTeam}
                  onChange={(e) => setEmergencyTeam(e.target.value)}
                  style={{ padding: "6px 8px", background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, borderRadius: 6, fontSize: 11 }}
                >
                  <option value={teamAKey}>{teamA.short || teamAKey}</option>
                  <option value={teamBKey}>{teamB.short || teamBKey}</option>
                </select>
                <input
                  type="text"
                  placeholder="Player full name"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  style={{ flex: 1, padding: "6px 8px", background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, borderRadius: 6, fontSize: 11 }}
                />
                <button
                  onClick={handleAddEmergencyPlayer}
                  className="tb-btn"
                  style={{ background: C.tape, color: "#0A110D", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
                >
                  Add
                </button>
              </div>
            </Panel>

            <BigButton
              onClick={() => {
                if (selectedA.length < 2 || selectedB.length < 2) {
                  alert("Please select at least 2 players for each team's lineup!");
                  return;
                }
                setSetupStep("openers");
              }}
              bg={C.tape}
              color="#0A110D"
              style={{ width: "100%", padding: "12px 0", fontSize: 15, fontWeight: 800 }}
            >
              Confirm Lineups & Select Openers ➔
            </BigButton>
          </div>
        )}

        {/* STEP 4: SELECT STRIKER, NON-STRIKER & OPENING BOWLER */}
        {setupStep === "openers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            
            {/* TOSS SUMMARY BAR */}
            <div style={{ padding: "8px 12px", background: "rgba(242,169,59,0.12)", border: `1px solid ${C.tape}`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: C.tape, fontWeight: 700 }}>
                🪙 {winnerObj?.short || tossWinner} won toss & elected to {tossDecision.toUpperCase()} first
              </div>
              <button
                onClick={() => setSetupStep("decision")}
                style={{ background: "none", border: "none", color: C.inkDim, fontSize: 10, cursor: "pointer", textDecoration: "underline" }}
              >
                Change
              </button>
            </div>

            {/* OPENERS SELECTION (BATTING TEAM) */}
            <Panel style={{ padding: 14, borderLeft: `4px solid ${C.win}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <TeamLogo shortKey={battingFirstKey} size={22} />
                <Label style={{ color: C.win }}>1. Select Opening Batsmen ({battingTeam.name})</Label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <span style={{ fontSize: 11, color: C.inkDim, fontWeight: 700 }}>Striker (On Strike ⚡):</span>
                  <select
                    value={striker}
                    onChange={(e) => setStriker(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: C.panel2,
                      border: `1px solid ${C.panelBorder}`,
                      color: C.ink,
                      borderRadius: 6,
                      marginTop: 4,
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  >
                    {activeBatPlayers.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <span style={{ fontSize: 11, color: C.inkDim, fontWeight: 700 }}>Non-Striker (Runner):</span>
                  <select
                    value={nonStriker}
                    onChange={(e) => setNonStriker(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: C.panel2,
                      border: `1px solid ${C.panelBorder}`,
                      color: C.ink,
                      borderRadius: 6,
                      marginTop: 4,
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  >
                    {activeBatPlayers.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Panel>

            {/* OPENING BOWLER SELECTION (BOWLING TEAM) */}
            <Panel style={{ padding: 14, borderLeft: `4px solid ${C.free}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <TeamLogo shortKey={bowlingFirstKey} size={22} />
                <Label style={{ color: C.free }}>2. Select Opening Bowler ({bowlingTeam.name})</Label>
              </div>

              <div>
                <span style={{ fontSize: 11, color: C.inkDim, fontWeight: 700 }}>Bowler (Over 1):</span>
                <select
                  value={bowler}
                  onChange={(e) => setBowler(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: C.panel2,
                    border: `1px solid ${C.panelBorder}`,
                    color: C.ink,
                    borderRadius: 6,
                    marginTop: 4,
                    fontSize: 12,
                    fontWeight: 700
                  }}
                >
                  {activeBowlPlayers.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </Panel>

            {/* EMERGENCY PLAYER ADDITION */}
            <Panel style={{ padding: 12 }}>
              <Label style={{ fontSize: 11 }}>+ Add Emergency Player</Label>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <select
                  value={emergencyTeam}
                  onChange={(e) => setEmergencyTeam(e.target.value)}
                  style={{ padding: "6px 8px", background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, borderRadius: 6, fontSize: 11 }}
                >
                  <option value={teamAKey}>{teamA.short || teamAKey}</option>
                  <option value={teamBKey}>{teamB.short || teamBKey}</option>
                </select>
                <input
                  type="text"
                  placeholder="Player full name"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  style={{ flex: 1, padding: "6px 8px", background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, borderRadius: 6, fontSize: 11 }}
                />
                <button
                  onClick={handleAddEmergencyPlayer}
                  className="tb-btn"
                  style={{ background: C.tape, color: "#0A110D", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
                >
                  Add
                </button>
              </div>
            </Panel>

            {/* CONFIRM BUTTON */}
            <BigButton
              onClick={handleConfirm}
              bg={C.tape}
              color="#0A110D"
              style={{ width: "100%", padding: "14px 0", fontSize: 16, fontWeight: 800 }}
            >
              Confirm Openers & Begin Match ⚡
            </BigButton>
          </div>
        )}

      </div>
    </ModalShell>
  );
}

/* =========================================================================
   PHASE 1: ADVANCED SCORING ENGINE & LIVE MATCH CENTRE
   ========================================================================= */
function LiveScoringCentre({
  match,
  role,
  setMatch,
  onUndo,
  canUndo,
  onInningsBreak,
  onMatchDone,
  onBack
}) {
  const inn = match.innings[match.currentInningsIdx];
  const isScorerOrAdmin = role === "scorer" || role === "admin";

  const [wicketModal, setWicketModal] = useState(false);
  const [bowlerModal, setBowlerModal] = useState(() => !inn.currentBowler);
  const [newBatsmanModal, setNewBatsmanModal] = useState(null);
  const [superballActive, setSuperballActive] = useState(false);
  const [activeTab, setActiveTab] = useState("score");
  const [emergencyBatsmanName, setEmergencyBatsmanName] = useState("");
  const [emergencyBowlerName, setEmergencyBowlerName] = useState("");

  const currentOverNum = Math.floor(inn.legalBalls / 6) + 1;
  const isEligibleOverForSuperball = currentOverNum > 1 && currentOverNum < inn.oversLimit;
  const strikerBat = inn.striker ? inn.batsmen[inn.striker] : null;
  const strikerSuperballUsed = Boolean(strikerBat?.superballUsed);
  const canCallSuperball = isEligibleOverForSuperball && !strikerSuperballUsed;

  const striker = inn.striker ? inn.batsmen[inn.striker] : null;
  const nonStriker = inn.nonStriker ? inn.batsmen[inn.nonStriker] : null;
  const currentBowler = inn.currentBowler ? inn.bowlers[inn.currentBowler] : null;

  const maxWktsAllowed = Math.max((inn.battingPlayers?.length || 11) - 1, 1);

  function checkInningsEnd(m2, inn2) {
    const oversDone = inn2.legalBalls >= inn2.oversLimit * 6;
    const allOut = inn2.wkts >= maxWktsAllowed;
    const chased = inn2.target != null && inn2.score >= inn2.target;

    if (!oversDone && !allOut && !chased) {
      return { m2, ended: false };
    }

    inn2.isComplete = true;

    if (m2.currentInningsIdx === 0) {
      m2.status = "break";
      return { m2, ended: true, toBreak: true };
    } else {
      m2.status = "done";
      const inn1 = m2.innings[0];
      if (inn2.score >= inn2.target) {
        const wktsRemaining = maxWktsAllowed - inn2.wkts;
        const ballsRemaining = (inn2.oversLimit * 6) - inn2.legalBalls;
        m2.winner = inn2.battingTeam;
        m2.result = `${inn2.battingTeam} won by ${wktsRemaining} wicket${wktsRemaining === 1 ? "" : "s"} (${ballsRemaining} balls left)`;
      } else if (inn2.score === inn2.target - 1) {
        m2.winner = "";
        m2.result = "Match tied! (Scores level)";
      } else {
        const margin = (inn2.target - 1) - inn2.score;
        m2.winner = inn1.battingTeam;
        m2.result = `${inn1.battingTeam} won by ${margin} run${margin === 1 ? "" : "s"}`;
      }
      return { m2, ended: true, toBreak: false };
    }
  }

  function finishOver(m2, inn2) {
    if (inn2.currentBowler && inn2.bowlers[inn2.currentBowler]) {
      const bObj = inn2.bowlers[inn2.currentBowler];
      bObj.overLog = bObj.overLog || [];
      bObj.overLog.push({ runs: inn2.curOverRuns, wkts: inn2.curOverWkts });
      if (inn2.curOverRuns === 0) bObj.maidens = (bObj.maidens || 0) + 1;
    }

    inn2.completedOvers = inn2.completedOvers || [];
    inn2.completedOvers.push({
      overNum: Math.floor(inn2.legalBalls / 6),
      bowler: inn2.currentBowler,
      runs: inn2.curOverRuns,
      wkts: inn2.curOverWkts,
      balls: [...inn2.currentOverBalls]
    });

    inn2.curOverRuns = 0;
    inn2.curOverWkts = 0;
    inn2.currentOverBalls = [];

    const tmp = inn2.striker;
    inn2.striker = inn2.nonStriker;
    inn2.nonStriker = tmp;

    inn2.prevBowler = inn2.currentBowler;
    inn2.currentBowler = null;
  }

  function applyRuns(runs) {
    if (!inn.currentBowler) {
      setBowlerModal(true);
      return;
    }
    const m2 = structuredClone(match);
    const inn2 = m2.innings[m2.currentInningsIdx];
    const bat = inn2.batsmen[inn2.striker];
    const bowl = inn2.bowlers[inn2.currentBowler];

    const isSB = superballActive;
    // Superball rules: runs scored by batsman are doubled (e.g. six = 12 runs, 0 = 0)
    const effectiveRuns = isSB ? (runs * 2) : runs;

    if (bat) {
      bat.runs += effectiveRuns;
      bat.balls += 1;
      if (runs === 4) bat.fours = (bat.fours || 0) + 1;
      if (runs === 6) bat.sixes = (bat.sixes || 0) + 1;
      if (isSB) bat.superballUsed = true;
    }
    if (bowl) {
      bowl.runs += effectiveRuns;
      bowl.balls += 1;
    }

    inn2.score += effectiveRuns;
    inn2.legalBalls += 1;
    inn2.curOverRuns += effectiveRuns;
    inn2.freeHit = false;

    const ballLabel = isSB
      ? (runs === 0 ? "SB:•" : `SB:${effectiveRuns}`)
      : (runs === 0 ? "•" : String(runs));
    const ballData = { type: "run", runs: effectiveRuns, label: ballLabel, isSuperball: isSB };
    inn2.currentOverBalls.push(ballData);

    const cText = isSB
      ? (runs === 0
          ? `⚡ SUPERBALL: ${inn2.striker} dots the ball. No runs scored.`
          : `⚡ SUPERBALL! ${inn2.striker} hits for ${effectiveRuns} RUNS (${runs} doubled)!`)
      : createCommentaryText(ballData, inn2.striker, inn2.currentBowler);

    inn2.commentary.unshift({
      over: oversStr(inn2.legalBalls),
      text: cText,
      type: runs === 6 ? "six" : runs === 4 ? "four" : runs === 0 ? "dot" : "run"
    });

    if (isSB) setSuperballActive(false);

    if (runs % 2 === 1) {
      const t = inn2.striker;
      inn2.striker = inn2.nonStriker;
      inn2.nonStriker = t;
    }

    const { m2: m3, ended, toBreak } = checkInningsEnd(m2, inn2);
    if (ended) {
      if (toBreak) { setMatch(m3); onInningsBreak(m3); return; }
      else { onMatchDone(m3); return; }
    }

    if (inn2.legalBalls % 6 === 0) {
      finishOver(m3, inn2);
      setMatch(m3);
      setBowlerModal(true);
      return;
    }
    setMatch(m3);
  }

  function applyWide(extraRuns = 0) {
    if (!inn.currentBowler) {
      setBowlerModal(true);
      return;
    }
    const m2 = structuredClone(match);
    const inn2 = m2.innings[m2.currentInningsIdx];
    const bowl = inn2.bowlers[inn2.currentBowler];
    const totalRuns = 1 + extraRuns;

    inn2.extras.wd += totalRuns;
    inn2.score += totalRuns;
    if (bowl) bowl.runs += totalRuns;
    inn2.curOverRuns += totalRuns;

    const ballData = { type: "wide", runs: totalRuns, label: extraRuns > 0 ? `wd+${extraRuns}` : "wd" };
    inn2.currentOverBalls.push(ballData);

    const cText = superballActive
      ? `Wide called. Superball remains active for re-bowl.`
      : createCommentaryText(ballData, inn2.striker, inn2.currentBowler);
    inn2.commentary.unshift({ over: oversStr(inn2.legalBalls), text: cText, type: "wide" });

    if (extraRuns % 2 === 1) {
      const t = inn2.striker;
      inn2.striker = inn2.nonStriker;
      inn2.nonStriker = t;
    }

    const { m2: m3, ended, toBreak } = checkInningsEnd(m2, inn2);
    if (ended) {
      if (toBreak) { setMatch(m3); onInningsBreak(m3); return; }
      else { onMatchDone(m3); return; }
    }
    setMatch(m3);
  }

  function applyNoBall(runsOffBat = 0) {
    if (!inn.currentBowler) {
      setBowlerModal(true);
      return;
    }
    const m2 = structuredClone(match);
    const inn2 = m2.innings[m2.currentInningsIdx];
    const bat = inn2.batsmen[inn2.striker];
    const bowl = inn2.bowlers[inn2.currentBowler];
    const totalRuns = 1 + runsOffBat;

    inn2.extras.nb += 1;
    inn2.score += totalRuns;

    if (runsOffBat > 0 && bat) {
      bat.runs += runsOffBat;
      bat.balls += 1;
      if (runsOffBat === 4) bat.fours = (bat.fours || 0) + 1;
      if (runsOffBat === 6) bat.sixes = (bat.sixes || 0) + 1;
    }

    if (bowl) bowl.runs += totalRuns;
    inn2.curOverRuns += totalRuns;
    inn2.freeHit = true;

    const label = runsOffBat > 0 ? `nb+${runsOffBat}` : "nb";
    const ballData = { type: "noball", runs: totalRuns, label };
    inn2.currentOverBalls.push(ballData);

    const cText = superballActive
      ? `NO BALL! Extra run and Free Hit awarded! Superball remains active.`
      : createCommentaryText(ballData, inn2.striker, inn2.currentBowler);
    inn2.commentary.unshift({ over: oversStr(inn2.legalBalls), text: cText, type: "noball" });

    if (runsOffBat % 2 === 1) {
      const t = inn2.striker;
      inn2.striker = inn2.nonStriker;
      inn2.nonStriker = t;
    }

    const { m2: m3, ended, toBreak } = checkInningsEnd(m2, inn2);
    if (ended) {
      if (toBreak) { setMatch(m3); onInningsBreak(m3); return; }
      else { onMatchDone(m3); return; }
    }
    setMatch(m3);
  }

  function applyWicket({ outType, whoOut, runsCompleted, newBatsmanName }) {
    if (!inn.currentBowler) {
      setBowlerModal(true);
      return;
    }
    const m2 = structuredClone(match);
    const inn2 = m2.innings[m2.currentInningsIdx];
    const bowl = inn2.bowlers[inn2.currentBowler];
    const outPlayerName = whoOut === "striker" ? inn2.striker : inn2.nonStriker;
    const bat = inn2.batsmen[outPlayerName];

    const isSB = superballActive && whoOut === "striker";
    const isBowled = outType === "bowled";

    if (isSB && isBowled) {
      // Superball rule: If batsman gets bowled, app cuts 5 runs!
      inn2.score = Math.max(0, inn2.score - 5);
      inn2.curOverRuns = Math.max(0, inn2.curOverRuns - 5);
    }

    if (runsCompleted > 0) {
      const scoringBat = inn2.batsmen[inn2.striker];
      if (scoringBat) scoringBat.runs += runsCompleted;
      inn2.score += runsCompleted;
      inn2.curOverRuns += runsCompleted;
    }

    if (bat) {
      bat.out = true;
      bat.how = outType;
      if (outType !== "run out" && outType !== "retired") {
        bat.bowler = inn2.currentBowler;
      }
      if (outType !== "retired") {
        bat.balls += outType === "run out" ? 0 : 1;
      }
      if (isSB) bat.superballUsed = true;
    }

    if (outType !== "run out" && outType !== "retired" && bowl) {
      bowl.wkts += 1;
      bowl.balls += 1;
    } else if (bowl && outType === "run out") {
      bowl.balls += 1;
    }

    if (outType !== "retired") {
      inn2.legalBalls += 1;
      inn2.wkts += 1;
      inn2.curOverWkts += 1;
      const wLabel = (isSB && isBowled) ? "SB:W(-5)" : (isSB ? "SB:W" : "W");
      inn2.currentOverBalls.push({ type: "wicket", outType, label: wLabel, isSuperball: isSB });
    }
    inn2.freeHit = false;

    const cText = (isSB && isBowled)
      ? `⚡ SUPERBALL BOWLED! ${outPlayerName} was BOWLED on Superball! 5 runs deducted from ${inn2.battingTeam}!`
      : createCommentaryText({ type: "wicket", outType }, outPlayerName, inn2.currentBowler);
    inn2.commentary.unshift({ over: oversStr(inn2.legalBalls), text: cText, type: "wicket" });

    if (isSB) setSuperballActive(false);

    const allOutNow = inn2.wkts >= maxWktsAllowed;
    if (!allOutNow && newBatsmanName) {
      inn2.batsmen[newBatsmanName] = inn2.batsmen[newBatsmanName] || emptyBatsman(newBatsmanName);
      if (!inn2.order.includes(newBatsmanName)) inn2.order.push(newBatsmanName);
      if (whoOut === "striker") inn2.striker = newBatsmanName;
      else inn2.nonStriker = newBatsmanName;
    }

    if (runsCompleted % 2 === 1) {
      const t = inn2.striker;
      inn2.striker = inn2.nonStriker;
      inn2.nonStriker = t;
    }

    const { m2: m3, ended, toBreak } = checkInningsEnd(m2, inn2);
    setWicketModal(false);
    setNewBatsmanModal(null);

    if (ended) {
      if (toBreak) { setMatch(m3); onInningsBreak(m3); return; }
      else { onMatchDone(m3); return; }
    }

    if (outType !== "retired" && inn2.legalBalls % 6 === 0) {
      finishOver(m3, inn2);
      setMatch(m3);
      setBowlerModal(true);
      return;
    }
    setMatch(m3);
  }

  function pickBowler(bName) {
    const m2 = structuredClone(match);
    const inn2 = m2.innings[m2.currentInningsIdx];
    inn2.currentBowler = bName;
    inn2.bowlers[bName] = inn2.bowlers[bName] || emptyBowler(bName);
    if (!inn2.bowlingPlayers.includes(bName)) inn2.bowlingPlayers.push(bName);
    setMatch(m2);
    setBowlerModal(false);
  }

  function handleManualSwap() {
    const m2 = structuredClone(match);
    const inn2 = m2.innings[m2.currentInningsIdx];
    const t = inn2.striker;
    inn2.striker = inn2.nonStriker;
    inn2.nonStriker = t;
    setMatch(m2);
  }

  const unbattedPlayers = (inn.battingPlayers || []).filter((p) => !inn.order.includes(p));

  const runRate = inn.legalBalls > 0 ? ((inn.score / inn.legalBalls) * 6).toFixed(2) : "0.00";
  const ballsLeft = (inn.oversLimit * 6) - inn.legalBalls;
  const reqRuns = inn.target != null ? Math.max(inn.target - inn.score, 0) : null;
  const reqRunRate = (reqRuns != null && ballsLeft > 0) ? ((reqRuns / ballsLeft) * 6).toFixed(2) : null;

  return (
    <div className="tb-fadein" style={{ padding: "16px 16px 80px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button
          onClick={onBack}
          className="tb-btn"
          style={{ background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700 }}
        >
          ← Back
        </button>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: C.tape }}>
            {match.stageName} · {match.teamA} vs {match.teamB}
          </div>
          <div style={{ fontSize: 10, color: C.inkDim }}>
            {inn.battingTeam} Batting ({match.currentInningsIdx === 0 ? "1st Innings" : "2nd Innings"})
          </div>
        </div>

        {isScorerOrAdmin && (
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="tb-btn"
            style={{
              background: canUndo ? "rgba(242,169,59,0.15)" : C.panel2,
              border: `1px solid ${canUndo ? C.tape : C.panelBorder}`,
              color: canUndo ? C.tape : C.inkFaint,
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 800,
              cursor: canUndo ? "pointer" : "not-allowed"
            }}
          >
            ↺ UNDO
          </button>
        )}
      </div>

      <Panel style={{ padding: 18, marginBottom: 14, background: `linear-gradient(180deg, ${C.panel2}, ${C.panel})` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 62, lineHeight: 1, color: C.ink, fontWeight: 700 }}>
                {inn.score}/{inn.wkts}
              </span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 20, color: C.tape, fontWeight: 700 }}>
                ({oversStr(inn.legalBalls)} / {inn.oversLimit} ov)
              </span>
            </div>
            <div style={{ fontSize: 12, color: C.inkDim, marginTop: 4 }}>
              Current RR: <strong style={{ color: C.ink }}>{runRate}</strong>
              {reqRunRate && (
                <> · Req RR: <strong style={{ color: C.free }}>{reqRunRate}</strong> (Need {reqRuns} off {ballsLeft}b)</>
              )}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            {inn.freeHit && (
              <span className="tb-pulse" style={{ background: C.free, color: "#0A110D", fontWeight: 800, fontSize: 10, padding: "3px 8px", borderRadius: 4, letterSpacing: 0.5, display: "inline-block", marginBottom: 6 }}>
                ⚡ FREE HIT ACTIVE
              </span>
            )}
            <div style={{ fontSize: 11, color: C.inkDim }}>
              Extras: <strong>{inn.extras.wd + inn.extras.nb + inn.extras.b + inn.extras.lb}</strong>
              <div style={{ fontSize: 10, color: C.inkFaint }}>(wd {inn.extras.wd}, nb {inn.extras.nb}, b {inn.extras.b}, lb {inn.extras.lb})</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.panelBorder}`, display: "flex", alignItems: "center", gap: 6, overflowX: "auto" }}>
          <Label style={{ marginRight: 6 }}>This Over:</Label>
          {(inn.currentOverBalls || []).length === 0 ? (
            <span style={{ fontSize: 11, color: C.inkFaint }}>Ready for first ball...</span>
          ) : (
            inn.currentOverBalls.map((b, i) => {
              const isWkt = b.type === "wicket";
              const isSix = b.runs === 6;
              const isFour = b.runs === 4;
              const isExtra = b.type === "wide" || b.type === "noball" || b.type === "bye" || b.type === "legbye";

              const badgeBg = isWkt ? C.wicket : isSix ? C.tape : isFour ? C.win : isExtra ? C.free : C.panelBorder;
              const badgeColor = isWkt || isSix || isFour ? "#0A110D" : C.ink;

              return (
                <span
                  key={i}
                  style={{
                    background: badgeBg,
                    color: badgeColor,
                    fontFamily: FONT_MONO,
                    fontWeight: 800,
                    fontSize: 12,
                    padding: "4px 8px",
                    borderRadius: 6,
                    minWidth: 26,
                    textAlign: "center"
                  }}
                >
                  {b.label}
                </span>
              );
            })
          )}
        </div>
      </Panel>

      <Panel style={{ padding: 14, marginBottom: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
          <thead>
            <tr style={{ color: C.inkDim, borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center" }}>
              <th style={{ textAlign: "left", padding: "4px 0" }}>Batsman</th>
              <th>R</th>
              <th>B</th>
              <th>4s</th>
              <th>6s</th>
              <th>SR</th>
            </tr>
          </thead>
          <tbody>
            {[
              { bat: striker, isStriker: true },
              { bat: nonStriker, isStriker: false }
            ].map(({ bat, isStriker }, idx) => {
              if (!bat) return null;
              const sr = bat.balls > 0 ? ((bat.runs / bat.balls) * 100).toFixed(1) : "0.0";
              return (
                <tr key={idx} style={{ borderBottom: idx === 0 ? `1px solid ${C.panelBorder}` : "none", textAlign: "center" }}>
                  <td style={{ textAlign: "left", padding: "8px 0", fontWeight: isStriker ? 800 : 600, color: isStriker ? C.tape : C.ink }}>
                    {bat.name} {isStriker ? "★" : ""}
                  </td>
                  <td style={{ fontWeight: 800 }}>{bat.runs}</td>
                  <td style={{ color: C.inkDim }}>{bat.balls}</td>
                  <td>{bat.fours || 0}</td>
                  <td>{bat.sixes || 0}</td>
                  <td style={{ color: C.inkDim }}>{sr}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.panelBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 11, color: C.inkDim }}>Bowler: </span>
            <strong style={{ color: C.tape, fontSize: 13 }}>{currentBowler ? currentBowler.name : "Select Bowler"}</strong>
          </div>
          {currentBowler && (
            <div style={{ fontFamily: FONT_MONO, fontSize: 12 }}>
              {oversStr(currentBowler.balls)} ov · {currentBowler.runs}R · <strong style={{ color: C.wicket }}>{currentBowler.wkts}W</strong> (Econ: {currentBowler.balls > 0 ? ((currentBowler.runs / (currentBowler.balls / 6))).toFixed(1) : "0.0"})
            </div>
          )}
          {isScorerOrAdmin && (
            <button
              onClick={() => setBowlerModal(true)}
              className="tb-btn"
              style={{ background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.tape, borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700 }}
            >
              Change Bowler
            </button>
          )}
        </div>
      </Panel>

      {isScorerOrAdmin ? (
        <Panel style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Label>⚡ Ground Scoring Console</Label>
            <button
              onClick={handleManualSwap}
              className="tb-btn"
              style={{ background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.free, borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700 }}
            >
              ⇄ Swap Strike
            </button>
          </div>

          {superballActive && (
            <div style={{
              background: "linear-gradient(135deg, rgba(242,169,59,0.25), rgba(242,102,29,0.2))",
              border: `1.5px solid ${C.tape}`,
              borderRadius: 8,
              padding: "6px 12px",
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.tape }}>
                ⚡ SUPERBALL ACTIVE • {inn.striker}
              </div>
              <button
                onClick={() => setSuperballActive(false)}
                style={{ background: "none", border: "none", color: C.inkDim, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
              >
                Cancel
              </button>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 10 }}>
            {[0, 1, 2, 3, 4, 6].map((num) => {
              const label = superballActive
                ? (num === 0 ? "• (0)" : `${num} (${num * 2})`)
                : (num === 0 ? "•" : num);
              return (
                <BigButton
                  key={num}
                  onClick={() => applyRuns(num)}
                  bg={superballActive ? (num === 6 ? C.tape : num === 4 ? C.win : "rgba(242,169,59,0.2)") : (num === 6 ? C.tape : num === 4 ? C.win : C.panel2)}
                  color={num === 6 || num === 4 ? "#0A110D" : (superballActive ? C.tape : C.ink)}
                  style={{ padding: "12px 0", fontSize: superballActive && num !== 0 ? 15 : 20, fontFamily: FONT_DISPLAY }}
                >
                  {label}
                </BigButton>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr 1.3fr", gap: 8 }}>
            <BigButton
              onClick={() => applyWide(0)}
              bg="rgba(79,168,214,0.15)"
              color={C.free}
              style={{ border: `1px solid ${C.free}`, padding: "10px 0", fontSize: 13 }}
            >
              WD (+1)
            </BigButton>

            <BigButton
              onClick={() => applyNoBall(0)}
              bg="rgba(242,102,29,0.15)"
              color={C.tape2}
              style={{ border: `1px solid ${C.tape2}`, padding: "10px 0", fontSize: 13 }}
            >
              NB (+1)
            </BigButton>

            <BigButton
              onClick={() => {
                if (!isEligibleOverForSuperball) {
                  alert(`Superball can only be called in overs 2 to ${inn.oversLimit - 1} (Not allowed in 1st or last over)!`);
                  return;
                }
                if (strikerSuperballUsed) {
                  alert(`Superball has already been used by ${inn.striker}!`);
                  return;
                }
                setSuperballActive((prev) => !prev);
              }}
              disabled={!canCallSuperball && !superballActive}
              bg={superballActive ? "linear-gradient(135deg, #F2A93B, #F2661D)" : canCallSuperball ? "rgba(242,169,59,0.18)" : C.panel2}
              color={superballActive ? "#0A110D" : canCallSuperball ? C.tape : C.inkFaint}
              style={{
                border: `1px solid ${superballActive ? "#F2A93B" : canCallSuperball ? C.tape : C.panelBorder}`,
                padding: "10px 0",
                fontSize: 12,
                fontWeight: 800
              }}
            >
              {superballActive ? "⚡ SB ON" : canCallSuperball ? "⚡ SUPERBALL" : strikerSuperballUsed ? "⚡ SB Used" : "⚡ SB (Ov 2-7)"}
            </BigButton>

            <BigButton
              onClick={() => setWicketModal(true)}
              bg={C.wicket}
              color="#fff"
              style={{ padding: "10px 0", fontSize: 14 }}
            >
              🎯 WICKET (OUT)
            </BigButton>
          </div>
        </Panel>
      ) : (
        <Panel style={{ padding: 12, marginBottom: 14, textAlign: "center", background: "rgba(79,168,214,0.1)", border: `1px solid ${C.free}` }}>
          <div style={{ color: C.free, fontSize: 12, fontWeight: 700 }}>
            👁 Spectator Live Mode Active · Updates sync automatically in real-time
          </div>
        </Panel>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <Chip active={activeTab === "score"} onClick={() => setActiveTab("score")}>
          Ball Log
        </Chip>
        <Chip active={activeTab === "commentary"} onClick={() => setActiveTab("commentary")}>
          Live Commentary
        </Chip>
        <Chip active={activeTab === "scorecard"} onClick={() => setActiveTab("scorecard")}>
          Innings Scorecard
        </Chip>
      </div>

      {activeTab === "score" && (
        <Panel style={{ padding: 14 }}>
          <Label>Completed Overs History</Label>
          {(inn.completedOvers || []).length === 0 ? (
            <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 8 }}>No completed overs yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {inn.completedOvers.map((ov, i) => (
                <div key={i} style={{ padding: 10, background: C.panel2, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontFamily: FONT_MONO, color: C.tape, fontWeight: 700 }}>Over {ov.overNum}</span>
                    <span style={{ fontSize: 12, color: C.inkDim, marginLeft: 8 }}>({ov.bowler})</span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(ov.balls || []).map((b, bi) => (
                      <span key={bi} style={{ fontFamily: FONT_MONO, fontSize: 11, background: C.panelBorder, padding: "2px 6px", borderRadius: 4 }}>
                        {b.label}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700 }}>
                    {ov.runs} runs · {ov.wkts} wkt
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {activeTab === "commentary" && (
        <Panel style={{ padding: 14 }}>
          <Label>Live Ball-by-Ball Feed</Label>
          {(inn.commentary || []).length === 0 ? (
            <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 8 }}>Commentary will appear as balls are bowled.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, maxHeight: 340, overflowY: "auto" }}>
              {inn.commentary.map((item, i) => (
                <div key={i} style={{ padding: 8, background: C.panel2, borderRadius: 6, borderLeft: `3px solid ${item.type === "wicket" ? C.wicket : item.type === "six" ? C.tape : C.panelBorder}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.tape, fontWeight: 700 }}>Ov {item.over}</span>
                    {item.type === "wicket" && <span style={{ fontSize: 10, color: C.wicket, fontWeight: 800 }}>WICKET!</span>}
                    {item.type === "six" && <span style={{ fontSize: 10, color: C.tape, fontWeight: 800 }}>MAXIMUM!</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.ink, marginTop: 3 }}>{item.text}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {activeTab === "scorecard" && (
        <Panel style={{ padding: 14 }}>
          <Label>{inn.battingTeam} Batting Scorecard</Label>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12, marginTop: 8 }}>
            <thead>
              <tr style={{ color: C.inkDim, borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center" }}>
                <th style={{ textAlign: "left", padding: "4px 0" }}>Batsman</th>
                <th>R</th>
                <th>B</th>
                <th>4s</th>
                <th>6s</th>
                <th>SR</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(inn.batsmen || {}).map((b, idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center" }}>
                  <td style={{ textAlign: "left", padding: "6px 0" }}>
                    <div style={{ fontWeight: 700, color: b.out ? C.inkDim : C.tape }}>
                      {b.name} {!b.out ? "*" : ""}
                    </div>
                    {b.out && (
                      <div style={{ fontSize: 10, color: C.inkFaint }}>
                        {b.how} {b.bowler ? `b ${b.bowler}` : ""}
                      </div>
                    )}
                  </td>
                  <td style={{ fontWeight: 800 }}>{b.runs}</td>
                  <td>{b.balls}</td>
                  <td>{b.fours || 0}</td>
                  <td>{b.sixes || 0}</td>
                  <td>{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(0) : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {wicketModal && (
        <WicketModal
          isFreeHit={inn.freeHit}
          striker={inn.striker}
          nonStriker={inn.nonStriker}
          unbattedPlayers={unbattedPlayers}
          onClose={() => setWicketModal(false)}
          onConfirm={(dismissalData) => {
            const allOutCheck = (inn.wkts + 1) >= maxWktsAllowed;
            if (allOutCheck) {
              applyWicket({ ...dismissalData, newBatsmanName: null });
            } else {
              setNewBatsmanModal(dismissalData);
              setWicketModal(false);
            }
          }}
        />
      )}

      {newBatsmanModal && (
        <ModalShell title="WICKET! Select Next Batsman" onClose={null}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: "8px 12px", background: "rgba(224,72,59,0.15)", border: `1px solid ${C.wicket}`, borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: C.wicket, fontWeight: 800 }}>
                🎯 Wicket Fallen: {newBatsmanModal.whoOut === "striker" ? inn.striker : inn.nonStriker} ({newBatsmanModal.outType})
              </div>
              <div style={{ fontSize: 11, color: C.inkDim, marginTop: 2 }}>
                Who is the new batsman entering the crease for {inn.battingTeam}?
              </div>
            </div>

            <Label>Available Squad Batsmen</Label>
            {unbattedPlayers.length === 0 ? (
              <div style={{ color: C.wicket, fontSize: 12 }}>No remaining unbatted players in initial squad. Enter an emergency batsman below:</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                {unbattedPlayers.map((p) => (
                  <BigButton
                    key={p}
                    onClick={() => {
                      applyWicket({ ...newBatsmanModal, newBatsmanName: p });
                      setEmergencyBatsmanName("");
                    }}
                    bg={C.panel2}
                    color={C.ink}
                    style={{ textAlign: "left", padding: "10px 14px", fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <span style={{ fontWeight: 700 }}>{p}</span>
                    <span style={{ fontSize: 11, color: C.tape, fontWeight: 700 }}>Send to Crease ➔</span>
                  </BigButton>
                ))}
              </div>
            )}

            {/* Emergency Batsman Input */}
            <div style={{ borderTop: `1px solid ${C.panelBorder}`, paddingTop: 10 }}>
              <Label style={{ fontSize: 11 }}>+ Add Emergency Batsman</Label>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input
                  type="text"
                  placeholder="Batsman full name"
                  value={emergencyBatsmanName}
                  onChange={(e) => setEmergencyBatsmanName(e.target.value)}
                  style={{ flex: 1, padding: "8px 10px", background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, borderRadius: 6, fontSize: 12 }}
                />
                <button
                  onClick={() => {
                    if (emergencyBatsmanName.trim()) {
                      const clean = emergencyBatsmanName.trim();
                      if (!inn.battingPlayers.includes(clean)) inn.battingPlayers.push(clean);
                      applyWicket({ ...newBatsmanModal, newBatsmanName: clean });
                      setEmergencyBatsmanName("");
                    }
                  }}
                  className="tb-btn"
                  style={{ background: C.win, color: "#0A110D", border: "none", borderRadius: 6, padding: "8px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                >
                  Send In
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {bowlerModal && (
        <ModalShell title={`Over ${Math.floor(inn.legalBalls / 6)} Completed · Select Next Bowler`} onClose={null}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: "8px 12px", background: "rgba(79,168,214,0.12)", border: `1px solid ${C.free}`, borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: C.free, fontWeight: 800 }}>
                ⚾ Over {Math.floor(inn.legalBalls / 6)} Completed!
              </div>
              <div style={{ fontSize: 11, color: C.inkDim, marginTop: 2 }}>
                Previous bowler was <strong>{inn.prevBowler || "none"}</strong>. Select next bowler for {inn.bowlingTeam} (consecutive overs prohibited):
              </div>
            </div>

            <Label>Eligible Bowlers ({inn.bowlingTeam})</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
              {inn.bowlingPlayers
                .filter((p) => p !== inn.prevBowler)
                .map((p) => {
                  const bStats = inn.bowlers[p];
                  const oversBowled = bStats ? oversStr(bStats.balls) : "0.0";
                  const runsConc = bStats ? bStats.runs : 0;
                  const wktsTaken = bStats ? bStats.wkts : 0;
                  return (
                    <BigButton
                      key={p}
                      onClick={() => {
                        pickBowler(p);
                        setEmergencyBowlerName("");
                      }}
                      bg={C.panel2}
                      color={C.ink}
                      style={{ textAlign: "left", padding: "10px 14px", fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <span style={{ fontWeight: 700 }}>{p}</span>
                      <span style={{ fontFamily: FONT_MONO, color: C.tape, fontSize: 12 }}>
                        {oversBowled} ov · {runsConc}r · {wktsTaken}w
                      </span>
                    </BigButton>
                  );
                })}
            </div>

            {/* Emergency Bowler Input */}
            <div style={{ borderTop: `1px solid ${C.panelBorder}`, paddingTop: 10 }}>
              <Label style={{ fontSize: 11 }}>+ Add Emergency Bowler</Label>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input
                  type="text"
                  placeholder="Bowler full name"
                  value={emergencyBowlerName}
                  onChange={(e) => setEmergencyBowlerName(e.target.value)}
                  style={{ flex: 1, padding: "8px 10px", background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, borderRadius: 6, fontSize: 12 }}
                />
                <button
                  onClick={() => {
                    if (emergencyBowlerName.trim()) {
                      const clean = emergencyBowlerName.trim();
                      pickBowler(clean);
                      setEmergencyBowlerName("");
                    }
                  }}
                  className="tb-btn"
                  style={{ background: C.free, color: "#0A110D", border: "none", borderRadius: 6, padding: "8px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                >
                  Select & Bowl
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}


    </div>
  );
}

/* =========================================================================
   WICKET MODAL COMPONENT
   ========================================================================= */
function WicketModal({ isFreeHit, striker, nonStriker, onClose, onConfirm }) {
  const [outType, setOutType] = useState(isFreeHit ? "run out" : "bowled");
  const [whoOut, setWhoOut] = useState("striker");
  const [runsCompleted, setRunsCompleted] = useState(0);

  const dismissalTypes = isFreeHit
    ? ["run out"]
    : ["bowled", "caught", "lbw", "run out", "stumped", "hit wicket", "retired"];

  function handleTypeClick(t) {
    if (t !== "run out") {
      onConfirm({ outType: t, whoOut: "striker", runsCompleted: 0 });
    } else {
      setOutType("run out");
    }
  }

  return (
    <ModalShell title={isFreeHit ? "Wicket (Free Hit Active)" : "Select Wicket Dismissal"} onClose={onClose}>
      {isFreeHit && (
        <div style={{ color: C.free, fontSize: 12, marginBottom: 10, fontWeight: 700 }}>
          ⚡ Free Hit in progress: Only Run Out is valid under cricket rules!
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {dismissalTypes.map((t) => (
          <Chip key={t} active={outType === t} onClick={() => handleTypeClick(t)}>
            {t.toUpperCase()} {t !== "run out" ? "⚡ (1-Tap)" : ""}
          </Chip>
        ))}
      </div>

      {outType === "run out" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <Label>Who was run out?</Label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <Chip active={whoOut === "striker"} onClick={() => setWhoOut("striker")}>
                Striker: {striker || "Striker"}
              </Chip>
              <Chip active={whoOut === "nonStriker"} onClick={() => setWhoOut("nonStriker")}>
                Non-Striker: {nonStriker || "Non-Striker"}
              </Chip>
            </div>
          </div>

          <div>
            <Label>Runs completed before run out:</Label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {[0, 1, 2, 3].map((n) => (
                <Chip key={n} active={runsCompleted === n} onClick={() => setRunsCompleted(n)}>
                  {n}
                </Chip>
              ))}
            </div>
          </div>

          <BigButton
            onClick={() => onConfirm({ outType: "run out", whoOut, runsCompleted })}
            bg={C.wicket}
            color="#fff"
            style={{ width: "100%", marginTop: 8 }}
          >
            Confirm Run Out
          </BigButton>
        </div>
      )}
    </ModalShell>
  );
}

/* =========================================================================
   PHASE 1: INNINGS BREAK & MATCH FINAL VALIDATION
   ========================================================================= */
function InningsBreakScreen({ match, onStartSecondInnings }) {
  const inn1 = match.innings[0];
  const target = inn1.score + 1;

  const [striker, setStriker] = useState(() => inn1.bowlingPlayers[0] || "");
  const [nonStriker, setNonStriker] = useState(() => inn1.bowlingPlayers[1] || "");
  const [bowler, setBowler] = useState(() => inn1.battingPlayers[0] || "");

  const handleStart = () => {
    if (!striker || !nonStriker || striker === nonStriker) {
      alert("Please select two distinct opening batsmen for the 2nd Innings!");
      return;
    }
    if (!bowler) {
      alert("Please select an opening bowler!");
      return;
    }

    const inn2 = newInnings(inn1.bowlingTeam, inn1.battingTeam, inn1.bowlingPlayers, inn1.battingPlayers, inn1.oversLimit, target);
    inn2.batsmen[striker] = emptyBatsman(striker);
    inn2.batsmen[nonStriker] = emptyBatsman(nonStriker);
    inn2.bowlers[bowler] = emptyBowler(bowler);
    inn2.striker = striker;
    inn2.nonStriker = nonStriker;
    inn2.currentBowler = bowler;
    inn2.order = [striker, nonStriker];

    const m2 = structuredClone(match);
    m2.innings.push(inn2);
    m2.currentInningsIdx = 1;
    m2.status = "live";

    onStartSecondInnings(m2);
  };

  return (
    <div className="tb-fadein" style={{ padding: "16px 16px 80px", maxWidth: 640, margin: "0 auto" }}>
      <Panel style={{ padding: 20, textAlign: "center", marginBottom: 16 }}>
        <Label style={{ color: C.tape }}>INNINGS BREAK</Label>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, marginTop: 4 }}>
          {inn1.battingTeam} scored {inn1.score}/{inn1.wkts} ({oversStr(inn1.legalBalls)} ov)
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 24, color: C.win, marginTop: 8, fontWeight: 700 }}>
          TARGET: {target} RUNS
        </div>
        <div style={{ fontSize: 13, color: C.inkDim, marginTop: 4 }}>
          {inn1.bowlingTeam} needs {target} runs off {inn1.oversLimit * 6} balls (Req RR: {(target / inn1.oversLimit).toFixed(2)})
        </div>
      </Panel>

      <Panel style={{ padding: 16 }}>
        <Label>2nd Innings Openers ({inn1.bowlingTeam})</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <div>
            <span style={{ fontSize: 11, color: C.inkDim }}>Striker:</span>
            <select
              value={striker}
              onChange={(e) => setStriker(e.target.value)}
              style={{ width: "100%", padding: "8px", background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, borderRadius: 6, marginTop: 4 }}
            >
              {inn1.bowlingPlayers.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <span style={{ fontSize: 11, color: C.inkDim }}>Non-Striker:</span>
            <select
              value={nonStriker}
              onChange={(e) => setNonStriker(e.target.value)}
              style={{ width: "100%", padding: "8px", background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, borderRadius: 6, marginTop: 4 }}
            >
              {inn1.bowlingPlayers.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <span style={{ fontSize: 11, color: C.inkDim }}>Opening Bowler ({inn1.battingTeam}):</span>
          <select
            value={bowler}
            onChange={(e) => setBowler(e.target.value)}
            style={{ width: "100%", padding: "8px", background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, borderRadius: 6, marginTop: 4 }}
          >
            {inn1.battingPlayers.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <BigButton onClick={handleStart} bg={C.tape} style={{ width: "100%", marginTop: 18 }}>
          Start 2nd Innings Chase 🚀
        </BigButton>
      </Panel>
    </div>
  );
}

/* =========================================================================
   MATCH RESULT VALIDATION MODAL (PHASE 1)
   ========================================================================= */
function MatchValidationModal({ match, onConfirmSave, onCancel }) {
  const inn1 = match.innings[0];
  const inn2 = match.innings[1];

  let potm = null;
  let maxPoints = -1;

  match.innings.forEach((inn) => {
    Object.values(inn.batsmen || {}).forEach((b) => {
      const pts = (b.runs * 1) + ((b.sixes || 0) * 2) + ((b.fours || 0) * 1);
      if (pts > maxPoints) { maxPoints = pts; potm = { name: b.name, desc: `${b.runs} runs off ${b.balls} balls` }; }
    });
    Object.values(inn.bowlers || {}).forEach((bw) => {
      const pts = (bw.wkts * 22) + ((bw.maidens || 0) * 10) - (bw.runs * 0.5);
      if (pts > maxPoints) { maxPoints = pts; potm = { name: bw.name, desc: `${bw.wkts}/${bw.runs} (${oversStr(bw.balls)} ov)` }; }
    });
  });

  return (
    <ModalShell title="Validate & Lock Match Result" onClose={onCancel}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Panel style={{ padding: 14, textAlign: "center", background: C.panel2 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.win }}>
            {match.result}
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 14, color: C.tape, marginTop: 6 }}>
            {inn1.battingTeam}: {inn1.score}/{inn1.wkts} ({oversStr(inn1.legalBalls)} ov)
          </div>
          {inn2 && (
            <div style={{ fontFamily: FONT_MONO, fontSize: 14, color: C.ink, marginTop: 4 }}>
              {inn2.battingTeam}: {inn2.score}/{inn2.wkts} ({oversStr(inn2.legalBalls)} ov)
            </div>
          )}
        </Panel>

        {potm && (
          <Panel style={{ padding: 12, borderLeft: `3px solid ${C.tape}` }}>
            <Label>Suggested Player of the Match</Label>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, marginTop: 2 }}>
              {potm.name}
            </div>
            <div style={{ fontSize: 11, color: C.inkDim }}>{potm.desc}</div>
          </Panel>
        )}

        <div style={{ fontSize: 12, color: C.inkDim, lineHeight: 1.5 }}>
          ⚠️ Once confirmed, the score will be officially recorded in NSL database, standings and leaderboards updated, and the match locked.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
          <BigButton onClick={onCancel} bg={C.panel2} color={C.ink}>
            Return to Scorer
          </BigButton>
          <BigButton onClick={onConfirmSave} bg={C.win} color="#0A110D">
            Lock & Save Result ✓
          </BigButton>
        </div>
      </div>
    </ModalShell>
  );
}

/* =========================================================================
   PHASE 3: POINTS TABLE & PLAYOFF BRACKET SCREEN
   ========================================================================= */
function StandingsAndBracketScreen({ schedule, completedMatches, nslTeams, onStartMatch }) {
  const [tab, setTab] = useState("standings");
  const standings = useMemo(() => calculateStandings(completedMatches), [completedMatches]);

  return (
    <div className="tb-fadein" style={{ padding: "16px 16px 80px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Chip active={tab === "standings"} onClick={() => setTab("standings")}>
          📊 Group Standings (Round 1)
        </Chip>
        <Chip active={tab === "bracket"} onClick={() => setTab("bracket")}>
          🏆 Playoff Bracket Tree
        </Chip>
      </div>

      {tab === "standings" && (
        <div>
          <Panel style={{ padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <Label>NSL S2 Official Points Table</Label>
                <div style={{ fontSize: 11, color: C.inkDim, marginTop: 2 }}>
                  Official League Standings & Net Run Rate (Win=2, Tie=1, Loss=0)
                </div>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
                <thead>
                  <tr style={{ color: C.inkDim, borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center" }}>
                    <th style={{ textAlign: "left", padding: "8px 0" }}>Team</th>
                    <th>P</th>
                    <th>W</th>
                    <th>L</th>
                    <th>T</th>
                    <th>PTS</th>
                    <th>NRR</th>
                    <th>Form</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((st, idx) => {
                    return (
                      <tr key={st.teamKey} style={{ borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center" }}>
                        <td style={{ textAlign: "left", padding: "10px 0" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: C.tape, width: 14, textAlign: "center" }}>
                              {idx + 1}
                            </span>
                            <TeamLogo shortKey={st.teamKey} size={24} />
                            <div>
                              <div style={{ fontWeight: 800, color: C.ink }}>{st.teamKey}</div>
                              <div style={{ fontSize: 10, color: C.inkDim }}>{nslTeams[st.teamKey]?.name || st.teamKey}</div>
                            </div>
                          </div>
                        </td>
                        <td>{st.played}</td>
                        <td style={{ color: C.win, fontWeight: 700 }}>{st.won}</td>
                        <td style={{ color: C.wicket }}>{st.lost}</td>
                        <td>{st.tied}</td>
                        <td style={{ fontWeight: 800, color: C.tape, fontSize: 14 }}>{st.pts}</td>
                        <td style={{ color: st.nrr >= 0 ? C.win : C.wicket }}>
                          {st.nrr > 0 ? `+${st.nrr.toFixed(3)}` : st.nrr.toFixed(3)}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                            {st.form.slice(-3).map((f, fi) => (
                              <span
                                key={fi}
                                style={{
                                  fontSize: 9,
                                  fontWeight: 800,
                                  padding: "1px 4px",
                                  borderRadius: 3,
                                  background: f === "W" ? C.win : f === "L" ? C.wicket : C.panelBorder,
                                  color: f === "W" || f === "L" ? "#0A110D" : C.ink
                                }}
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {tab === "bracket" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {(() => {
            const m7 = (schedule || []).find((x) => x.id === "m7");
            return (
              <Panel style={{ padding: 16, border: `1.5px solid ${C.free}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: C.free }}>
                    KNOCKOUT QUALIFIER · 2ND VS 3RD
                  </span>
                  <span style={{ fontSize: 11, color: C.inkDim }}>Winner advances to Grand Final</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "12px 0" }}>
                  <div style={{ textAlign: "center" }}>
                    <TeamLogo shortKey={m7?.teamA} size={40} />
                    <div style={{ fontWeight: 800, marginTop: 4 }}>{m7?.teamA}</div>
                  </div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: C.tape }}>VS</div>
                  <div style={{ textAlign: "center" }}>
                    <TeamLogo shortKey={m7?.teamB} size={40} />
                    <div style={{ fontWeight: 800, marginTop: 4 }}>{m7?.teamB}</div>
                  </div>
                </div>
                {m7?.status === "done" ? (
                  <div style={{ textAlign: "center", color: C.win, fontWeight: 800, fontSize: 13, marginTop: 6 }}>
                    ✓ {m7.result} (Winner: {m7.winner})
                  </div>
                ) : m7?.status === "pending" ? (
                  <BigButton onClick={() => onStartMatch(m7)} bg={C.free} color="#0A110D" style={{ width: "100%", marginTop: 8 }}>
                    Play Knockout Match ⚡
                  </BigButton>
                ) : (
                  <div style={{ textAlign: "center", color: C.inkFaint, fontSize: 12, marginTop: 6 }}>
                    🔒 Unlocks when all 6 Round 1 matches conclude
                  </div>
                )}
              </Panel>
            );
          })()}

          <div style={{ textAlign: "center", color: C.tape, fontSize: 20 }}>↓</div>

          {(() => {
            const m8 = (schedule || []).find((x) => x.id === "m8");
            return (
              <Panel style={{ padding: 18, border: `2px solid ${C.tape}`, background: `linear-gradient(135deg, rgba(242,169,59,0.15), ${C.panel})` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.tape, letterSpacing: 1 }}>
                    🏆 NSL S2 GRAND FINAL
                  </span>
                  <span style={{ fontSize: 11, color: C.tape }}>CHAMPIONSHIP MATCH</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "14px 0" }}>
                  <div style={{ textAlign: "center" }}>
                    <TeamLogo shortKey={m8?.teamA} size={48} />
                    <div style={{ fontWeight: 800, marginTop: 6, fontSize: 15 }}>{m8?.teamA}</div>
                    <span style={{ fontSize: 10, color: C.tape }}>(Rank 1 Seed)</span>
                  </div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: C.tape }}>VS</div>
                  <div style={{ textAlign: "center" }}>
                    <TeamLogo shortKey={m8?.teamB} size={48} />
                    <div style={{ fontWeight: 800, marginTop: 6, fontSize: 15 }}>{m8?.teamB}</div>
                    <span style={{ fontSize: 10, color: C.free }}>(Knockout Winner)</span>
                  </div>
                </div>
                {m8?.status === "done" ? (
                  <div style={{ textAlign: "center", padding: 10, background: "rgba(242,169,59,0.2)", borderRadius: 8, border: `1px solid ${C.tape}` }}>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: C.tape }}>
                      🎉 NSL S2 CHAMPION: {m8.winner} 🎉
                    </div>
                    <div style={{ fontSize: 12, color: C.ink }}>{m8.result}</div>
                  </div>
                ) : m8?.status === "pending" ? (
                  <BigButton onClick={() => onStartMatch(m8)} bg={C.tape} color="#0A110D" style={{ width: "100%", marginTop: 8 }}>
                    Play Grand Final 🏆
                  </BigButton>
                ) : (
                  <div style={{ textAlign: "center", color: C.inkFaint, fontSize: 12, marginTop: 6 }}>
                    🔒 Awaiting completion of Knockout Qualifier
                  </div>
                )}
              </Panel>
            );
          })()}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   PHASE 3: FIXTURES SCREEN
   ========================================================================= */
function FixturesScreen({ schedule, onStartMatch, onViewScorecard }) {
  return (
    <div className="tb-fadein" style={{ padding: "16px 16px 80px", maxWidth: 720, margin: "0 auto" }}>
      <Label style={{ marginBottom: 12 }}>Tournament Fixtures & Schedule</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(schedule || []).map((m) => {
          const isDone = m.status === "done";
          const isLive = m.status === "live";
          const isLocked = m.status === "locked";

          return (
            <Panel
              key={m.id}
              style={{
                padding: 14,
                borderColor: m.isPlayoff ? C.tape : C.panelBorder,
                background: m.isPlayoff ? "rgba(242,169,59,0.06)" : C.panel
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: m.isPlayoff ? C.tape : C.inkDim }}>
                  {m.stageName}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: isDone ? "rgba(82,196,116,0.15)" : isLive ? "rgba(224,72,59,0.15)" : C.panel2,
                    color: isDone ? C.win : isLive ? C.wicket : C.inkDim
                  }}
                >
                  {isDone ? "COMPLETED" : isLive ? "🔴 LIVE" : isLocked ? "LOCKED" : "UPCOMING"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TeamLogo shortKey={m.teamA} size={28} />
                  <span style={{ fontWeight: 700 }}>{m.teamA}</span>
                </div>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: C.inkDim }}>VS</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>{m.teamB}</span>
                  <TeamLogo shortKey={m.teamB} size={28} />
                </div>
              </div>

              {isDone && m.result && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.panelBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: C.win, fontWeight: 700 }}>{m.result}</span>
                  <button
                    onClick={() => onViewScorecard(m.matchData || m)}
                    style={{ background: "none", border: "none", color: C.tape, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    Scorecard ➔
                  </button>
                </div>
              )}

              {!isDone && !isLocked && (
                <BigButton
                  onClick={() => onStartMatch(m)}
                  bg={m.isPlayoff ? C.win : C.tape}
                  style={{ width: "100%", marginTop: 10, padding: 10, fontSize: 14 }}
                >
                  {isLive ? "Enter Scorer Console ⚡" : "Start Match 🏏"}
                </BigButton>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   PHASE 3: LEADERBOARDS & TOURNAMENT AWARDS
   ========================================================================= */
function LeaderboardsScreen({ completedMatches, nslTeams, onSelectPlayer }) {
  const [tab, setTab] = useState("orange");
  const leaderboards = useMemo(() => calculateOverallLeaderboard(completedMatches, nslTeams), [completedMatches, nslTeams]);

  return (
    <div className="tb-fadein" style={{ padding: "16px 16px 80px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14 }}>
        <Chip active={tab === "orange"} onClick={() => setTab("orange")} color={C.orangeCap}>
          🟠 Orange Cap (Runs)
        </Chip>
        <Chip active={tab === "purple"} onClick={() => setTab("purple")} color={C.purpleCap}>
          🟣 Purple Cap (Wickets)
        </Chip>
        <Chip active={tab === "sixes"} onClick={() => setTab("sixes")}>
          💥 Maximum Sixes
        </Chip>
        <Chip active={tab === "mvp"} onClick={() => setTab("mvp")}>
          👑 Tournament MVP
        </Chip>
        <Chip active={tab === "matchCaps"} onClick={() => setTab("matchCaps")} color={C.tape}>
          🎖️ Match Top Performers
        </Chip>
      </div>

      {tab === "orange" && (
        <Panel style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>🟠</span>
            <div>
              <Label style={{ color: C.orangeCap }}>ORANGE CAP LEADERBOARD</Label>
              <div style={{ fontSize: 11, color: C.inkDim }}>Leading run scorers in NSL Season 2</div>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
            <thead>
              <tr style={{ color: C.inkDim, borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center" }}>
                <th style={{ textAlign: "left", padding: "6px 0" }}>Player</th>
                <th>Inns</th>
                <th>Runs</th>
                <th>HS</th>
                <th>SR</th>
                <th>6s</th>
              </tr>
            </thead>
            <tbody>
              {leaderboards.batList.slice(0, 15).map((b, idx) => (
                <tr
                  key={idx}
                  onClick={() => onSelectPlayer(b.name)}
                  style={{ borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center", cursor: "pointer" }}
                >
                  <td style={{ textAlign: "left", padding: "8px 0", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: idx === 0 ? C.orangeCap : C.inkDim }}>
                      {idx + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, color: idx === 0 ? C.orangeCap : C.ink }}>{b.name}</div>
                      <div style={{ fontSize: 9, color: C.inkDim }}>{b.team}</div>
                    </div>
                  </td>
                  <td>{b.innings}</td>
                  <td style={{ fontWeight: 800, color: C.tape, fontSize: 14 }}>{b.runs}</td>
                  <td>{b.highScore}</td>
                  <td>{b.sr.toFixed(0)}</td>
                  <td style={{ color: C.win }}>{b.sixes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {tab === "purple" && (
        <Panel style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>🟣</span>
            <div>
              <Label style={{ color: C.purpleCap }}>PURPLE CAP LEADERBOARD</Label>
              <div style={{ fontSize: 11, color: C.inkDim }}>Top wicket-takers in NSL Season 2</div>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
            <thead>
              <tr style={{ color: C.inkDim, borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center" }}>
                <th style={{ textAlign: "left", padding: "6px 0" }}>Bowler</th>
                <th>Overs</th>
                <th>Wkts</th>
                <th>Runs</th>
                <th>Econ</th>
                <th>Best</th>
              </tr>
            </thead>
            <tbody>
              {leaderboards.bowlList.slice(0, 15).map((bw, idx) => (
                <tr
                  key={idx}
                  onClick={() => onSelectPlayer(bw.name)}
                  style={{ borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center", cursor: "pointer" }}
                >
                  <td style={{ textAlign: "left", padding: "8px 0", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: idx === 0 ? C.purpleCap : C.inkDim }}>
                      {idx + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, color: idx === 0 ? C.purpleCap : C.ink }}>{bw.name}</div>
                      <div style={{ fontSize: 9, color: C.inkDim }}>{bw.team}</div>
                    </div>
                  </td>
                  <td>{bw.overs.toFixed(1)}</td>
                  <td style={{ fontWeight: 800, color: C.purpleCap, fontSize: 14 }}>{bw.wkts}</td>
                  <td>{bw.runs}</td>
                  <td>{bw.econ.toFixed(1)}</td>
                  <td>{bw.bestWkts}/{bw.bestRuns === 999 ? 0 : bw.bestRuns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {tab === "sixes" && (
        <Panel style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>💥</span>
            <div>
              <Label>MAXIMUM SIXES TROPHY</Label>
              <div style={{ fontSize: 11, color: C.inkDim }}>Power hitters with most sixes cleared</div>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
            <thead>
              <tr style={{ color: C.inkDim, borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center" }}>
                <th style={{ textAlign: "left", padding: "6px 0" }}>Player</th>
                <th>Sixes</th>
                <th>Fours</th>
                <th>Total Runs</th>
                <th>SR</th>
              </tr>
            </thead>
            <tbody>
              {leaderboards.sixesList.filter((b) => b.sixes > 0).slice(0, 15).map((b, idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center" }}>
                  <td style={{ textAlign: "left", padding: "8px 0" }}>
                    <div style={{ fontWeight: 700 }}>{b.name}</div>
                    <div style={{ fontSize: 9, color: C.inkDim }}>{b.team}</div>
                  </td>
                  <td style={{ fontWeight: 800, color: C.tape, fontSize: 15 }}>{b.sixes}</td>
                  <td>{b.fours}</td>
                  <td>{b.runs}</td>
                  <td>{b.sr.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {tab === "mvp" && (
        <Panel style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>👑</span>
            <div>
              <Label>MOST VALUABLE PLAYER (MVP)</Label>
              <div style={{ fontSize: 11, color: C.inkDim }}>Overall impact index (Runs, Wkts, Sixes, Maidens)</div>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
            <thead>
              <tr style={{ color: C.inkDim, borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center" }}>
                <th style={{ textAlign: "left", padding: "6px 0" }}>Player</th>
                <th>Runs</th>
                <th>Wkts</th>
                <th>Sixes</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {leaderboards.mvpList.slice(0, 15).map((p, idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center" }}>
                  <td style={{ textAlign: "left", padding: "8px 0" }}>
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 9, color: C.inkDim }}>{p.team}</div>
                  </td>
                  <td>{p.runs}</td>
                  <td style={{ color: C.wicket, fontWeight: 700 }}>{p.wkts}</td>
                  <td style={{ color: C.win }}>{p.sixes}</td>
                  <td style={{ fontWeight: 800, color: C.tape, fontSize: 14 }}>{p.points.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {tab === "matchCaps" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Panel style={{ padding: 14, background: "rgba(242,169,59,0.08)", border: `1px solid ${C.tape}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 24 }}>🎖️</span>
              <div>
                <Label style={{ color: C.tape }}>MATCH-BY-MATCH TOP PERFORMERS</Label>
                <div style={{ fontSize: 11, color: C.inkDim }}>
                  Highest run scorer and most wickets taker for each match (regardless of win or loss)
                </div>
              </div>
            </div>
          </Panel>

          {(completedMatches || []).length === 0 ? (
            <Panel style={{ padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 32 }}>🏏</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, marginTop: 6 }}>No Matches Completed Yet</div>
              <div style={{ fontSize: 12, color: C.inkDim, marginTop: 4 }}>
                As group and playoff matches finish, each match's top run scorer and top wicket taker will be highlighted here!
              </div>
            </Panel>
          ) : (
            completedMatches.map((m, idx) => {
              const { topBatsman, topBowler } = getMatchTopPerformers(m);
              return (
                <Panel key={m.id || idx} style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.panelBorder}`, paddingBottom: 8, marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 11, color: C.tape, fontWeight: 800 }}>
                        {m.stageName || `Match ${m.matchNum || idx + 1}`}
                      </span>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18 }}>
                        {m.teamA} vs {m.teamB}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: C.win, fontWeight: 700 }}>{m.result}</div>
                      <div style={{ fontSize: 10, color: C.inkDim }}>
                        {m.scoreA} · {m.scoreB}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {/* TOP RUN SCORER */}
                    <div style={{ background: C.panel2, borderRadius: 8, padding: 10, borderLeft: `3px solid ${C.orangeCap}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                        <span style={{ fontSize: 14 }}>🟠</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: C.orangeCap, textTransform: "uppercase" }}>
                          Top Run Scorer
                        </span>
                      </div>
                      {topBatsman ? (
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: C.ink }}>{topBatsman.name}</div>
                          <div style={{ fontSize: 10, color: C.inkDim }}>{topBatsman.team}</div>
                          <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.tape, fontWeight: 800, marginTop: 4 }}>
                            {topBatsman.runs} runs <span style={{ fontSize: 11, color: C.inkDim, fontWeight: 400 }}>({topBatsman.balls}b)</span>
                          </div>
                          <div style={{ fontSize: 10, color: C.inkFaint, marginTop: 2 }}>
                            {topBatsman.fours || 0} 4s · {topBatsman.sixes || 0} 6s · SR {topBatsman.sr?.toFixed(0)}
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: C.inkFaint }}>No runs recorded</div>
                      )}
                    </div>

                    {/* TOP WICKET TAKER */}
                    <div style={{ background: C.panel2, borderRadius: 8, padding: 10, borderLeft: `3px solid ${C.purpleCap}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                        <span style={{ fontSize: 14 }}>🟣</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: C.purpleCap, textTransform: "uppercase" }}>
                          Top Wicket Taker
                        </span>
                      </div>
                      {topBowler ? (
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: C.ink }}>{topBowler.name}</div>
                          <div style={{ fontSize: 10, color: C.inkDim }}>{topBowler.team}</div>
                          <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.purpleCap, fontWeight: 800, marginTop: 4 }}>
                            {topBowler.wkts} wkts <span style={{ fontSize: 11, color: C.inkDim, fontWeight: 400 }}>({topBowler.runs}R in {oversStr(topBowler.balls)} ov)</span>
                          </div>
                          <div style={{ fontSize: 10, color: C.inkFaint, marginTop: 2 }}>
                            Econ: {topBowler.econ?.toFixed(1)}
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: C.inkFaint }}>No wickets recorded</div>
                      )}
                    </div>
                  </div>
                </Panel>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   PHASE 3: TEAMS & PLAYER SQUAD ROSTER SCREEN
   ========================================================================= */
function TeamsScreen({ nslTeams, onSelectPlayer, onAddPlayer }) {
  const [selectedTeamKey, setSelectedTeamKey] = useState("KTG");
  const [newPlayerName, setNewPlayerName] = useState("");
  const team = nslTeams[selectedTeamKey] || {};

  const handleAddNewPlayer = () => {
    if (!newPlayerName.trim()) return;
    const clean = newPlayerName.trim();
    if (onAddPlayer) {
      onAddPlayer(selectedTeamKey, clean);
    }
    setNewPlayerName("");
    alert(`Successfully added ${clean} to ${team.name} squad!`);
  };

  return (
    <div className="tb-fadein" style={{ padding: "16px 16px 80px", maxWidth: 720, margin: "0 auto" }}>
      <Label style={{ marginBottom: 10 }}>NSL Franchises</Label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        {Object.keys(nslTeams).map((k) => {
          const t = nslTeams[k];
          const isSel = selectedTeamKey === k;
          return (
            <Panel
              key={k}
              onClick={() => setSelectedTeamKey(k)}
              style={{
                padding: 10,
                textAlign: "center",
                cursor: "pointer",
                borderColor: isSel ? t.color || C.tape : C.panelBorder,
                background: isSel ? "rgba(242,169,59,0.12)" : C.panel
              }}
            >
              <TeamLogo shortKey={k} size={36} />
              <div style={{ fontWeight: 800, fontSize: 13, marginTop: 4, color: isSel ? C.tape : C.ink }}>
                {t.short}
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel style={{ padding: 18, borderLeft: `5px solid ${team.color || C.tape}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, lineHeight: 1 }}>{team.name}</div>
            <div style={{ fontSize: 12, color: C.inkDim, marginTop: 4 }}>
              Captain: <strong style={{ color: C.tape }}>{team.captain}</strong>
            </div>
          </div>
          <TeamLogo shortKey={selectedTeamKey} size={50} />
        </div>

        <div style={{ marginTop: 16 }}>
          <Label style={{ marginBottom: 8 }}>Official Playing Squad ({team.players?.length || 0} Players)</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(team.players || []).map((p, idx) => {
              const isCapt = p.includes("(C)");
              return (
                <div
                  key={idx}
                  onClick={() => onSelectPlayer(p.replace(" (C)", ""))}
                  style={{
                    padding: "8px 12px",
                    background: C.panel2,
                    borderRadius: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer"
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: isCapt ? 800 : 600, color: isCapt ? C.tape : C.ink }}>
                    {p}
                  </span>
                  <span style={{ fontSize: 10, color: C.inkFaint }}>Stats ➔</span>
                </div>
              );
            })}
          </div>

          {/* ADD PLAYER TO SQUAD */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.panelBorder}` }}>
            <Label style={{ marginBottom: 6 }}>+ Add Player to {team.name} Squad</Label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Enter player full name (e.g. Adeel M)..."
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddNewPlayer(); }}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  background: C.panel2,
                  border: `1px solid ${C.panelBorder}`,
                  color: C.ink,
                  borderRadius: 6,
                  fontSize: 13
                }}
              />
              <BigButton
                onClick={handleAddNewPlayer}
                bg={C.tape}
                color="#0A110D"
                style={{ padding: "8px 16px", fontSize: 13, fontWeight: 800 }}
              >
                + Add Player
              </BigButton>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* =========================================================================
   PLAYER PROFILE MODAL (PHASE 3)
   ========================================================================= */
function PlayerProfileModal({ playerName, completedMatches, nslTeams, onClose }) {
  const cleanName = (playerName || "").replace(" (C)", "").trim();
  const leaderboards = useMemo(() => calculateOverallLeaderboard(completedMatches, nslTeams), [completedMatches, nslTeams]);

  const batStats = leaderboards.batList.find((b) => b.name === cleanName) || {
    runs: 0, balls: 0, fours: 0, sixes: 0, highScore: 0, innings: 0, sr: 0
  };
  const bowlStats = leaderboards.bowlList.find((bw) => bw.name === cleanName) || {
    balls: 0, runs: 0, wkts: 0, maidens: 0, econ: 0, bestWkts: 0, bestRuns: 0
  };

  return (
    <ModalShell title="Player Profile & Career Stats" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.tape}, ${C.tape2})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              color: "#0A110D",
              fontWeight: 800
            }}
          >
            {cleanName.charAt(0)}
          </div>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, lineHeight: 1 }}>{cleanName}</div>
            <div style={{ fontSize: 12, color: C.inkDim, marginTop: 4 }}>
              NSL S2 Tournament Player
            </div>
          </div>
        </div>

        <Panel style={{ padding: 12 }}>
          <Label style={{ color: C.orangeCap }}>Batting Tournament Performance</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8, textAlign: "center" }}>
            <div style={{ background: C.panel2, padding: 8, borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: C.inkDim }}>Runs</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: C.tape, fontWeight: 700 }}>{batStats.runs}</div>
            </div>
            <div style={{ background: C.panel2, padding: 8, borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: C.inkDim }}>Innings</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 700 }}>{batStats.innings}</div>
            </div>
            <div style={{ background: C.panel2, padding: 8, borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: C.inkDim }}>Strike Rate</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 700 }}>{batStats.sr.toFixed(0)}</div>
            </div>
            <div style={{ background: C.panel2, padding: 8, borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: C.inkDim }}>High Score</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 700 }}>{batStats.highScore}</div>
            </div>
            <div style={{ background: C.panel2, padding: 8, borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: C.inkDim }}>Sixes</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: C.win, fontWeight: 700 }}>{batStats.sixes}</div>
            </div>
            <div style={{ background: C.panel2, padding: 8, borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: C.inkDim }}>Fours</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 700 }}>{batStats.fours}</div>
            </div>
          </div>
        </Panel>

        <Panel style={{ padding: 12 }}>
          <Label style={{ color: C.purpleCap }}>Bowling Tournament Performance</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8, textAlign: "center" }}>
            <div style={{ background: C.panel2, padding: 8, borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: C.inkDim }}>Wickets</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: C.purpleCap, fontWeight: 700 }}>{bowlStats.wkts}</div>
            </div>
            <div style={{ background: C.panel2, padding: 8, borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: C.inkDim }}>Overs</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 700 }}>{oversStr(bowlStats.balls)}</div>
            </div>
            <div style={{ background: C.panel2, padding: 8, borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: C.inkDim }}>Economy</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 700 }}>{bowlStats.econ.toFixed(1)}</div>
            </div>
          </div>
        </Panel>
      </div>
    </ModalShell>
  );
}

/* =========================================================================
   PHASE 3 & 4: RESULTS, DETAILED SCORECARDS & SHAREABLE POSTER
   ========================================================================= */
function ResultsScreen({ completedMatches, onViewScorecard, onShareMatch }) {
  return (
    <div className="tb-fadein" style={{ padding: "16px 16px 80px", maxWidth: 720, margin: "0 auto" }}>
      <Label style={{ marginBottom: 12 }}>Match Results & Scorecards</Label>
      {(completedMatches || []).length === 0 ? (
        <Panel style={{ padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 24 }}>🏏</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>No matches played yet</div>
          <div style={{ fontSize: 11, color: C.inkDim, marginTop: 4 }}>
            Completed matches will be archived here with complete scorecards.
          </div>
        </Panel>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {completedMatches.map((m) => (
            <Panel key={m.id} style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: C.tape, fontWeight: 800 }}>
                  {m.stageName || `Match ${m.matchNum || ""}`}
                </span>
                <span style={{ fontSize: 10, color: C.inkDim }}>
                  {new Date(m.date || Date.now()).toLocaleDateString()}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{m.teamA}: <span style={{ color: C.tape }}>{m.scoreA}</span></div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{m.teamB}: <span style={{ color: C.ink }}>{m.scoreB}</span></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: C.win, fontWeight: 800 }}>{m.result}</div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6 }}>
                    <button
                      onClick={() => onShareMatch(m)}
                      className="tb-btn"
                      style={{ background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      Share 📤
                    </button>
                    <button
                      onClick={() => onViewScorecard(m)}
                      className="tb-btn"
                      style={{ background: C.tape, border: "none", color: "#0A110D", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
                    >
                      Scorecard ➔
                    </button>
                  </div>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   PHASE 4: SHAREABLE WHATSAPP & GRAPHIC SCORECARD MODAL
   ========================================================================= */
function ShareModal({ match, onClose }) {
  const [copied, setCopied] = useState(false);
  const inn1 = match.innings ? match.innings[0] : null;
  const inn2 = match.innings ? match.innings[1] : null;

  const whatsappText = `🏏 *NSL S2 MATCH RESULT* 🏆
${match.stageName || "Match Result"}
━━━━━━━━━━━━━━━━━━━━
*${match.teamA}*: ${match.scoreA || (inn1 ? `${inn1.score}/${inn1.wkts}` : "")}
*${match.teamB}*: ${match.scoreB || (inn2 ? `${inn2.score}/${inn2.wkts}` : "")}
🌟 *Outcome*: ${match.result}
━━━━━━━━━━━━━━━━━━━━
Follow NSL Season 2 Ball-by-Ball live!`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(whatsappText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <ModalShell title="Share Match Update" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Panel
          style={{
            padding: 18,
            background: `linear-gradient(135deg, rgba(242,169,59,0.15), #0E1813)`,
            border: `2px solid ${C.tape}`,
            textAlign: "center"
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 800, background: C.tape, color: "#0A110D", padding: "2px 6px", borderRadius: 4 }}>
            NSL SEASON 2
          </span>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, marginTop: 6 }}>
            {match.teamA} vs {match.teamB}
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: C.tape, marginTop: 4, fontWeight: 700 }}>
            {match.scoreA} vs {match.scoreB}
          </div>
          <div style={{ color: C.win, fontWeight: 800, fontSize: 14, marginTop: 6 }}>
            {match.result}
          </div>
        </Panel>

        <textarea
          readOnly
          value={whatsappText}
          rows={6}
          style={{
            width: "100%",
            padding: 10,
            background: C.panel2,
            border: `1px solid ${C.panelBorder}`,
            color: C.ink,
            fontFamily: FONT_MONO,
            fontSize: 12,
            borderRadius: 8
          }}
        />

        <BigButton onClick={copyToClipboard} bg={C.win} color="#0A110D">
          {copied ? "✓ Copied to Clipboard!" : "Copy WhatsApp Scorecard 📋"}
        </BigButton>
      </div>
    </ModalShell>
  );
}

/* =========================================================================
   PHASE 2: ADMIN, BACKUPS, AUDIT LOG & BROADCAST MANAGEMENT
   ========================================================================= */
function AdminScreen({
  role,
  onResetTournament,
  announcements,
  auditLogs,
  completedMatches,
  schedule,
  nslTeams,
  onPostAnnouncement,
  onDeleteAnnouncement,
  syncStatus,
  onTestConnection
}) {
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [restoreJson, setRestoreJson] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("announcements"); // 'announcements' | 'server' | 'backups' | 'audit'

  const [customServerUrl, setCustomServerUrl] = useState(() => loadLocal("tapeball:vps_url", ""));
  const [serverSaveMsg, setServerSaveMsg] = useState("");

  const handleDownloadBackup = () => {
    const backupData = {
      version: "nsl-s2-v1",
      exported_at: Date.now(),
      teams: nslTeams,
      schedule,
      completedMatches,
      announcements,
      auditLogs
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nsl_s2_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = () => {
    try {
      const parsed = JSON.parse(restoreJson);
      if (parsed.schedule && parsed.teams) {
        saveLocal("tapeball:schedule", parsed.schedule);
        saveLocal("tapeball:teams", parsed.teams);
        if (parsed.completedMatches) saveLocal("tapeball:completed_matches", parsed.completedMatches);
        alert("Backup successfully restored! Reloading...");
        window.location.reload();
      } else {
        alert("Invalid backup file format!");
      }
    } catch (e) {
      alert("Error parsing JSON: " + e.message);
    }
  };

  const handleSaveServerUrl = () => {
    saveLocal("tapeball:vps_url", customServerUrl.trim());
    setServerSaveMsg("Server URL updated successfully!");
    setTimeout(() => setServerSaveMsg(""), 3000);
  };

  return (
    <div className="tb-fadein" style={{ padding: "16px 16px 80px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Label>Tournament Management Console</Label>
        <span style={{ fontSize: 11, color: C.tape, fontWeight: 700 }}>Role: {role.toUpperCase()}</span>
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14 }}>
        <Chip active={activeSubTab === "announcements"} onClick={() => setActiveSubTab("announcements")}>
          📢 Broadcasts
        </Chip>
        <Chip active={activeSubTab === "server"} onClick={() => setActiveSubTab("server")}>
          🌐 Server Sync ({syncStatus === "online" ? "🟢" : "🟡"})
        </Chip>
        <Chip active={activeSubTab === "backups"} onClick={() => setActiveSubTab("backups")}>
          💾 Backups & Reset
        </Chip>
        <Chip active={activeSubTab === "audit"} onClick={() => setActiveSubTab("audit")}>
          📜 Audit Trail ({auditLogs?.length || 0})
        </Chip>
      </div>

      {/* ANNOUNCEMENTS / BROADCASTS TAB */}
      {activeSubTab === "announcements" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel style={{ padding: 14 }}>
            <Label>Broadcast Announcement to All Spectators & Scorers</Label>
            <div style={{ fontSize: 11, color: C.win, marginTop: 4, fontWeight: 700 }}>
              ⚡ Every device connected to the network will receive this update within seconds!
            </div>
            <input
              type="text"
              placeholder="Announcement Title (e.g. Match 2 Rescheduled)"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              style={{ width: "100%", padding: "10px", background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, borderRadius: 6, marginTop: 8 }}
            />
            <textarea
              placeholder="Broadcast Message Content..."
              value={annContent}
              onChange={(e) => setAnnContent(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: "10px", background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, borderRadius: 6, marginTop: 8 }}
            />
            <BigButton
              onClick={() => {
                if (annTitle.trim()) {
                  onPostAnnouncement({ title: annTitle.trim(), content: annContent.trim(), timestamp: Date.now() });
                  setAnnTitle("");
                  setAnnContent("");
                }
              }}
              bg={C.tape}
              style={{ width: "100%", marginTop: 10, padding: 10, fontSize: 14 }}
            >
              Broadcast Live Announcement 📢
            </BigButton>
          </Panel>

          <Panel style={{ padding: 14 }}>
            <Label>Active Broadcasts ({announcements?.length || 0})</Label>
            {(announcements || []).length === 0 ? (
              <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 8 }}>No announcements published.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    style={{
                      padding: 10,
                      background: C.panel2,
                      borderRadius: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 8
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: C.ink }}>{ann.title}</div>
                      <div style={{ fontSize: 12, color: C.inkDim, marginTop: 2 }}>{ann.content}</div>
                      <div style={{ fontSize: 9, color: C.inkFaint, marginTop: 4 }}>
                        {new Date(ann.timestamp || Date.now()).toLocaleString()}
                      </div>
                    </div>
                    {role === "admin" && (
                      <button
                        onClick={() => onDeleteAnnouncement(ann.id)}
                        className="tb-btn"
                        style={{
                          background: "none",
                          border: `1px solid ${C.wicket}`,
                          color: C.wicket,
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        Delete ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* SERVER SYNC SETTINGS TAB */}
      {activeSubTab === "server" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel style={{ padding: 14 }}>
            <Label>Real-Time Broadcast & VPS Database Engine</Label>
            <div style={{ fontSize: 12, color: C.inkDim, marginTop: 4, lineHeight: 1.5 }}>
              The live sync engine broadcasts live ball-by-ball updates, standings, and announcements across phones, tablets, and computers.
            </div>

            <div style={{ marginTop: 12, padding: 10, background: C.panel2, borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Connection Status:</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: syncStatus === "online" ? C.win : C.tape }}>
                  {syncStatus === "online" ? "🟢 Connected & Live Polling (2s)" : "🟡 Offline (Local Storage Active)"}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <Label>Backend API Server URL</Label>
              <input
                type="text"
                placeholder="e.g. http://169.58.44.255:5000 or http://localhost:8000"
                value={customServerUrl}
                onChange={(e) => setCustomServerUrl(e.target.value)}
                style={{ width: "100%", padding: "10px", background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, borderRadius: 6, marginTop: 6 }}
              />
              <div style={{ fontSize: 11, color: C.inkDim, marginTop: 4 }}>
                Leave blank to automatically connect to the local server or VPS host.
              </div>
            </div>

            {serverSaveMsg && (
              <div style={{ color: C.win, fontSize: 12, fontWeight: 700, marginTop: 8 }}>
                ✓ {serverSaveMsg}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <BigButton onClick={handleSaveServerUrl} bg={C.tape} style={{ flex: 1, padding: 10, fontSize: 13 }}>
                Save Server URL 💾
              </BigButton>
              <BigButton onClick={onTestConnection} bg={C.panel2} color={C.ink} style={{ flex: 1, padding: 10, fontSize: 13, border: `1px solid ${C.panelBorder}` }}>
                Test Ping ⚡
              </BigButton>
            </div>
          </Panel>
        </div>
      )}

      {/* BACKUPS & RESET TAB */}
      {activeSubTab === "backups" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel style={{ padding: 14 }}>
            <Label>Download Full Tournament Backup</Label>
            <div style={{ fontSize: 12, color: C.inkDim, marginTop: 4 }}>
              Export complete NSL S2 state (matches, standings, rosters, leaderboards, broadcasts) as a portable JSON file.
            </div>
            <BigButton onClick={handleDownloadBackup} bg={C.panel2} color={C.tape} style={{ width: "100%", marginTop: 10, border: `1px solid ${C.tape}` }}>
              Export & Download Backup JSON 📥
            </BigButton>
          </Panel>

          <Panel style={{ padding: 14 }}>
            <Label>Restore Database from JSON Backup</Label>
            <textarea
              placeholder="Paste JSON backup text here..."
              value={restoreJson}
              onChange={(e) => setRestoreJson(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: "10px", background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, borderRadius: 6, marginTop: 8 }}
            />
            <BigButton onClick={handleRestoreBackup} bg={C.free} color="#0A110D" style={{ width: "100%", marginTop: 8, padding: 10 }}>
              Restore Database ⚡
            </BigButton>
          </Panel>

          {role === "admin" && (
            <Panel style={{ padding: 14, borderColor: C.wicket, background: "rgba(224,72,59,0.08)" }}>
              <Label style={{ color: C.wicket }}>Danger Zone · Reset Tournament</Label>
              <div style={{ fontSize: 12, color: C.inkDim, marginTop: 4 }}>
                Erases all completed matches, live matches and resets schedule to fresh tournament state.
              </div>
              <BigButton onClick={onResetTournament} bg={C.wicket} color="#fff" style={{ width: "100%", marginTop: 10, padding: 10 }}>
                Reset Tournament Data (Admin Only) ⚠️
              </BigButton>
            </Panel>
          )}
        </div>
      )}

      {/* AUDIT LOG TAB */}
      {activeSubTab === "audit" && (
        <Panel style={{ padding: 14 }}>
          <Label>Audit Trail & Event Log</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, maxHeight: 360, overflowY: "auto" }}>
            {(auditLogs || []).length === 0 ? (
              <div style={{ fontSize: 12, color: C.inkFaint }}>No audit log events recorded yet.</div>
            ) : (
              auditLogs.map((log, i) => (
                <div key={i} style={{ padding: 8, background: C.panel2, borderRadius: 6, fontSize: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: C.tape, fontWeight: 700 }}>
                    <span>{log.action}</span>
                    <span>{new Date(log.timestamp || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ color: C.ink, marginTop: 2 }}>{log.details}</div>
                  <div style={{ color: C.inkFaint, fontSize: 9, marginTop: 2 }}>Role: {log.role || "system"}</div>
                </div>
              ))
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* =========================================================================
   MAIN APP ORCHESTRATOR
   ========================================================================= */
function App() {
  const [screen, setScreen] = useState("home");
  const [role, setRole] = useState(() => loadLocal("tapeball:role", "spectator"));
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState("checking");

  // Broadcast Alert Notification Popup
  const [broadcastAlert, setBroadcastAlert] = useState(null);

  // Tournament Data State
  const [nslTeams, setNslTeams] = useState(() => loadLocal("tapeball:teams", DEFAULT_NSL_TEAMS));
  const [schedule, setSchedule] = useState(() => loadLocal("tapeball:schedule", DEFAULT_SCHEDULE));
  const [completedMatches, setCompletedMatches] = useState(() => loadLocal("tapeball:completed_matches", []));
  const [announcements, setAnnouncements] = useState(() => loadLocal("tapeball:announcements", [
    { id: "ann-welcome", title: "NSL Season 2 Kicks Off!", content: "Welcome to NSL Season 2. Live scores, statistics and announcements broadcast here in real time!", timestamp: Date.now() }
  ]));
  const [auditLogs, setAuditLogs] = useState(() => loadLocal("tapeball:audit_logs", []));

  // Active Live Match
  const [match, setMatch] = useState(() => loadLocal("tapeball:active_match", null));
  const [undoStack, setUndoStack] = useState([]);

  // Modals & Sheets
  const [setupMatch, setSetupMatch] = useState(null);
  const [validationMatch, setValidationMatch] = useState(null);
  const [viewingScorecard, setViewingScorecard] = useState(null);
  const [sharingMatch, setSharingMatch] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Sync state to local storage
  useEffect(() => { saveLocal("tapeball:role", role); }, [role]);
  useEffect(() => { saveLocal("tapeball:teams", nslTeams); }, [nslTeams]);
  useEffect(() => { saveLocal("tapeball:schedule", schedule); }, [schedule]);
  useEffect(() => { saveLocal("tapeball:completed_matches", completedMatches); }, [completedMatches]);
  useEffect(() => { saveLocal("tapeball:announcements", announcements); }, [announcements]);
  useEffect(() => { saveLocal("tapeball:audit_logs", auditLogs); }, [auditLogs]);
  useEffect(() => { saveLocal("tapeball:active_match", match); }, [match]);

  // Logging Helper
  const logAudit = useCallback((action, details) => {
    const entry = { action, details, role, timestamp: Date.now() };
    setAuditLogs((prev) => [entry, ...(prev || []).slice(0, 99)]);
    apiFetch("/api/audit-logs", "POST", entry).catch(() => {});
  }, [role]);

  // State Snapshot Stack for Undo
  const snapshot = useCallback((m) => {
    if (!m) return;
    setUndoStack((s) => [...s.slice(-24), structuredClone(m)]);
  }, []);

  const handleAddPlayer = useCallback((teamKey, playerName) => {
    if (!teamKey || !playerName || !playerName.trim()) return;
    const cleanName = playerName.trim();
    setNslTeams((prev) => {
      const team = prev[teamKey];
      if (!team) return prev;
      if (team.players && team.players.includes(cleanName)) return prev;
      const updated = {
        ...prev,
        [teamKey]: {
          ...team,
          players: [...(team.players || []), cleanName]
        }
      };
      saveLocal("tapeball:teams", updated);
      return updated;
    });
    logAudit("PLAYER_ADDED", `Added emergency player ${cleanName} to ${teamKey}`);
  }, [logAudit]);

  const handleUndo = () => {
    setUndoStack((s) => {
      if (s.length === 0) return s;
      const prev = s[s.length - 1];
      setMatch(prev);
      saveLocal("tapeball:active_match", prev);
      if (prev && prev.code) apiFetch(`/api/match/${prev.code}`, "POST", prev).catch(() => {});
      logAudit("UNDO_ACTION", `Reverted last scoring action on match ${prev.code}`);
      return s.slice(0, -1);
    });
  };

  // BROADCAST ANNOUNCEMENT HANDLER
  const handlePostAnnouncement = async (newAnn) => {
    const annWithId = { ...newAnn, id: "ann-" + Date.now() };
    setAnnouncements((prev) => [annWithId, ...(prev || [])]);
    saveLocal("tapeball:announcements", [annWithId, ...(announcements || [])]);
    logAudit("BROADCAST_SENT", `Announcement broadcasted: ${newAnn.title}`);
    
    // Broadcast immediately to backend database
    const res = await apiFetch("/api/announcements", "POST", annWithId);
    if (res) setSyncStatus("online");
  };

  const handleDeleteAnnouncement = async (annId) => {
    setAnnouncements((prev) => (prev || []).filter((a) => a.id !== annId));
    logAudit("BROADCAST_DELETED", `Announcement removed: ${annId}`);
    await apiFetch(`/api/announcements/${annId}`, "DELETE");
  };

  const handleTestConnection = async () => {
    const res = await apiFetch("/api/health");
    if (res && res.status === "ok") {
      setSyncStatus("online");
      alert("✓ Connection verified! Backend is online and broadcasting.");
    } else {
      setSyncStatus("offline");
      alert("⚠️ Could not reach server. Operating in offline localStorage mode.");
    }
  };

  // UPDATE MATCH BALL & BROADCAST TO ALL DEVICES
  const handleUpdateMatch = (m2) => {
    snapshot(match);
    setMatch(m2);
    saveLocal("tapeball:active_match", m2);
    // Broadcast live match update to backend API
    if (m2 && m2.code) {
      apiFetch(`/api/match/${m2.code}`, "POST", m2).catch(() => {});
    }
  };

  // REAL-TIME BACKGROUND SYNC (EVERY 2 SECONDS)
  useEffect(() => {
    let isMounted = true;
    let knownTopAnnId = announcements[0]?.id;

    async function pollBroadcastsAndScores() {
      try {
        // 1. Announcements Sync
        const remoteAnnouncements = await apiFetch("/api/announcements");
        if (isMounted && Array.isArray(remoteAnnouncements)) {
          setSyncStatus("online");
          if (remoteAnnouncements.length > 0) {
            const newest = remoteAnnouncements[0];
            if (knownTopAnnId && newest.id !== knownTopAnnId) {
              setBroadcastAlert(newest);
            }
            knownTopAnnId = newest.id;
            setAnnouncements(remoteAnnouncements);
            saveLocal("tapeball:announcements", remoteAnnouncements);
          }
        }

        // 2. Schedule & Completed Matches Sync
        const remoteSchedule = await apiFetch("/api/schedule");
        if (isMounted && Array.isArray(remoteSchedule) && remoteSchedule.length > 0) {
          setSchedule(remoteSchedule);
          saveLocal("tapeball:schedule", remoteSchedule);
        }

        const remoteCompleted = await apiFetch("/api/completed-matches");
        if (isMounted && Array.isArray(remoteCompleted)) {
          setCompletedMatches(remoteCompleted);
          saveLocal("tapeball:completed_matches", remoteCompleted);
        }

        // 3. Live Match Sync (For Spectators)
        if (role === "spectator") {
          const remoteActiveMatches = await apiFetch("/api/active-matches");
          if (isMounted && Array.isArray(remoteActiveMatches)) {
            const liveMatch = remoteActiveMatches.find((m) => m.status === "live" || m.status === "break");
            if (liveMatch) {
              setMatch(liveMatch);
              saveLocal("tapeball:active_match", liveMatch);
            }
          }
        }
      } catch (e) {
        if (isMounted) setSyncStatus("offline");
      }
    }

    pollBroadcastsAndScores();
    const interval = setInterval(pollBroadcastsAndScores, 2000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [role]);

  // Record Completed Match with validation
  const handleFinalizeMatch = (m) => {
    const inn1 = m.innings[0];
    const inn2 = m.innings[1];

    const rec = {
      id: m.code + "-" + Date.now(),
      scheduleId: m.scheduleId || null,
      matchNum: m.matchNum || null,
      stageName: m.stageName || "",
      isPlayoff: Boolean(m.isPlayoff),
      teamA: m.teamA,
      teamB: m.teamB,
      teamAKey: m.teamAKey,
      teamBKey: m.teamBKey,
      scoreA: `${inn1.score}/${inn1.wkts} (${oversStr(inn1.legalBalls)})`,
      scoreB: inn2 ? `${inn2.score}/${inn2.wkts} (${oversStr(inn2.legalBalls)})` : "DNB",
      runsA: inn1.score, wktsA: inn1.wkts, ballsA: inn1.legalBalls,
      runsB: inn2 ? inn2.score : 0, wktsB: inn2 ? inn2.wkts : 0, ballsB: inn2 ? inn2.legalBalls : 0,
      oversLimit: m.oversLimit,
      result: m.result,
      winner: m.winner,
      date: new Date().toISOString(),
      innings: m.innings
    };

    saveLocal("tapeball:active_match", null);
    setMatch(null);
    setUndoStack([]);

    const nextList = [...(completedMatches || []).filter((x) => x.id !== rec.id), rec];
    setCompletedMatches(nextList);
    apiFetch("/api/completed-matches", "POST", rec).catch(() => {});
    apiFetch(`/api/match/${m.code}`, "DELETE").catch(() => {});

    // Update Schedule & Unlock Playoff Bracket
    if (m.scheduleId && schedule) {
      const nextSched = schedule.map((item) => {
        if (item.id === m.scheduleId) {
          return { ...item, status: "done", result: m.result, winner: m.winner, matchData: rec };
        }
        return item;
      });

      const groupMatches = nextSched.filter((x) => x.round === 1);
      const allGroupDone = groupMatches.every((x) => x.status === "done");

      if (allGroupDone) {
        const standings = calculateStandings(nextList);
        const rank1 = standings[0] ? standings[0].teamKey : "Rank 1";
        const rank2 = standings[1] ? standings[1].teamKey : "Rank 2";
        const rank3 = standings[2] ? standings[2].teamKey : "Rank 3";

        const m7 = nextSched.find((x) => x.id === "m7");
        if (m7 && m7.status === "locked") {
          m7.status = "pending";
          m7.teamA = rank2;
          m7.teamB = rank3;
        }

        if (m7 && m7.status === "done") {
          const m8 = nextSched.find((x) => x.id === "m8");
          if (m8 && m8.status === "locked") {
            m8.status = "pending";
            m8.teamA = rank1;
            m8.teamB = m7.winner;
          }
        }
      }

      setSchedule(nextSched);
      apiFetch("/api/schedule", "POST", nextSched).catch(() => {});
    }

    logAudit("MATCH_COMPLETED", `${m.teamA} vs ${m.teamB} ended: ${m.result}`);
    setValidationMatch(null);
    setScreen("results");
  };

  // Reset Tournament
  const handleResetTournament = async () => {
    if (!window.confirm("Are you sure you want to reset all NSL tournament data? This action cannot be undone.")) return;
    saveLocal("tapeball:active_match", null);
    setMatch(null);
    setUndoStack([]);
    setCompletedMatches([]);
    setSchedule(DEFAULT_SCHEDULE);
    setNslTeams(DEFAULT_NSL_TEAMS);
    logAudit("TOURNAMENT_RESET", "Full tournament reset triggered by Admin");
    await apiFetch("/api/reset", "POST");
    alert("NSL Tournament data has been completely reset!");
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: FONT_BODY }}>
      <TopNav
        role={role}
        onOpenRoleModal={() => setRoleModalOpen(true)}
        activeMatch={match}
        onWatchLive={() => setScreen("live_centre")}
        syncStatus={syncStatus}
      />

      {/* FLOATING REAL-TIME BROADCAST ALERT BANNER */}
      {broadcastAlert && (
        <div
          className="tb-fadein"
          style={{
            position: "fixed",
            top: 60,
            left: 16,
            right: 16,
            maxWidth: 480,
            margin: "0 auto",
            background: `linear-gradient(135deg, ${C.tape}, ${C.tape2})`,
            color: "#0A110D",
            padding: "12px 16px",
            borderRadius: 12,
            boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
            zIndex: 9990,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
              📢 NEW TOURNAMENT BROADCAST
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, marginTop: 2 }}>{broadcastAlert.title}</div>
            <div style={{ fontSize: 12, marginTop: 2, opacity: 0.9 }}>{broadcastAlert.content}</div>
          </div>
          <button
            onClick={() => setBroadcastAlert(null)}
            style={{
              background: "rgba(0,0,0,0.25)",
              border: "none",
              color: "#fff",
              borderRadius: "50%",
              width: 28,
              height: 28,
              fontSize: 14,
              cursor: "pointer",
              marginLeft: 10,
              fontWeight: 800
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ACTIVE SCREEN ROUTER */}
      {screen === "home" && (
        <HomeScreen
          nslTeams={nslTeams}
          schedule={schedule}
          completedMatches={completedMatches}
          activeMatch={match}
          announcements={announcements}
          onStartMatch={(m) => setSetupMatch(m)}
          onWatchLive={() => setScreen("live_centre")}
          onViewScorecard={(m) => setViewingScorecard(m)}
          onNavigateTab={(tabKey) => setScreen(tabKey)}
        />
      )}

      {screen === "live_centre" && (
        match ? (
          match.status === "break" ? (
            <InningsBreakScreen
              match={match}
              onStartSecondInnings={(m2) => handleUpdateMatch(m2)}
            />
          ) : (
            <LiveScoringCentre
              match={match}
              role={role}
              setMatch={(m2) => handleUpdateMatch(m2)}
              onUndo={handleUndo}
              canUndo={undoStack.length > 0}
              onInningsBreak={(m2) => handleUpdateMatch(m2)}
              onMatchDone={(m2) => setValidationMatch(m2)}
              onBack={() => setScreen("home")}
            />
          )
        ) : (
          <div style={{ padding: "40px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 32 }}>🏏</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, marginTop: 8 }}>No Live Match Right Now</div>
            <div style={{ fontSize: 12, color: C.inkDim, marginTop: 4 }}>
              Select a fixture from the Fixtures tab to begin scoring.
            </div>
            <BigButton onClick={() => setScreen("fixtures")} bg={C.tape} style={{ marginTop: 14 }}>
              View Tournament Fixtures
            </BigButton>
          </div>
        )
      )}

      {screen === "fixtures" && (
        <FixturesScreen
          schedule={schedule}
          onStartMatch={(m) => setSetupMatch(m)}
          onViewScorecard={(m) => setViewingScorecard(m)}
        />
      )}

      {screen === "standings" && (
        <StandingsAndBracketScreen
          schedule={schedule}
          completedMatches={completedMatches}
          nslTeams={nslTeams}
          onStartMatch={(m) => setSetupMatch(m)}
        />
      )}

      {screen === "leaderboards" && (
        <LeaderboardsScreen
          completedMatches={completedMatches}
          nslTeams={nslTeams}
          onSelectPlayer={(pName) => setSelectedPlayer(pName)}
        />
      )}

      {screen === "teams" && (
        <TeamsScreen
          nslTeams={nslTeams}
          onSelectPlayer={(pName) => setSelectedPlayer(pName)}
          onAddPlayer={handleAddPlayer}
        />
      )}

      {screen === "results" && (
        <ResultsScreen
          completedMatches={completedMatches}
          onViewScorecard={(m) => setViewingScorecard(m)}
          onShareMatch={(m) => setSharingMatch(m)}
        />
      )}

      {screen === "admin" && (
        <AdminScreen
          role={role}
          onResetTournament={handleResetTournament}
          announcements={announcements}
          auditLogs={auditLogs}
          completedMatches={completedMatches}
          schedule={schedule}
          nslTeams={nslTeams}
          onPostAnnouncement={handlePostAnnouncement}
          onDeleteAnnouncement={handleDeleteAnnouncement}
          syncStatus={syncStatus}
          onTestConnection={handleTestConnection}
        />
      )}

      {/* BOTTOM NAVIGATION */}
      <BottomNav screen={screen} setScreen={setScreen} />

      {/* ROLE AUTH MODAL */}
      {roleModalOpen && (
        <RoleModal
          currentRole={role}
          onClose={() => setRoleModalOpen(false)}
          onRoleChange={(newRole) => setRole(newRole)}
        />
      )}

      {/* PRE-MATCH SETUP MODAL */}
      {setupMatch && (
        <MatchSetupModal
          schedMatch={setupMatch}
          nslTeams={nslTeams}
          onClose={() => setSetupMatch(null)}
          onAddPlayer={handleAddPlayer}
          onStartMatchLive={(newM) => {
            setMatch(newM);
            setUndoStack([]);
            setSetupMatch(null);
            setScreen("live_centre");
            saveLocal("tapeball:active_match", newM);
            apiFetch(`/api/match/${newM.code}`, "POST", newM).catch(() => {});
            logAudit("MATCH_STARTED", `Match ${newM.matchNum} started: ${newM.teamA} vs ${newM.teamB}`);
          }}
        />
      )}

      {/* MATCH FINAL VALIDATION MODAL */}
      {validationMatch && (
        <MatchValidationModal
          match={validationMatch}
          onConfirmSave={() => handleFinalizeMatch(validationMatch)}
          onCancel={() => setValidationMatch(null)}
        />
      )}

      {/* SHARE MATCH MODAL */}
      {sharingMatch && (
        <ShareModal match={sharingMatch} onClose={() => setSharingMatch(null)} />
      )}

      {/* PLAYER PROFILE MODAL */}
      {selectedPlayer && (
        <PlayerProfileModal
          playerName={selectedPlayer}
          completedMatches={completedMatches}
          nslTeams={nslTeams}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {/* FULL SCORECARD DETAIL MODAL */}
      {viewingScorecard && (
        <ModalShell title={`${viewingScorecard.teamA} vs ${viewingScorecard.teamB}`} onClose={() => setViewingScorecard(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Panel style={{ padding: 12, textAlign: "center", background: C.panel2 }}>
              <div style={{ color: C.win, fontWeight: 800, fontSize: 14 }}>{viewingScorecard.result}</div>
              <div style={{ fontFamily: FONT_MONO, color: C.tape, fontSize: 13, marginTop: 4 }}>
                {viewingScorecard.teamA}: {viewingScorecard.scoreA}
              </div>
              <div style={{ fontFamily: FONT_MONO, color: C.ink, fontSize: 13, marginTop: 2 }}>
                {viewingScorecard.teamB}: {viewingScorecard.scoreB}
              </div>
            </Panel>

            {(viewingScorecard.innings || []).map((inn, i) => (
              <Panel key={i} style={{ padding: 12 }}>
                <Label>{inn.battingTeam} Batting ({i === 0 ? "1st Innings" : "2nd Innings"})</Label>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 11, marginTop: 6 }}>
                  <thead>
                    <tr style={{ color: C.inkDim, borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center" }}>
                      <th style={{ textAlign: "left" }}>Batsman</th>
                      <th>R</th>
                      <th>B</th>
                      <th>4s</th>
                      <th>6s</th>
                      <th>SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(inn.batsmen || {}).map((b, bi) => (
                      <tr key={bi} style={{ borderBottom: `1px solid ${C.panelBorder}`, textAlign: "center" }}>
                        <td style={{ textAlign: "left", padding: "4px 0" }}>
                          <span style={{ fontWeight: 700 }}>{b.name}</span>
                          {b.out && <div style={{ fontSize: 9, color: C.inkFaint }}>{b.how} {b.bowler ? `b ${b.bowler}` : ""}</div>}
                        </td>
                        <td style={{ fontWeight: 800 }}>{b.runs}</td>
                        <td>{b.balls}</td>
                        <td>{b.fours || 0}</td>
                        <td>{b.sixes || 0}</td>
                        <td>{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(0) : 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            ))}
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// Render into DOM
ReactDOM.render(<App />, document.getElementById("root"));
