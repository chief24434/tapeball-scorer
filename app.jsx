const { useState, useEffect, useRef, useCallback } = React;

/* ---------------------------------------------------------
   COLOR PALETTE & CONSTANTS
--------------------------------------------------------- */
const C = {
  bg: "#0A110D",
  bg2: "#0E1813",
  panel: "#14221A",
  panel2: "#1A2D23",
  panelBorder: "#273E30",
  tape: "#F2A93B",       // NSL Gold
  tape2: "#F2661D",      // NSL Orange
  wicket: "#E0483B",
  free: "#4FA8D6",
  ink: "#F5F3EC",
  inkDim: "#9EB0A3",
  inkFaint: "#607569",
  win: "#52C474",
};

const FONT_DISPLAY = "'Teko', system-ui, -apple-system, sans-serif";
const FONT_BODY = "'Manrope', system-ui, -apple-system, sans-serif";
const FONT_MONO = "'Space Mono', monospace";

/* ---------------------------------------------------------
   NSL DEFAULT TEAMS & ROSTERS
--------------------------------------------------------- */
const DEFAULT_NSL_TEAMS = {
  KTG: {
    id: "KTG",
    name: "KHAN TIGERS",
    short: "KTG",
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
    logo: "assets/logos/alw.jpg",
    captain: "Imtiaz K",
    players: [
      "Imtiaz K (C)", "Saddam D", "Ijaz H", "Saqlain Ir", "Hasan Ch", "Shahzad R",
      "Bilal D", "Asad D", "Azhar Cf", "Aftab Im"
    ]
  }
};

/* ---------------------------------------------------------
   NSL 6-MATCH ROUND 1 FIXTURES + PLAYOFFS
--------------------------------------------------------- */
const DEFAULT_SCHEDULE = [
  { id: "m1", matchNum: 1, round: 1, teamA: "ASK", teamB: "KTG", status: "pending", result: "", winner: "", stageName: "Round 1 · Match 1" },
  { id: "m2", matchNum: 2, round: 1, teamA: "ALW", teamB: "NKG", status: "pending", result: "", winner: "", stageName: "Round 1 · Match 2" },
  { id: "m3", matchNum: 3, round: 1, teamA: "ASK", teamB: "ALW", status: "pending", result: "", winner: "", stageName: "Round 1 · Match 3" },
  { id: "m4", matchNum: 4, round: 1, teamA: "KTG", teamB: "NKG", status: "pending", result: "", winner: "", stageName: "Round 1 · Match 4" },
  { id: "m5", matchNum: 5, round: 1, teamA: "ASK", teamB: "NKG", status: "pending", result: "", winner: "", stageName: "Round 1 · Match 5" },
  { id: "m6", matchNum: 6, round: 1, teamA: "ALW", teamB: "KTG", status: "pending", result: "", winner: "", stageName: "Round 1 · Match 6" },
  // Playoff slots automatically unlocked once all 6 group matches complete:
  { id: "m7", matchNum: 7, round: 2, teamA: "Rank 2", teamB: "Rank 3", status: "locked", result: "", winner: "", isPlayoff: true, stageName: "KNOCKOUT QUALIFIER (2nd vs 3rd)" },
  { id: "m8", matchNum: 8, round: 3, teamA: "Rank 1", teamB: "Winner Knockout", status: "locked", result: "", winner: "", isPlayoff: true, stageName: "GRAND FINAL" }
];

/* ---------------------------------------------------------
   LOCAL STORAGE & VPS HYBRID ENGINE
--------------------------------------------------------- */
function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('storage'));
    return true;
  } catch (e) {
    return false;
  }
}

function loadLocal(key) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch (e) {
    return null;
  }
}

async function apiFetch(endpoint, method = 'GET', data = null) {
  const vpsUrl = loadLocal("tapeball:vps_url");
  const baseUrl = vpsUrl ? vpsUrl.replace(/\/$/, "") : "";
  try {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (data && method !== 'GET') options.body = JSON.stringify(data);
    const res = await fetch(`${baseUrl}${endpoint}`, options);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function useStorageSync(key, defaultVal, apiPath = null) {
  const [data, setData] = useState(() => {
    const existing = loadLocal(key);
    return existing !== null ? existing : defaultVal;
  });

  const syncData = useCallback(async () => {
    const local = loadLocal(key);
    if (local !== null) setData(local);
    if (apiPath && navigator.onLine) {
      const remote = await apiFetch(apiPath, 'GET');
      if (remote !== null && JSON.stringify(remote) !== JSON.stringify(local)) {
        saveLocal(key, remote);
        setData(remote);
      }
    }
  }, [key, apiPath]);

  useEffect(() => {
    syncData();
    function handleStorage() { syncData(); }
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(syncData, 1000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [syncData]);

  const update = useCallback(async (val) => {
    saveLocal(key, val);
    setData(val);
    if (apiPath && navigator.onLine) {
      await apiFetch(apiPath, 'POST', val);
    }
  }, [key, apiPath]);

  return [data, update];
}

/* ---------------------------------------------------------
   HELPERS & MATH
--------------------------------------------------------- */
function genCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function oversStr(legalBalls) {
  const o = Math.floor((legalBalls || 0) / 6);
  const b = (legalBalls || 0) % 6;
  return `${o}.${b}`;
}

function economy(runs, balls) {
  if (!balls) return "0.00";
  return (runs / (balls / 6)).toFixed(2);
}

function strikeRate(runs, balls) {
  if (!balls) return "0.0";
  return ((runs / balls) * 100).toFixed(1);
}

function emptyBatsman(name) {
  return { name, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, how: "", bowler: "", fielder: "" };
}

function emptyBowler(name) {
  return { name, runs: 0, balls: 0, wkts: 0, overLog: [] };
}

function newInnings(battingTeam, bowlingTeam, battingPlayers = [], bowlingPlayers = [], oversLimit = 8, target = null) {
  return {
    battingTeam, bowlingTeam, battingPlayers, bowlingPlayers, oversLimit,
    target: target || null,
    batsmen: {}, bowlers: {},
    order: [],
    completedOvers: [],
    striker: null, nonStriker: null, currentBowler: null, prevBowler: null,
    score: 0, wkts: 0, legalBalls: 0,
    curOverRuns: 0, curOverWkts: 0,
    currentOverBalls: [],
    extras: { wd: 0, nb: 0 },
    freeHit: false,
    isComplete: false,
  };
}

/* ---------------------------------------------------------
   UI ATOMS
--------------------------------------------------------- */
function Panel({ children, style, className = "" }) {
  return (
    <div className={className} style={{ background: C.panel, border: `1px solid ${C.panelBorder}`, borderRadius: 14, ...style }}>
      {children}
    </div>
  );
}

function BigButton({ children, onClick, bg, color, style, disabled, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`tb-btn ${className}`}
      style={{
        background: bg || C.panel2,
        color: color || C.ink,
        border: `1px solid ${C.panelBorder}`,
        borderRadius: 12,
        fontFamily: FONT_BODY,
        fontWeight: 700,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: C.inkFaint, fontWeight: 700 }}>
      {children}
    </div>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      style={{
        width: "100%", background: C.bg2, border: `1px solid ${C.panelBorder}`, borderRadius: 10,
        padding: "10px 12px", color: C.ink, fontFamily: FONT_BODY, fontSize: 15, ...props.style,
      }}
    />
  );
}

function Chip({ children, onClick, active, style }) {
  return (
    <button
      onClick={onClick}
      className="tb-btn"
      style={{
        padding: "6px 12px", borderRadius: 999, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700,
        border: `1px solid ${active ? C.tape : C.panelBorder}`,
        background: active ? "rgba(242,169,59,0.18)" : "transparent",
        color: active ? C.tape : C.inkDim, cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function BackBar({ title, onBack, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", position: "sticky", top: 0, background: C.bg, zIndex: 20, borderBottom: `1px solid ${C.panelBorder}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onBack && (
          <button onClick={onBack} className="tb-btn" style={{ background: "none", border: "none", color: C.inkDim, fontSize: 20, cursor: "pointer", padding: 4 }}>
            ←
          </button>
        )}
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.ink, fontWeight: 600, letterSpacing: 0.5 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

function TeamLogo({ teamKey, size = "md", style }) {
  const team = DEFAULT_NSL_TEAMS[teamKey];
  const logoSrc = team ? team.logo : "assets/logos/ktg.jpg";
  const sizeClass = size === "sm" ? "team-logo-sm" : size === "lg" ? "team-logo-lg" : "team-logo-md";
  return (
    <img
      src={logoSrc}
      alt={team ? team.short : teamKey}
      className={sizeClass}
      style={style}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );
}

function OverDots({ balls = [] }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {balls.map((b, i) => {
        let bg = C.panel2, color = C.ink, border = C.panelBorder;
        if (b.type === "wicket") { bg = C.wicket; color = "#fff"; }
        else if (b.type === "wide" || b.type === "noball") { bg = "rgba(242,169,59,0.18)"; color = C.tape; border = C.tape; }
        else if (b.runs === 4) { bg = "rgba(79,168,214,0.18)"; color = C.free; border = C.free; }
        else if (b.runs === 6) { bg = C.tape2; color = "#fff"; }
        return (
          <div key={i} style={{
            minWidth: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, background: bg, color, border: `1px solid ${border}`,
          }}>
            {b.label}
          </div>
        );
      })}
    </div>
  );
}

function ScoreHeader({ inn, code, match }) {
  if (!inn) return null;

  const crr = economy(inn.score, inn.legalBalls);
  const projected = inn.legalBalls > 0 ? Math.round((inn.score / (inn.legalBalls / 6)) * inn.oversLimit) : 0;
  const runsNeeded = inn.target ? Math.max(inn.target - inn.score, 0) : 0;
  const ballsRem = inn.target ? Math.max(inn.oversLimit * 6 - inn.legalBalls, 0) : 0;
  const rrr = ballsRem > 0 ? (runsNeeded / (ballsRem / 6)).toFixed(2) : "0.00";

  return (
    <div style={{ padding: "16px 16px 10px", background: `linear-gradient(180deg, ${C.bg2}, ${C.bg})` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <TeamLogo teamKey={match ? match.teamAKey : "KTG"} size="sm" />
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.tape, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {inn.battingTeam} Batting
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 62, lineHeight: 1, color: C.ink, fontWeight: 600 }}>
              {inn.score}<span style={{ color: C.wicket }}>/{inn.wkts}</span>
            </span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 16, color: C.inkDim }}>
              ({oversStr(inn.legalBalls)} / {inn.oversLimit} ov)
            </span>
          </div>

          <div style={{ fontFamily: FONT_BODY, fontSize: 13, marginTop: 4 }}>
            {inn.target ? (
              <span style={{ color: C.tape, fontWeight: 800 }}>
                Need {runsNeeded} runs in {ballsRem} balls (RRR {rrr})
              </span>
            ) : (
              <span style={{ color: C.inkDim }}>
                CRR {crr} {inn.legalBalls >= 6 ? ` · Projected: ~${projected} runs` : ""}
              </span>
            )}
          </div>
        </div>

        {code && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.inkFaint, fontWeight: 700, letterSpacing: 1 }}>MATCH CODE</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 20, color: C.tape, fontWeight: 700, letterSpacing: 3 }}>{code}</div>
          </div>
        )}
      </div>
      {inn.freeHit && (
        <div className="tb-pulse" style={{ marginTop: 8, display: "inline-block", background: "rgba(79,168,214,0.15)", border: `1px solid ${C.free}`, color: C.free, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 12, padding: "4px 10px", borderRadius: 999, letterSpacing: 1 }}>
          ⚡ FREE HIT (Run Out Only)
        </div>
      )}
    </div>
  );
}

/* ===========================================================
   MAIN APPLICATION CONTAINER
=========================================================== */
function App() {
  const [screen, setScreen] = useState("home"); // home | setup | live | break | done | watch | scorecard_view
  const [match, setMatch] = useState(() => loadLocal("tapeball:active_match"));
  const [undoStack, setUndoStack] = useState([]);
  const [viewingMatch, setViewingMatch] = useState(null);

  const [nslTeams, setNslTeams] = useStorageSync("tapeball:nsl_teams", DEFAULT_NSL_TEAMS, "/api/teams");
  const [schedule, setSchedule] = useStorageSync("tapeball:nsl_schedule", DEFAULT_SCHEDULE, "/api/schedule");
  const [completedMatches, setCompletedMatches] = useStorageSync("tapeball:completed_matches", [], "/api/completed-matches");

  // PERSIST ACTIVE MATCH AUTOMATICALLY ON EVERY BALL SCORE
  useEffect(() => {
    if (!match) {
      saveLocal("tapeball:active_match", null);
      return;
    }
    if (match.status === "done") {
      saveLocal("tapeball:active_match", null);
    } else {
      saveLocal("tapeball:active_match", match);
    }

    if (match.code) {
      saveLocal(`tapeball:match:${match.code}`, match);
      if (navigator.onLine) {
        apiFetch(`/api/match/${match.code}`, 'POST', match);
      }
    }
  }, [match]);

  const snapshot = useCallback((m) => {
    setUndoStack((s) => [...s.slice(-19), structuredClone(m)]);
  }, []);

  const undo = () => {
    setUndoStack((s) => {
      if (s.length === 0) return s;
      const prev = s[s.length - 1];
      setMatch(prev);
      return s.slice(0, -1);
    });
  };

  // Add Emergency Player
  const handleAddPlayer = (teamKey, playerName) => {
    if (!playerName || !playerName.trim()) return;
    const name = playerName.trim();
    const updated = structuredClone(nslTeams);
    if (updated[teamKey] && !updated[teamKey].players.includes(name)) {
      updated[teamKey].players.push(name);
      setNslTeams(updated);
    }
  };

  // Reset entire tournament data
  const handleResetTournament = async () => {
    if (!window.confirm("Are you sure you want to reset all NSL matches and start fresh?")) return;
    saveLocal("tapeball:active_match", null);
    setMatch(null);
    setCompletedMatches([]);
    setSchedule(DEFAULT_SCHEDULE);
    setNslTeams(DEFAULT_NSL_TEAMS);
    if (navigator.onLine) {
      await apiFetch("/api/reset", "POST");
    }
    alert("NSL Tournament data has been completely reset!");
  };

  // Record Completed Match
  const handleRecordMatchComplete = (m) => {
    const list = completedMatches || [];
    const inn1 = m.innings[0], inn2 = m.innings[1];
    const rec = {
      id: m.code + "-" + Date.now(),
      scheduleId: m.scheduleId || null,
      matchNum: m.matchNum || null,
      teamA: m.teamA, teamB: m.teamB,
      teamAKey: m.teamAKey, teamBKey: m.teamBKey,
      scoreA: `${inn1.score}/${inn1.wkts} (${oversStr(inn1.legalBalls)})`,
      scoreB: inn2 ? `${inn2.score}/${inn2.wkts} (${oversStr(inn2.legalBalls)})` : "DNB",
      runsA: inn1.score, wktsA: inn1.wkts, ballsA: inn1.legalBalls,
      runsB: inn2 ? inn2.score : 0, wktsB: inn2 ? inn2.wkts : 0, ballsB: inn2 ? inn2.legalBalls : 0,
      oversLimit: m.oversLimit,
      result: m.result,
      winner: m.winner,
      date: new Date().toISOString(),
      innings: m.innings,
    };

    saveLocal("tapeball:active_match", null);
    const nextList = [...list.filter((x) => x.id !== rec.id), rec];
    setCompletedMatches(nextList);

    // Update schedule state & advance playoffs
    if (m.scheduleId && schedule) {
      const nextSched = schedule.map((item) => {
        if (item.id === m.scheduleId) {
          return { ...item, status: "done", result: m.result, winner: m.winner, matchData: rec };
        }
        return item;
      });

      // CHECK IF ALL 6 GROUP MATCHES ARE DONE TO UNLOCK KNOCKOUT
      const groupMatches = nextSched.filter((x) => x.round === 1);
      const allGroupDone = groupMatches.every((x) => x.status === "done");
      if (allGroupDone) {
        const standings = calculateStandings(nextList);
        const rank1 = standings[0] ? standings[0].teamKey : "Rank 1";
        const rank2 = standings[1] ? standings[1].teamKey : "Rank 2";
        const rank3 = standings[2] ? standings[2].teamKey : "Rank 3";

        // Unlock Match 7 (Knockout: 2nd vs 3rd)
        const m7 = nextSched.find((x) => x.id === "m7");
        if (m7 && m7.status === "locked") {
          m7.status = "pending";
          m7.teamA = rank2;
          m7.teamB = rank3;
        }

        // If Knockout is done, unlock Grand Final (Rank 1 vs Winner Knockout)
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
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: FONT_BODY, paddingBottom: 30 }}>
      {screen === "home" && (
        <Home
          nslTeams={nslTeams}
          schedule={schedule}
          completedMatches={completedMatches}
          activeMatch={match && match.status !== "done" ? match : null}
          onResume={() => setScreen(match.status === "break" ? "break" : "live")}
          onStartMatch={(schedMatch) => {
            const teamAKey = schedMatch.teamA;
            const teamBKey = schedMatch.teamB;
            const teamA = nslTeams[teamAKey] ? nslTeams[teamAKey].name : teamAKey;
            const teamB = nslTeams[teamBKey] ? nslTeams[teamBKey].name : teamBKey;
            const playersA = nslTeams[teamAKey] ? nslTeams[teamAKey].players : [];
            const playersB = nslTeams[teamBKey] ? nslTeams[teamBKey].players : [];

            const code = genCode();
            const inn1 = newInnings(teamA, teamB, playersA, playersB, 8, null);
            inn1.batsmen[playersA[0]] = emptyBatsman(playersA[0]);
            inn1.batsmen[playersA[1]] = emptyBatsman(playersA[1]);
            inn1.bowlers[playersB[0]] = emptyBowler(playersB[0]);
            inn1.striker = playersA[0];
            inn1.nonStriker = playersA[1];
            inn1.currentBowler = playersB[0];
            inn1.order = [playersA[0], playersA[1]];

            const newM = {
              code,
              scheduleId: schedMatch.id,
              matchNum: schedMatch.matchNum,
              teamA, teamB, teamAKey, teamBKey,
              playersA, playersB,
              oversLimit: 8,
              innings: [inn1],
              currentInningsIdx: 0,
              status: "live",
              result: "", winner: "",
              createdAt: Date.now(),
            };
            setMatch(newM);
            setUndoStack([]);
            setScreen("live");
          }}
          onWatch={() => setScreen("watch")}
          onViewScorecard={(mRec) => {
            setViewingMatch(mRec);
            setScreen("scorecard_view");
          }}
          onAddPlayer={handleAddPlayer}
          onResetTournament={handleResetTournament}
        />
      )}

      {screen === "live" && match && (
        <Live
          match={match}
          nslTeams={nslTeams}
          setMatch={(m) => { snapshot(match); setMatch(m); }}
          onUndo={undo}
          canUndo={undoStack.length > 0}
          onAddEmergencyPlayer={handleAddPlayer}
          onInningsBreak={(m) => { setMatch(m); setScreen("break"); }}
          onMatchDone={(m) => {
            setMatch(m);
            handleRecordMatchComplete(m);
            setScreen("done");
          }}
          onExit={() => setScreen("home")}
        />
      )}

      {screen === "break" && match && (
        <InningsBreak match={match} onContinue={(m) => { setMatch(m); setUndoStack([]); setScreen("live"); }} />
      )}

      {screen === "done" && match && (
        <MatchDone
          match={match}
          onHome={() => { setMatch(null); setScreen("home"); }}
        />
      )}

      {screen === "watch" && <Watch onBack={() => setScreen("home")} />}

      {screen === "scorecard_view" && viewingMatch && (
        <MatchScorecardViewer match={viewingMatch} onBack={() => setScreen("home")} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   HOME SCREEN (LEAGUE DASHBOARD WITH 4 TEAMS & STANDINGS)
--------------------------------------------------------- */
function Home({ nslTeams, schedule, completedMatches, activeMatch, onResume, onStartMatch, onWatch, onViewScorecard, onAddPlayer, onResetTournament }) {
  const [tab, setTab] = useState("standings"); // standings | fixtures | leaderboards | teams
  const [selectedTeamFilter, setSelectedTeamFilter] = useState("ALL");
  const [teamModalKey, setTeamModalKey] = useState(null);
  const [newPlayerName, setNewPlayerName] = useState("");

  const standings = calculateStandings(completedMatches);
  const overallStats = calculateOverallLeaderboard(completedMatches);

  return (
    <div className="tb-fadein" style={{ padding: "16px 16px 24px" }}>
      {/* HEADER & BRANDING */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: C.tape, boxShadow: `0 0 10px ${C.tape}` }} />
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, letterSpacing: 2, color: C.tape, fontWeight: 800, textTransform: "uppercase" }}>
            NSL PREMIER LEAGUE
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onResetTournament} className="tb-btn" style={{ background: "rgba(224,72,59,0.15)", border: `1px solid ${C.wicket}`, color: C.wicket, padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            Reset League
          </button>
          <button onClick={onWatch} className="tb-btn" style={{ background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            📡 Live Code
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 52, fontWeight: 600, lineHeight: 0.9, color: C.ink }}>
          NSL SCORECARD
        </div>
        <div style={{ color: C.inkDim, fontSize: 13, marginTop: 4 }}>
          4 Teams · 6 Matches Round 1 · Top ➔ Final · 2nd vs 3rd Knockout
        </div>
      </div>

      {/* 4 TEAMS QUICK ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        {Object.values(nslTeams).map((t) => (
          <Panel key={t.id} style={{ padding: "10px 4px", textAlign: "center", cursor: "pointer", borderColor: C.panelBorder }} onClick={() => setTeamModalKey(t.id)}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <TeamLogo teamKey={t.id} size="md" />
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: C.ink, marginTop: 6, fontWeight: 600 }}>
              {t.short}
            </div>
            <div style={{ fontSize: 10, color: C.inkFaint }}>
              {t.players.length} players
            </div>
          </Panel>
        ))}
      </div>

      {/* UNFINISHED MATCH PROMPT */}
      {activeMatch && (
        <Panel style={{ padding: 14, marginBottom: 16, borderColor: C.tape, background: "rgba(242,169,59,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.tape, fontWeight: 800 }}>⚠️ LIVE MATCH IN PROGRESS</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.inkDim }}>Code: {activeMatch.code}</span>
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.ink, marginTop: 4 }}>
            {activeMatch.teamA} vs {activeMatch.teamB}
          </div>
          <BigButton onClick={onResume} bg={C.win} color="#0A1F0B" style={{ marginTop: 10, width: "100%", padding: 12, fontFamily: FONT_DISPLAY, fontSize: 18 }}>
            ▶ Resume Match Right Now
          </BigButton>
        </Panel>
      )}

      {/* NAVIGATION TABS */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
        <Chip active={tab === "standings"} onClick={() => setTab("standings")}>🏆 Points & NRR</Chip>
        <Chip active={tab === "fixtures"} onClick={() => setTab("fixtures")}>📅 Schedule & Play</Chip>
        <Chip active={tab === "leaderboards"} onClick={() => setTab("leaderboards")}>📊 Leaderboards</Chip>
        <Chip active={tab === "teams"} onClick={() => setTab("teams")}>🏏 Team Squads</Chip>
      </div>

      {/* 1. STANDINGS & NRR TAB */}
      {tab === "standings" && (
        <div className="tb-fadein">
          <Panel style={{ padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Label>Points Table (Win=2, Tie=1, Loss=0)</Label>
              <span style={{ fontSize: 10, color: C.tape, fontWeight: 700 }}>8 Overs Match</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
              <thead>
                <tr style={{ color: C.inkFaint, textAlign: "left", fontSize: 10, borderBottom: `1px solid ${C.panelBorder}` }}>
                  <th style={{ paddingBottom: 6 }}>Team</th>
                  <th>P</th><th>W</th><th>L</th><th>T</th><th>Pts</th><th>NRR</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((st, idx) => {
                  const teamObj = nslTeams[st.teamKey];
                  const rankBadge = idx === 0 ? "badge-finalist" : (idx === 1 || idx === 2) ? "badge-knockout" : "badge-elim";
                  const rankLabel = idx === 0 ? "DIRECT FINAL" : (idx === 1 || idx === 2) ? "KNOCKOUT" : "OUT";
                  return (
                    <tr key={st.teamKey} style={{ borderTop: `1px solid ${C.panelBorder}` }}>
                      <td style={{ padding: "10px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <TeamLogo teamKey={st.teamKey} size="sm" />
                          <div>
                            <div style={{ color: C.ink, fontWeight: 700 }}>{teamObj ? teamObj.short : st.teamKey}</div>
                            <span className={rankBadge} style={{ fontSize: 9 }}>{rankLabel}</span>
                          </div>
                        </div>
                      </td>
                      <td>{st.played}</td>
                      <td>{st.won}</td>
                      <td>{st.lost}</td>
                      <td>{st.tied}</td>
                      <td style={{ color: C.tape, fontWeight: 800, fontSize: 14 }}>{st.pts}</td>
                      <td style={{ color: st.nrr >= 0 ? C.win : C.wicket }}>
                        {st.nrr >= 0 ? `+${st.nrr.toFixed(3)}` : st.nrr.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          <Panel style={{ padding: 14 }}>
            <Label>NSL Tournament Qualification Format</Label>
            <div style={{ fontSize: 13, color: C.inkDim, marginTop: 8, lineHeight: 1.6 }}>
              • <strong>1st Place</strong>: Advances <strong>directly to the Grand Final</strong>! 🏆<br />
              • <strong>2nd vs 3rd Place</strong>: Play the <strong>Knockout Qualifier</strong> match! ⚔️<br />
              • <strong>4th Place (Last)</strong>: Eliminated from the tournament. ❌
            </div>
          </Panel>
        </div>
      )}

      {/* 2. FIXTURES & SCHEDULE TAB */}
      {tab === "fixtures" && (
        <div className="tb-fadein" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {schedule.map((item) => {
            const teamAObj = nslTeams[item.teamA];
            const teamBObj = nslTeams[item.teamB];
            const isCompleted = item.status === "done";
            const isLocked = item.status === "locked";

            return (
              <Panel key={item.id} style={{ padding: 14, borderColor: item.isPlayoff ? C.tape : C.panelBorder, background: item.isPlayoff ? "rgba(242,169,59,0.06)" : C.panel }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: item.isPlayoff ? C.tape : C.inkFaint, textTransform: "uppercase" }}>
                    {item.stageName}
                  </span>
                  {isCompleted ? (
                    <span style={{ color: C.win, fontSize: 11, fontWeight: 800 }}>✓ COMPLETED</span>
                  ) : isLocked ? (
                    <span style={{ color: C.inkFaint, fontSize: 11, fontWeight: 700 }}>🔒 WAITING GROUP STANDINGS</span>
                  ) : (
                    <span style={{ color: C.tape, fontSize: 11, fontWeight: 800 }}>UPCOMING</span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TeamLogo teamKey={item.teamA} size="md" />
                    <div>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: C.ink }}>
                        {teamAObj ? teamAObj.short : item.teamA}
                      </div>
                      <div style={{ fontSize: 11, color: C.inkDim }}>
                        {teamAObj ? teamAObj.name : ""}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: C.inkFaint }}>VS</div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexDirection: "row-reverse", textAlign: "right" }}>
                    <TeamLogo teamKey={item.teamB} size="md" />
                    <div>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: C.ink }}>
                        {teamBObj ? teamBObj.short : item.teamB}
                      </div>
                      <div style={{ fontSize: 11, color: C.inkDim }}>
                        {teamBObj ? teamBObj.name : ""}
                      </div>
                    </div>
                  </div>
                </div>

                {isCompleted ? (
                  <div style={{ borderTop: `1px solid ${C.panelBorder}`, paddingTop: 8, marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ color: C.tape, fontSize: 13, fontWeight: 700 }}>
                      {item.result}
                    </div>
                    {item.matchData && (
                      <button onClick={() => onViewScorecard(item.matchData)} className="tb-btn" style={{ background: C.panel2, border: `1px solid ${C.panelBorder}`, color: C.ink, padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        View Card
                      </button>
                    )}
                  </div>
                ) : !isLocked && (
                  <BigButton
                    onClick={() => onStartMatch(item)}
                    bg={item.isPlayoff ? C.win : C.tape}
                    color={item.isPlayoff ? "#0A1F0B" : "#1A1305"}
                    style={{ marginTop: 10, width: "100%", padding: 12, fontFamily: FONT_DISPLAY, fontSize: 18 }}
                  >
                    Start Match {item.matchNum} ▶
                  </BigButton>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      {/* 3. MULTI-TIER LEADERBOARDS TAB */}
      {tab === "leaderboards" && (
        <div className="tb-fadein" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Team Filter selector */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
            <Chip active={selectedTeamFilter === "ALL"} onClick={() => setSelectedTeamFilter("ALL")}>All Teams</Chip>
            {Object.values(nslTeams).map((t) => (
              <Chip key={t.id} active={selectedTeamFilter === t.id} onClick={() => setSelectedTeamFilter(t.id)}>{t.short}</Chip>
            ))}
          </div>

          {/* ORANGE CAP (RUNS) */}
          <Panel style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>🟠</span>
              <Label>Top Run Scorers (Orange Cap)</Label>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
              <thead>
                <tr style={{ color: C.inkFaint, textAlign: "left", fontSize: 10, borderBottom: `1px solid ${C.panelBorder}` }}>
                  <th style={{ paddingBottom: 6 }}>Player</th><th>Team</th><th>Runs</th><th>Balls</th><th>SR</th><th>6s</th>
                </tr>
              </thead>
              <tbody>
                {overallStats.batsmen
                  .filter((b) => selectedTeamFilter === "ALL" || b.teamKey === selectedTeamFilter)
                  .slice(0, 10).map((b, i) => (
                    <tr key={b.name} style={{ borderTop: `1px solid ${C.panelBorder}` }}>
                      <td style={{ padding: "7px 0", color: i === 0 ? C.tape : C.ink, fontWeight: i === 0 ? 700 : 400 }}>
                        {b.name}
                      </td>
                      <td style={{ color: C.inkDim }}>{b.teamShort}</td>
                      <td style={{ color: C.tape, fontWeight: 700 }}>{b.runs}</td>
                      <td>{b.balls}</td>
                      <td>{strikeRate(b.runs, b.balls)}</td>
                      <td style={{ color: C.tape2 }}>{b.sixes}</td>
                    </tr>
                ))}
              </tbody>
            </table>
            {overallStats.batsmen.length === 0 && (
              <div style={{ color: C.inkDim, fontSize: 12, padding: "10px 0" }}>No completed match data recorded yet.</div>
            )}
          </Panel>

          {/* PURPLE CAP (WICKETS) */}
          <Panel style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>🟣</span>
              <Label>Top Wicket Takers (Purple Cap)</Label>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
              <thead>
                <tr style={{ color: C.inkFaint, textAlign: "left", fontSize: 10, borderBottom: `1px solid ${C.panelBorder}` }}>
                  <th style={{ paddingBottom: 6 }}>Bowler</th><th>Team</th><th>Wkts</th><th>Overs</th><th>Runs</th><th>Econ</th>
                </tr>
              </thead>
              <tbody>
                {overallStats.bowlers
                  .filter((bw) => selectedTeamFilter === "ALL" || bw.teamKey === selectedTeamFilter)
                  .slice(0, 10).map((bw, i) => (
                    <tr key={bw.name} style={{ borderTop: `1px solid ${C.panelBorder}` }}>
                      <td style={{ padding: "7px 0", color: i === 0 ? C.tape : C.ink, fontWeight: i === 0 ? 700 : 400 }}>
                        {bw.name}
                      </td>
                      <td style={{ color: C.inkDim }}>{bw.teamShort}</td>
                      <td style={{ color: C.win, fontWeight: 700 }}>{bw.wkts}</td>
                      <td>{Math.floor(bw.balls / 6)}.{bw.balls % 6}</td>
                      <td>{bw.runs}</td>
                      <td>{economy(bw.runs, bw.balls)}</td>
                    </tr>
                ))}
              </tbody>
            </table>
            {overallStats.bowlers.length === 0 && (
              <div style={{ color: C.inkDim, fontSize: 12, padding: "10px 0" }}>No completed match data recorded yet.</div>
            )}
          </Panel>

          {/* MAXIMUM SIXES */}
          <Panel style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>💥</span>
              <Label>Maximum Sixes Award</Label>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
              <thead>
                <tr style={{ color: C.inkFaint, textAlign: "left", fontSize: 10, borderBottom: `1px solid ${C.panelBorder}` }}>
                  <th style={{ paddingBottom: 6 }}>Player</th><th>Team</th><th>Sixes</th><th>Fours</th><th>Runs</th>
                </tr>
              </thead>
              <tbody>
                {overallStats.batsmen
                  .filter((b) => (selectedTeamFilter === "ALL" || b.teamKey === selectedTeamFilter) && b.sixes > 0)
                  .sort((a, b) => b.sixes - a.sixes || b.runs - a.runs)
                  .slice(0, 8).map((b, i) => (
                    <tr key={b.name} style={{ borderTop: `1px solid ${C.panelBorder}` }}>
                      <td style={{ padding: "7px 0", color: C.ink }}>{b.name}</td>
                      <td style={{ color: C.inkDim }}>{b.teamShort}</td>
                      <td style={{ color: C.tape2, fontWeight: 700, fontSize: 13 }}>{b.sixes}</td>
                      <td>{b.fours}</td>
                      <td>{b.runs}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      )}

      {/* 4. TEAM SQUADS & EMERGENCY ADD PLAYER */}
      {tab === "teams" && (
        <div className="tb-fadein" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {Object.values(nslTeams).map((t) => (
            <Panel key={t.id} style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <TeamLogo teamKey={t.id} size="md" />
                  <div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: C.ink }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: C.tape, fontWeight: 700 }}>Captain: {t.captain}</div>
                  </div>
                </div>
                <button onClick={() => setTeamModalKey(t.id)} className="tb-btn" style={{ background: C.panel2, border: `1px solid ${C.tape}`, color: C.tape, padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  + Add Player
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {t.players.map((p, idx) => (
                  <div key={idx} style={{ background: C.bg2, border: `1px solid ${C.panelBorder}`, padding: "4px 8px", borderRadius: 8, fontSize: 12, color: p.includes("(C)") ? C.tape : C.ink }}>
                    {p}
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* EMERGENCY ADD PLAYER MODAL */}
      {teamModalKey && (
        <ModalShell title={`Add Emergency Player to ${nslTeams[teamModalKey]?.name}`} onClose={() => setTeamModalKey(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Label>Player Name</Label>
            <TextInput
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="e.g. Tariq Khan"
            />
            <BigButton
              onClick={() => {
                if (newPlayerName.trim()) {
                  onAddPlayer(teamModalKey, newPlayerName.trim());
                  setNewPlayerName("");
                  setTeamModalKey(null);
                }
              }}
              disabled={!newPlayerName.trim()}
              bg={C.win}
              color="#0A1F0B"
              style={{ padding: 14, fontFamily: FONT_DISPLAY, fontSize: 18 }}
            >
              Confirm Emergency Player Addition ▶
            </BigButton>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   STANDINGS & NRR CALCULATION ENGINE
--------------------------------------------------------- */
function calculateStandings(completedMatches = []) {
  const teams = ["KTG", "ASK", "NKG", "ALW"];
  const stats = {};

  teams.forEach((t) => {
    stats[t] = {
      teamKey: t, played: 0, won: 0, lost: 0, tied: 0, pts: 0,
      runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0, nrr: 0,
    };
  });

  (completedMatches || []).forEach((m) => {
    // Only count Round 1 matches towards group standings
    if (m.isPlayoff) return;
    if (!m.innings || m.innings.length < 1) return;

    const inn1 = m.innings[0], inn2 = m.innings[1];
    const tA = m.teamAKey || "KTG";
    const tB = m.teamBKey || "ASK";

    if (!stats[tA] || !stats[tB]) return;

    stats[tA].played += 1;
    stats[tB].played += 1;

    if (m.winner === m.teamA) {
      stats[tA].won += 1; stats[tA].pts += 2;
      stats[tB].lost += 1;
    } else if (m.winner === m.teamB) {
      stats[tB].won += 1; stats[tB].pts += 2;
      stats[tA].lost += 1;
    } else {
      stats[tA].tied += 1; stats[tA].pts += 1;
      stats[tB].tied += 1; stats[tB].pts += 1;
    }

    // 1st Innings stats (Batting team = inn1.battingTeam)
    const t1Key = inn1.battingTeam === m.teamA ? tA : tB;
    const t2Key = t1Key === tA ? tB : tA;

    stats[t1Key].runsScored += inn1.score;
    // All out rule: if all wickets lost, count full 8 overs (48 balls)
    const allOut1 = inn1.wkts >= (inn1.battingPlayers?.length - 1 || 10);
    stats[t1Key].ballsFaced += allOut1 ? inn1.oversLimit * 6 : inn1.legalBalls;

    stats[t2Key].runsConceded += inn1.score;
    stats[t2Key].ballsBowled += allOut1 ? inn1.oversLimit * 6 : inn1.legalBalls;

    // 2nd Innings stats
    if (inn2) {
      stats[t2Key].runsScored += inn2.score;
      const allOut2 = inn2.wkts >= (inn2.battingPlayers?.length - 1 || 10);
      stats[t2Key].ballsFaced += allOut2 ? inn2.oversLimit * 6 : inn2.legalBalls;

      stats[t1Key].runsConceded += inn2.score;
      stats[t1Key].ballsBowled += allOut2 ? inn2.oversLimit * 6 : inn2.legalBalls;
    }
  });

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
   OVERALL LEADERBOARDS CALCULATION
--------------------------------------------------------- */
function calculateOverallLeaderboard(completedMatches = []) {
  const batsmen = {};
  const bowlers = {};

  (completedMatches || []).forEach((m) => {
    if (!m.innings) return;

    m.innings.forEach((inn) => {
      if (!inn || !inn.batsmen) return;
      const teamKey = inn.battingTeam === m.teamA ? m.teamAKey : m.teamBKey;
      const teamObj = DEFAULT_NSL_TEAMS[teamKey];
      const teamShort = teamObj ? teamObj.short : teamKey;

      Object.values(inn.batsmen).forEach((b) => {
        if (!b || (b.balls === 0 && b.runs === 0)) return;
        if (!batsmen[b.name]) {
          batsmen[b.name] = { name: b.name, teamKey, teamShort, runs: 0, balls: 0, fours: 0, sixes: 0, innings: 0 };
        }
        batsmen[b.name].runs += b.runs;
        batsmen[b.name].balls += b.balls;
        batsmen[b.name].fours += b.fours;
        batsmen[b.name].sixes += b.sixes;
        batsmen[b.name].innings += 1;
      });

      if (!inn.bowlers) return;
      const bowlTeamKey = inn.bowlingTeam === m.teamA ? m.teamAKey : m.teamBKey;
      const bowlTeamObj = DEFAULT_NSL_TEAMS[bowlTeamKey];
      const bowlTeamShort = bowlTeamObj ? bowlTeamObj.short : bowlTeamKey;

      Object.values(inn.bowlers).forEach((bw) => {
        if (!bw || bw.balls === 0) return;
        if (!bowlers[bw.name]) {
          bowlers[bw.name] = { name: bw.name, teamKey: bowlTeamKey, teamShort: bowlTeamShort, wkts: 0, balls: 0, runs: 0, matches: 0 };
        }
        bowlers[bw.name].wkts += bw.wkts;
        bowlers[bw.name].balls += bw.balls;
        bowlers[bw.name].runs += bw.runs;
        bowlers[bw.name].matches += 1;
      });
    });
  });

  const sortedBatsmen = Object.values(batsmen).sort((a, b) => b.runs - a.runs || b.sixes - a.sixes);
  const sortedBowlers = Object.values(bowlers).sort((a, b) => b.wkts - a.wkts || a.runs - b.runs);

  return { batsmen: sortedBatsmen, bowlers: sortedBowlers };
}

/* ---------------------------------------------------------
   LIVE SCORER ENGINE (WITH EMERGENCY PLAYER & FAST WICKETS)
--------------------------------------------------------- */
function Live({ match, nslTeams, setMatch, onUndo, canUndo, onAddEmergencyPlayer, onInningsBreak, onMatchDone, onExit }) {
  const inn = match.innings[match.currentInningsIdx];
  const [wicketOpen, setWicketOpen] = useState(false);
  const [noBallOpen, setNoBallOpen] = useState(false);
  const [bowlerModal, setBowlerModal] = useState(() => !inn.currentBowler);
  const [newBatModal, setNewBatModal] = useState(null);
  const [tab, setTab] = useState("score");

  function handleSwapStriker() {
    const m2 = structuredClone(match);
    const inn2 = m2.innings[m2.currentInningsIdx];
    const temp = inn2.striker;
    inn2.striker = inn2.nonStriker;
    inn2.nonStriker = temp;
    setMatch(m2);
  }

  function checkInningsEnd(m2, inn2) {
    const oversDone = inn2.legalBalls >= inn2.oversLimit * 6;
    const chased = inn2.target != null && inn2.score >= inn2.target;

    if (!oversDone && !chased) return { m2, ended: false };

    inn2.isComplete = true;
    if (m2.currentInningsIdx === 0) {
      m2.status = "break";
      return { m2, ended: true, toBreak: true };
    } else {
      m2.status = "done";
      const inn1 = m2.innings[0];
      if (inn2.score >= inn2.target) {
        m2.winner = inn2.battingTeam;
        m2.result = `${inn2.battingTeam} won the match!`;
      } else if (inn2.score === inn2.target - 1) {
        m2.winner = "";
        m2.result = "Match tied";
      } else {
        const margin = inn2.target - 1 - inn2.score;
        m2.winner = inn1.battingTeam;
        m2.result = `${inn1.battingTeam} won by ${margin} run${margin === 1 ? "" : "s"}`;
      }
      return { m2, ended: true, toBreak: false };
    }
  }

  function finishOver(m2, inn2) {
    if (inn2.currentBowler && inn2.bowlers[inn2.currentBowler]) {
      inn2.bowlers[inn2.currentBowler].overLog = inn2.bowlers[inn2.currentBowler].overLog || [];
      inn2.bowlers[inn2.currentBowler].overLog.push({ runs: inn2.curOverRuns, wkts: inn2.curOverWkts });
    }

    inn2.completedOvers = inn2.completedOvers || [];
    inn2.completedOvers.push({
      overNum: Math.floor(inn2.legalBalls / 6),
      bowler: inn2.currentBowler,
      runs: inn2.curOverRuns,
      wkts: inn2.curOverWkts,
      balls: [...inn2.currentOverBalls],
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

  function applyNormal(runs) {
    const m2 = structuredClone(match);
    const inn2 = m2.innings[m2.currentInningsIdx];
    const bat = inn2.batsmen[inn2.striker];
    const bowl = inn2.bowlers[inn2.currentBowler];
    
    if (bat) {
      bat.runs += runs;
      bat.balls += 1;
      if (runs === 4) bat.fours += 1;
      if (runs === 6) bat.sixes += 1;
    }
    if (bowl) {
      bowl.runs += runs;
      bowl.balls += 1;
    }
    
    inn2.score += runs;
    inn2.legalBalls += 1;
    inn2.curOverRuns += runs;
    inn2.currentOverBalls.push({ type: "run", runs, label: String(runs) });
    inn2.freeHit = false;

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

  function applyWide() {
    const m2 = structuredClone(match);
    const inn2 = m2.innings[m2.currentInningsIdx];
    const bowl = inn2.bowlers[inn2.currentBowler];

    inn2.extras.wd += 1;
    inn2.score += 1;
    if (bowl) bowl.runs += 1;
    inn2.curOverRuns += 1;
    inn2.currentOverBalls.push({ type: "wide", label: "wd" });

    const { m2: m3, ended, toBreak } = checkInningsEnd(m2, inn2);
    if (ended) {
      if (toBreak) { setMatch(m3); onInningsBreak(m3); return; }
      else { onMatchDone(m3); return; }
    }
    setMatch(m3);
  }

  function applyNoBall(runsOffBat) {
    const m2 = structuredClone(match);
    const inn2 = m2.innings[m2.currentInningsIdx];
    const bat = inn2.batsmen[inn2.striker];
    const bowl = inn2.bowlers[inn2.currentBowler];

    const totalRunsThisBall = 1 + runsOffBat;

    inn2.extras.nb += 1;
    inn2.score += totalRunsThisBall;

    if (runsOffBat > 0 && bat) {
      bat.runs += runsOffBat;
      bat.balls += 1;
      if (runsOffBat === 4) bat.fours += 1;
      if (runsOffBat === 6) bat.sixes += 1;
    }

    if (bowl) bowl.runs += totalRunsThisBall;
    inn2.curOverRuns += totalRunsThisBall;

    const dotLabel = runsOffBat > 0 ? `nb+${runsOffBat}` : "nb";
    inn2.currentOverBalls.push({ type: "noball", label: dotLabel });
    inn2.freeHit = true;

    if (runsOffBat % 2 === 1) {
      const t = inn2.striker;
      inn2.striker = inn2.nonStriker;
      inn2.nonStriker = t;
    }

    const { m2: m3, ended, toBreak } = checkInningsEnd(m2, inn2);
    setNoBallOpen(false);

    if (ended) {
      if (toBreak) { setMatch(m3); onInningsBreak(m3); return; }
      else { onMatchDone(m3); return; }
    }
    setMatch(m3);
  }

  function applyWicket({ type, whoOut, runsCompleted, newBatsman }) {
    const m2 = structuredClone(match);
    const inn2 = m2.innings[m2.currentInningsIdx];
    const bowl = inn2.bowlers[inn2.currentBowler];
    const outName = whoOut === "striker" ? inn2.striker : inn2.nonStriker;
    const bat = inn2.batsmen[outName];

    if (runsCompleted > 0) {
      const scorer = inn2.batsmen[inn2.striker];
      if (scorer) scorer.runs += runsCompleted;
      inn2.score += runsCompleted;
      inn2.curOverRuns += runsCompleted;
    }

    if (bat) {
      bat.out = true;
      bat.how = type;
      if (type !== "run out" && type !== "retired") { bat.bowler = inn2.currentBowler; }
      if (type !== "retired") bat.balls += type === "run out" ? 0 : 1;
    }

    if (type !== "run out" && type !== "retired" && bowl) {
      bowl.wkts += 1;
      bowl.balls += 1;
    } else if (bowl && type === "run out") {
      bowl.balls += 1;
    }

    if (type !== "retired") {
      inn2.legalBalls += 1;
      inn2.wkts += 1;
      inn2.curOverWkts += 1;
      inn2.currentOverBalls.push({ type: "wicket", label: "W" });
    }
    inn2.freeHit = false;

    if (newBatsman) {
      if (inn2.batsmen[newBatsman] && inn2.batsmen[newBatsman].how === "retired") {
        inn2.batsmen[newBatsman].out = false;
        inn2.batsmen[newBatsman].how = "";
      } else {
        inn2.batsmen[newBatsman] = inn2.batsmen[newBatsman] || emptyBatsman(newBatsman);
      }

      if (!inn2.battingPlayers.includes(newBatsman)) inn2.battingPlayers.push(newBatsman);
      if (!inn2.order.includes(newBatsman)) inn2.order.push(newBatsman);
      if (whoOut === "striker") inn2.striker = newBatsman;
      else inn2.nonStriker = newBatsman;
    }

    if (runsCompleted % 2 === 1) {
      const t = inn2.striker;
      inn2.striker = inn2.nonStriker;
      inn2.nonStriker = t;
    }

    const { m2: m3, ended, toBreak } = checkInningsEnd(m2, inn2);
    setWicketOpen(false);
    setNewBatModal(null);

    if (ended) {
      if (toBreak) { setMatch(m3); onInningsBreak(m3); return; }
      else { onMatchDone(m3); return; }
    }

    if (type !== "retired" && inn2.legalBalls % 6 === 0) {
      finishOver(m3, inn2);
      setMatch(m3);
      setBowlerModal(true);
      return;
    }
    setMatch(m3);
  }

  function pickBowler(name) {
    const m2 = structuredClone(match);
    const inn2 = m2.innings[m2.currentInningsIdx];
    inn2.currentBowler = name;
    inn2.bowlers[name] = inn2.bowlers[name] || emptyBowler(name);
    if (!inn2.bowlingPlayers.includes(name)) inn2.bowlingPlayers.push(name);
    setMatch(m2);
    setBowlerModal(false);
  }

  const bat1 = inn.striker ? inn.batsmen[inn.striker] : null;
  const bat2 = inn.nonStriker ? inn.batsmen[inn.nonStriker] : null;
  const bowl = inn.currentBowler ? inn.bowlers[inn.currentBowler] : null;

  const retiredBatsmen = (inn.order || []).filter((n) => inn.batsmen[n] && inn.batsmen[n].how === "retired");
  const unbattedPlayers = (inn.battingPlayers || []).filter((p) => !inn.order.includes(p));

  return (
    <div className="tb-fadein">
      <BackBar title={`${match.teamA} vs ${match.teamB}`} onBack={onExit}
        right={
          <button onClick={onUndo} disabled={!canUndo} className="tb-btn" style={{ background: "none", border: `1px solid ${C.panelBorder}`, color: canUndo ? C.ink : C.inkFaint, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: FONT_BODY, fontWeight: 700 }}>
            ↺ Undo
          </button>
        }
      />
      <ScoreHeader inn={inn} code={match.code} match={match} />

      <div style={{ display: "flex", gap: 6, padding: "0 16px 10px" }}>
        <Chip active={tab === "score"} onClick={() => setTab("score")}>Scoreboard</Chip>
        <Chip active={tab === "history"} onClick={() => setTab("history")}>Over History ({inn.completedOvers?.length || 0})</Chip>
        <Chip active={tab === "card"} onClick={() => setTab("card")}>Full Scorecard</Chip>
      </div>

      {tab === "score" && (
        <div style={{ padding: "0 16px" }}>
          <Panel style={{ padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <Label>Active Batsmen</Label>
              <button onClick={handleSwapStriker} className="tb-btn" style={{ background: C.panel2, border: `1px solid ${C.tape}`, color: C.tape, padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                ⇄ Swap Striker
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT_MONO, fontSize: 14 }}>
              <div>
                <div style={{ color: C.tape, fontWeight: 700 }}>
                  ● {bat1 ? bat1.name : "—"} <span style={{ color: C.inkDim }}>{bat1 ? `${bat1.runs}(${bat1.balls})` : ""}</span>
                </div>
                <div style={{ color: C.inkDim }}>
                  &nbsp;&nbsp;{bat2 ? bat2.name : "—"} {bat2 ? `${bat2.runs}(${bat2.balls})` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right", color: C.inkDim }}>
                {bowl ? (
                  <div>
                    {bowl.name} — {bowl.wkts}/{bowl.runs} ({Math.floor(bowl.balls/6)}.{bowl.balls%6})
                  </div>
                ) : (
                  <div style={{ color: C.tape, fontWeight: 700 }}>Select bowler…</div>
                )}
              </div>
            </div>
          </Panel>

          <div style={{ marginBottom: 12 }}>
            <Label>This over</Label>
            <div style={{ marginTop: 8 }}><OverDots balls={inn.currentOverBalls || []} /></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 8 }}>
            {[0, 1, 2, 3, 4, 6].map((n) => (
              <BigButton key={n} onClick={() => applyNormal(n)} disabled={!inn.currentBowler}
                bg={n === 4 ? "rgba(79,168,214,0.12)" : n === 6 ? C.tape2 : C.panel2}
                color={n === 6 ? "#fff" : C.ink}
                style={{ padding: "16px 0", fontFamily: FONT_DISPLAY, fontSize: 28 }}>
                {n}
              </BigButton>
            ))}
            <BigButton onClick={() => setWicketOpen(true)} disabled={!inn.currentBowler} bg={C.wicket} color="#fff" style={{ padding: "16px 0", fontFamily: FONT_DISPLAY, fontSize: 22 }}>OUT</BigButton>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <BigButton onClick={applyWide} disabled={!inn.currentBowler} style={{ padding: "14px 0", fontFamily: FONT_DISPLAY, fontSize: 20 }}>WD (+1 Extra)</BigButton>
            <BigButton onClick={() => setNoBallOpen(true)} disabled={!inn.currentBowler} style={{ padding: "14px 0", fontFamily: FONT_DISPLAY, fontSize: 20 }}>NB (No Ball Runs)</BigButton>
          </div>

          <div style={{ marginTop: 16, fontFamily: FONT_MONO, fontSize: 11, color: C.inkFaint }}>
            Extras — Wide {inn.extras.wd} · No Ball {inn.extras.nb}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <Label>Completed Overs Breakdown</Label>
          {(inn.completedOvers || []).slice().reverse().map((ov, idx) => (
            <Panel key={idx} style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 800, color: C.tape }}>
                  Over {ov.overNum} — Bowler: {ov.bowler}
                </div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.inkDim }}>
                  {ov.runs} runs · {ov.wkts} wkts
                </div>
              </div>
              <OverDots balls={ov.balls || []} />
            </Panel>
          ))}
          {(!inn.completedOvers || inn.completedOvers.length === 0) && (
            <div style={{ color: C.inkDim, padding: 20 }}>No overs completed yet in this innings.</div>
          )}
        </div>
      )}

      {tab === "card" && <Scorecard inn={inn} />}

      {noBallOpen && (
        <NoBallModal
          onSelect={(runsOffBat) => applyNoBall(runsOffBat)}
          onClose={() => setNoBallOpen(false)}
        />
      )}

      {wicketOpen && (
        <WicketModal
          isFreeHit={inn.freeHit}
          striker={inn.striker} nonStriker={inn.nonStriker}
          onClose={() => setWicketOpen(false)}
          onConfirm={(dismissalData) => {
            setNewBatModal(dismissalData);
          }}
        />
      )}

      {newBatModal && (
        <NewBatsmanModal
          retiredBatsmen={retiredBatsmen}
          unbattedPlayers={unbattedPlayers}
          onConfirm={(name) => applyWicket({ ...newBatModal, newBatsman: name })}
          onAddEmergencyPlayer={(pName) => {
            const teamKey = inn.battingTeam === match.teamA ? match.teamAKey : match.teamBKey;
            onAddEmergencyPlayer(teamKey, pName);
            applyWicket({ ...newBatModal, newBatsman: pName });
          }}
          onClose={() => setNewBatModal(null)}
        />
      )}

      {bowlerModal && (
        <BowlerModal
          existingBowlers={(inn.bowlingPlayers || []).filter(p => p !== inn.prevBowler)}
          onPick={pickBowler}
          onAddEmergencyPlayer={(pName) => {
            const teamKey = inn.bowlingTeam === match.teamA ? match.teamAKey : match.teamBKey;
            onAddEmergencyPlayer(teamKey, pName);
            pickBowler(pName);
          }}
        />
      )}
    </div>
  );
}

/* NO BALL RUNS MODAL */
function NoBallModal({ onSelect, onClose }) {
  return (
    <ModalShell title="⚡ No Ball — Select Runs Off The Bat" onClose={onClose}>
      <div style={{ color: C.inkDim, fontSize: 13, marginBottom: 14 }}>
        Each option automatically includes the <strong>+1 No Ball extra</strong> and grants a <strong>Free Hit</strong> on the next ball!
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <BigButton onClick={() => onSelect(0)} bg={C.panel2} style={{ padding: "16px 0", textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.tape }}>0</div>
          <div style={{ fontSize: 11, color: C.inkFaint }}>Just 1 NB Extra</div>
        </BigButton>
        <BigButton onClick={() => onSelect(1)} bg={C.panel2} style={{ padding: "16px 0", textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.ink }}>+1</div>
          <div style={{ fontSize: 11, color: C.inkFaint }}>Single (2 Total)</div>
        </BigButton>
        <BigButton onClick={() => onSelect(2)} bg={C.panel2} style={{ padding: "16px 0", textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.ink }}>+2</div>
          <div style={{ fontSize: 11, color: C.inkFaint }}>Double (3 Total)</div>
        </BigButton>
        <BigButton onClick={() => onSelect(3)} bg={C.panel2} style={{ padding: "16px 0", textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.ink }}>+3</div>
          <div style={{ fontSize: 11, color: C.inkFaint }}>Three (4 Total)</div>
        </BigButton>
        <BigButton onClick={() => onSelect(4)} bg="rgba(79,168,214,0.15)" style={{ padding: "16px 0", textAlign: "center", borderColor: C.free }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.free }}>+4</div>
          <div style={{ fontSize: 11, color: C.free }}>FOUR (5 Total)</div>
        </BigButton>
        <BigButton onClick={() => onSelect(6)} bg={C.tape2} color="#fff" style={{ padding: "16px 0", textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: "#fff" }}>+6</div>
          <div style={{ fontSize: 11, color: "#fff" }}>SIX (7 Total)</div>
        </BigButton>
      </div>
    </ModalShell>
  );
}

function Scorecard({ inn }) {
  if (!inn) return null;
  const battedOrder = (inn.order || []).filter((n) => inn.batsmen && inn.batsmen[n]);
  const bowlerList = Object.values(inn.bowlers || {});

  return (
    <div style={{ padding: "0 16px 16px" }}>
      <Panel style={{ padding: 12, marginBottom: 12 }}>
        <Label>Batting Scorecard — {inn.battingTeam}</Label>
        <table style={{ width: "100%", marginTop: 8, borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
          <thead>
            <tr style={{ color: C.inkFaint, textAlign: "left" }}>
              <th style={{ paddingBottom: 6 }}>Batsman</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th>
            </tr>
          </thead>
          <tbody>
            {battedOrder.map((n) => {
              const b = inn.batsmen[n];
              if (!b) return null;
              const isCurrent = !b.out && (n === inn.striker || n === inn.nonStriker);
              return (
                <tr key={n} style={{ borderTop: `1px solid ${C.panelBorder}` }}>
                  <td style={{ padding: "6px 0", color: C.ink }}>
                    {b.name}{isCurrent ? " *" : ""}
                    <div style={{ color: b.how === "retired" ? C.tape : C.inkFaint, fontSize: 10 }}>
                      {b.out ? (b.how === "retired" ? "retired" : b.how) : "not out"}
                    </div>
                  </td>
                  <td>{b.runs}</td><td>{b.balls}</td><td>{b.fours}</td><td>{b.sixes}</td><td>{strikeRate(b.runs, b.balls)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <Panel style={{ padding: 12 }}>
        <Label>Bowling Scorecard — {inn.bowlingTeam}</Label>
        <table style={{ width: "100%", marginTop: 8, borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
          <thead>
            <tr style={{ color: C.inkFaint, textAlign: "left" }}>
              <th style={{ paddingBottom: 6 }}>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th>
            </tr>
          </thead>
          <tbody>
            {bowlerList.map((b) => {
              const maidens = (b.overLog || []).filter((o) => o.runs === 0).length;
              return (
                <tr key={b.name} style={{ borderTop: `1px solid ${C.panelBorder}` }}>
                  <td style={{ padding: "6px 0", color: C.ink }}>{b.name}</td>
                  <td>{Math.floor(b.balls / 6)}.{b.balls % 6}</td>
                  <td>{maidens}</td>
                  <td>{b.runs}</td>
                  <td>{b.wkts}</td>
                  <td>{economy(b.runs, b.balls)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* WICKET MODAL WITH FAST 1-TAP DISMISSALS */
function WicketModal({ isFreeHit, striker, nonStriker, onClose, onConfirm }) {
  const [type, setType] = useState(isFreeHit ? "run out" : "bowled");
  const [whoOut, setWhoOut] = useState("striker");
  const [runsCompleted, setRunsCompleted] = useState(0);

  const types = isFreeHit ? ["run out"] : ["bowled", "caught", "lbw", "run out", "stumped", "retired"];

  function handleDismissalClick(t) {
    if (t === "retired") {
      onConfirm({ type: "retired", whoOut: "striker", runsCompleted: 0 });
    } else if (t !== "run out") {
      onConfirm({ type: t, whoOut: "striker", runsCompleted: 0 });
    } else {
      setType("run out");
    }
  }

  return (
    <ModalShell title={isFreeHit ? "Wicket (Free Hit)" : "Select Wicket Type"} onClose={onClose}>
      {isFreeHit && (
        <div style={{ color: C.free, fontSize: 12, marginBottom: 10, fontWeight: 700 }}>
          ⚡ Free Hit active: Only Run Out is allowed!
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {types.map((t) => (
          <Chip key={t} active={type === t} onClick={() => handleDismissalClick(t)}>
            {t.toUpperCase()} {t !== "run out" ? "⚡ (1-Tap)" : ""}
          </Chip>
        ))}
      </div>

      {type === "run out" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <Label>Who's Out</Label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <Chip active={whoOut === "striker"} onClick={() => setWhoOut("striker")}>{striker || "Striker"}</Chip>
              <Chip active={whoOut === "nonStriker"} onClick={() => setWhoOut("nonStriker")}>{nonStriker || "Non-Striker"}</Chip>
            </div>
          </div>
          <div>
            <Label>Runs Completed Before Run Out</Label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {[0, 1, 2, 3].map((n) => <Chip key={n} active={runsCompleted === n} onClick={() => setRunsCompleted(n)}>{n}</Chip>)}
            </div>
          </div>
          <BigButton onClick={() => onConfirm({ type: "run out", whoOut, runsCompleted })} bg={C.wicket} color="#fff" style={{ width: "100%", padding: 14, fontFamily: FONT_DISPLAY, fontSize: 18 }}>
            Confirm Run Out
          </BigButton>
        </div>
      )}
    </ModalShell>
  );
}

/* NEW BATSMAN MODAL WITH RETIRED RECALL & EMERGENCY PLAYER ADD */
function NewBatsmanModal({ retiredBatsmen = [], unbattedPlayers = [], onConfirm, onAddEmergencyPlayer, onClose }) {
  const [customName, setCustomName] = useState("");

  function handleAddCustom() {
    if (customName.trim()) {
      onAddEmergencyPlayer(customName.trim());
    }
  }

  return (
    <ModalShell title="Select Next Batsman" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {retiredBatsmen.length > 0 && (
          <Panel style={{ padding: 12, borderColor: C.tape }}>
            <Label>🔄 Bring Back Retired Batsman</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {retiredBatsmen.map((p) => (
                <BigButton key={p} onClick={() => onConfirm(p)} bg="rgba(242,169,59,0.15)" color={C.tape} style={{ padding: 12, textAlign: "left", fontSize: 15 }}>
                  ↪ Resume {p}
                </BigButton>
              ))}
            </div>
          </Panel>
        )}

        {unbattedPlayers.length > 0 && (
          <div>
            <Label>Select Team Batsman</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {unbattedPlayers.map((p) => (
                <BigButton key={p} onClick={() => onConfirm(p)} bg={C.panel2} style={{ padding: 12, textAlign: "left", fontSize: 15 }}>{p}</BigButton>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label>+ Add Emergency Player</Label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <TextInput value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Type new batsman name..." />
            <BigButton onClick={handleAddCustom} disabled={!customName.trim()} bg={C.tape} color="#1A1305" style={{ padding: "0 16px", whiteSpace: "nowrap" }}>
              + Add
            </BigButton>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

/* NEW BOWLER MODAL WITH EMERGENCY PLAYER ADD */
function BowlerModal({ existingBowlers = [], onPick, onAddEmergencyPlayer }) {
  const [customName, setCustomName] = useState("");

  function handleAddCustom() {
    if (customName.trim()) {
      onAddEmergencyPlayer(customName.trim());
    }
  }

  return (
    <ModalShell title="Over Complete — Next Bowler" onClose={null}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {existingBowlers.length > 0 && (
          <div>
            <Label>Select Team Bowler</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {existingBowlers.map((p) => (
                <BigButton key={p} onClick={() => onPick(p)} bg={C.panel2} style={{ padding: 12, textAlign: "left", fontSize: 15 }}>{p}</BigButton>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label>+ Add Emergency Bowler</Label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <TextInput value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Type new bowler name..." />
            <BigButton onClick={handleAddCustom} disabled={!customName.trim()} bg={C.tape} color="#1A1305" style={{ padding: "0 16px", whiteSpace: "nowrap" }}>
              + Add
            </BigButton>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,17,13,0.88)", display: "flex", alignItems: "flex-end", zIndex: 50 }}>
      <div className="tb-fadein" style={{ width: "100%", background: C.bg, borderTop: `1px solid ${C.panelBorder}`, borderRadius: "18px 18px 0 0", padding: 20, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: C.ink }}>{title}</div>
          {onClose && <button onClick={onClose} style={{ background: "none", border: "none", color: C.inkFaint, fontSize: 20, cursor: "pointer" }}>✕</button>}
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   INNINGS BREAK SCREEN
--------------------------------------------------------- */
function InningsBreak({ match, onContinue }) {
  const inn1 = match.innings[0];
  const battingTeam = inn1.bowlingTeam;
  const bowlingTeam = inn1.battingTeam;
  const battingPlayers = battingTeam === match.teamA ? match.playersA : match.playersB;
  const bowlingPlayers = bowlingTeam === match.teamA ? match.playersA : match.playersB;

  const [striker, setStriker] = useState(battingPlayers[0] || "");
  const [nonStriker, setNonStriker] = useState(battingPlayers[1] || "");
  const [bowler, setBowler] = useState(bowlingPlayers[0] || "");

  const target = inn1.score + 1;

  function start() {
    const m2 = structuredClone(match);
    const inn2 = newInnings(battingTeam, bowlingTeam, battingPlayers, bowlingPlayers, match.oversLimit, target);
    inn2.batsmen[striker] = emptyBatsman(striker);
    inn2.batsmen[nonStriker] = emptyBatsman(nonStriker);
    inn2.bowlers[bowler] = emptyBowler(bowler);
    inn2.striker = striker; inn2.nonStriker = nonStriker; inn2.currentBowler = bowler;
    inn2.order = [striker, nonStriker];
    m2.innings.push(inn2);
    m2.currentInningsIdx = 1;
    m2.status = "live";
    onContinue(m2);
  }

  return (
    <div className="tb-fadein">
      <BackBar title="Innings Break" />
      <div style={{ padding: 20 }}>
        <Panel style={{ padding: 16, marginBottom: 20, textAlign: "center" }}>
          <div style={{ color: C.inkFaint, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>{inn1.battingTeam} Scored</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 52, color: C.ink }}>{inn1.score}/{inn1.wkts}</div>
          <div style={{ color: C.inkDim, fontSize: 13 }}>in {oversStr(inn1.legalBalls)} overs</div>
          <div style={{ marginTop: 10, color: C.tape, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 16 }}>
            {bowlingTeam} Target: {target} runs in {match.oversLimit} overs
          </div>
        </Panel>

        <Panel style={{ padding: 14, marginBottom: 16 }}>
          <Label>2nd Innings Openers ({battingTeam})</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            <div>
              <Label>Striker</Label>
              <TextInput value={striker} onChange={(e) => setStriker(e.target.value)} style={{ marginTop: 4 }} />
            </div>
            <div>
              <Label>Non-Striker</Label>
              <TextInput value={nonStriker} onChange={(e) => setNonStriker(e.target.value)} style={{ marginTop: 4 }} />
            </div>
          </div>
        </Panel>

        <Panel style={{ padding: 14, marginBottom: 20 }}>
          <Label>Opening Bowler ({bowlingTeam})</Label>
          <TextInput value={bowler} onChange={(e) => setBowler(e.target.value)} style={{ marginTop: 6 }} />
        </Panel>

        <BigButton onClick={start} disabled={!striker || !nonStriker || striker === nonStriker || !bowler} bg={C.win} color="#0A1F0B" style={{ width: "100%", padding: 16, fontFamily: FONT_DISPLAY, fontSize: 20 }}>
          Start 2nd Innings ▶
        </BigButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   MATCH DONE SCREEN
--------------------------------------------------------- */
function MatchDone({ match, onHome }) {
  const inn1 = match.innings[0], inn2 = match.innings[1];
  return (
    <div className="tb-fadein">
      <BackBar title="Match Finished" />
      <div style={{ padding: 20 }}>
        <Panel style={{ padding: 20, textAlign: "center", marginBottom: 16, borderColor: C.tape }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.inkFaint, letterSpacing: 2, textTransform: "uppercase" }}>Match Result</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: C.tape, marginTop: 4 }}>{match.result}</div>
        </Panel>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <Panel style={{ padding: 14, flex: 1 }}>
            <div style={{ color: C.inkFaint, fontSize: 11 }}>{inn1.battingTeam}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26 }}>{inn1.score}/{inn1.wkts}</div>
            <div style={{ color: C.inkFaint, fontSize: 11 }}>({oversStr(inn1.legalBalls)} ov)</div>
          </Panel>
          {inn2 && (
            <Panel style={{ padding: 14, flex: 1 }}>
              <div style={{ color: C.inkFaint, fontSize: 11 }}>{inn2.battingTeam}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26 }}>{inn2.score}/{inn2.wkts}</div>
              <div style={{ color: C.inkFaint, fontSize: 11 }}>({oversStr(inn2.legalBalls)} ov)</div>
            </Panel>
          )}
        </div>
        <Scorecard inn={inn1} />
        {inn2 && <Scorecard inn={inn2} />}
        <div style={{ marginTop: 12 }}>
          <BigButton onClick={onHome} bg={C.tape} color="#1A1305" style={{ width: "100%", padding: 16, fontFamily: FONT_DISPLAY, fontSize: 20 }}>
            Back to NSL Dashboard
          </BigButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   MATCH SCORECARD VIEWER (INDIVIDUAL MATCH STATS)
--------------------------------------------------------- */
function MatchScorecardViewer({ match, onBack }) {
  const inn1 = match.innings ? match.innings[0] : null;
  const inn2 = match.innings ? match.innings[1] : null;

  return (
    <div className="tb-fadein">
      <BackBar title={`${match.teamA} vs ${match.teamB}`} onBack={onBack} />
      <div style={{ padding: 16 }}>
        <Panel style={{ padding: 16, textAlign: "center", marginBottom: 14, borderColor: C.tape }}>
          <div style={{ fontSize: 11, color: C.inkFaint, textTransform: "uppercase", letterSpacing: 1 }}>Match Result</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.tape, marginTop: 4 }}>{match.result}</div>
          <div style={{ display: "flex", justifyContent: "space-around", marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: C.inkDim }}>{match.teamA}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700 }}>{match.scoreA}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.inkDim }}>{match.teamB}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700 }}>{match.scoreB}</div>
            </div>
          </div>
        </Panel>

        {inn1 && <Scorecard inn={inn1} />}
        {inn2 && <Scorecard inn={inn2} />}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   WATCH SCREEN (REAL-TIME READ ONLY VIEWER)
--------------------------------------------------------- */
function Watch({ onBack }) {
  const [code, setCode] = useState("");
  const [joined, setJoined] = useState(false);

  const matchData = useStorageSync(joined ? `tapeball:match:${code}` : null, null, joined ? `/api/match/${code}` : null)[0];

  if (!joined) {
    return (
      <div className="tb-fadein">
        <BackBar title="Watch Live Match" onBack={onBack} />
        <div style={{ padding: 20 }}>
          <Label>Enter 4-Digit Match Code</Label>
          <TextInput value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="0000" inputMode="numeric"
            style={{ marginTop: 8, fontFamily: FONT_MONO, fontSize: 28, letterSpacing: 6, textAlign: "center" }} />
          <BigButton onClick={() => setJoined(true)} disabled={code.length !== 4} bg={C.tape} color="#1A1305" style={{ width: "100%", padding: 14, marginTop: 16, fontFamily: FONT_DISPLAY, fontSize: 18 }}>
            Connect to Live Feed ▶
          </BigButton>
        </div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="tb-fadein">
        <BackBar title={`Match ${code}`} onBack={() => setJoined(false)} />
        <div style={{ padding: 20, color: C.inkDim }}>Connecting to live match feed for code {code}…</div>
      </div>
    );
  }

  const inn = matchData.innings ? matchData.innings[matchData.currentInningsIdx] : null;

  return (
    <div className="tb-fadein">
      <BackBar title={`${matchData.teamA} vs ${matchData.teamB}`} onBack={() => setJoined(false)}
        right={<span className="tb-pulse" style={{ fontSize: 12, color: C.win, fontFamily: FONT_BODY, fontWeight: 800 }}>● LIVE</span>}
      />
      <ScoreHeader inn={inn} teamA={matchData.teamA} teamB={matchData.teamB} match={matchData} />
      {inn && (
        <div style={{ padding: "0 16px" }}>
          <Panel style={{ padding: 14, marginBottom: 12 }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 14 }}>
              <div style={{ color: C.tape }}>● {inn.batsmen?.[inn.striker]?.name || "—"} {inn.batsmen?.[inn.striker] ? `${inn.batsmen[inn.striker].runs}(${inn.batsmen[inn.striker].balls})` : ""}</div>
              <div style={{ color: C.inkDim }}>&nbsp;&nbsp;{inn.batsmen?.[inn.nonStriker]?.name || "—"} {inn.batsmen?.[inn.nonStriker] ? `${inn.batsmen[inn.nonStriker].runs}(${inn.batsmen[inn.nonStriker].balls})` : ""}</div>
              {inn.currentBowler && inn.bowlers?.[inn.currentBowler] && (
                <div style={{ color: C.inkDim, marginTop: 6 }}>Bowling: {inn.bowlers[inn.currentBowler].name} — {inn.bowlers[inn.currentBowler].wkts}/{inn.bowlers[inn.currentBowler].runs}</div>
              )}
            </div>
          </Panel>
          <Label>This Over</Label>
          <div style={{ marginTop: 8, marginBottom: 16 }}><OverDots balls={inn.currentOverBalls || []} /></div>
          <Scorecard inn={inn} />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   MOUNT APP TO DOM
--------------------------------------------------------- */
const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);
root.render(<App />);
