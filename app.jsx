const { useState, useEffect, useRef, useCallback } = React;

/* ---------------------------------------------------------
   COLOR PALETTE & CONSTANTS
--------------------------------------------------------- */
const C = {
  bg: "#0D1712",
  bg2: "#0A130F",
  panel: "#15241C",
  panel2: "#1B2E23",
  panelBorder: "#2A3E30",
  tape: "#F2A93B",       // Tape-ball amber
  tape2: "#F2661D",      // Tape-ball orange
  wicket: "#D14B41",
  free: "#4FA8D6",
  ink: "#F4F1E6",
  inkDim: "#9AAD9F",
  inkFaint: "#5E7267",
  win: "#6FBF73",
};

const FONT_DISPLAY = "'Teko', sans-serif";
const FONT_BODY = "'Manrope', sans-serif";
const FONT_MONO = "'Space Mono', monospace";

/* ---------------------------------------------------------
   LOCAL STORAGE & VPS BACKEND HYBRID ENGINE
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

function useStorageSync(key, apiPath = null) {
  const [data, setData] = useState(() => loadLocal(key));

  const syncData = useCallback(async () => {
    const local = loadLocal(key);
    setData(local);
    if (apiPath) {
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
    if (apiPath) {
      await apiFetch(apiPath, 'POST', val);
    }
  }, [key, apiPath]);

  return [data, update];
}

/* ---------------------------------------------------------
   HELPERS
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

function newInnings(battingTeam, bowlingTeam, battingPlayers = [], bowlingPlayers = [], oversLimit, target = null) {
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

function Chip({ children, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className="tb-btn"
      style={{
        padding: "6px 12px", borderRadius: 999, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700,
        border: `1px solid ${active ? C.tape : C.panelBorder}`,
        background: active ? "rgba(242,169,59,0.15)" : "transparent",
        color: active ? C.tape : C.inkDim, cursor: "pointer",
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

function ScoreHeader({ inn, code }) {
  if (!inn) return null;
  return (
    <div style={{ padding: "18px 16px 10px", background: `linear-gradient(180deg, ${C.bg2}, ${C.bg})` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
            {inn.battingTeam} batting
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 64, lineHeight: 1, color: C.ink, fontWeight: 600 }}>
              {inn.score}<span style={{ color: C.wicket }}>/{inn.wkts}</span>
            </span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 16, color: C.inkDim }}>
              ({oversStr(inn.legalBalls)} ov)
            </span>
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.inkFaint, marginTop: 2 }}>
            CRR {economy(inn.score, inn.legalBalls)}
            {inn.target ? `  ·  need ${Math.max(inn.target - inn.score, 0)} off ${Math.max(inn.oversLimit * 6 - inn.legalBalls, 0)} balls` : ""}
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
  const [screen, setScreen] = useState("home"); // home | setup | live | break | done | watch
  const [match, setMatch] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [completedMatches, setCompletedMatches] = useStorageSync("tapeball:completed_matches", "/api/completed-matches");

  useEffect(() => {
    if (!match || !match.code) return;
    saveLocal(`tapeball:match:${match.code}`, match);
    apiFetch(`/api/match/${match.code}`, 'POST', match);
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

  const handleRecordMatchComplete = (m) => {
    const list = completedMatches || [];
    const inn1 = m.innings[0], inn2 = m.innings[1];
    const rec = {
      id: m.code + "-" + Date.now(),
      teamA: m.teamA, teamB: m.teamB,
      scoreA: `${inn1.score}/${inn1.wkts} (${oversStr(inn1.legalBalls)})`,
      scoreB: inn2 ? `${inn2.score}/${inn2.wkts} (${oversStr(inn2.legalBalls)})` : "DNB",
      result: m.result,
      winner: m.winner,
      date: new Date().toISOString(),
      innings: m.innings,
    };
    setCompletedMatches([...list.filter((x) => x.id !== rec.id), rec]);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: FONT_BODY, paddingBottom: 30 }}>
      {screen === "home" && (
        <Home
          onNew={() => setScreen("setup")}
          onWatch={() => setScreen("watch")}
        />
      )}
      {screen === "setup" && (
        <Setup
          onCancel={() => setScreen("home")}
          onStart={(m) => {
            setMatch(m);
            setUndoStack([]);
            setScreen("live");
          }}
        />
      )}
      {screen === "live" && match && (
        <Live
          match={match}
          setMatch={(m) => { snapshot(match); setMatch(m); }}
          onUndo={undo}
          canUndo={undoStack.length > 0}
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
          onNew={() => { setMatch(null); setScreen("setup"); }}
        />
      )}
      {screen === "watch" && <Watch onBack={() => setScreen("home")} />}
    </div>
  );
}

/* ---------------------------------------------------------
   HOME SCREEN
--------------------------------------------------------- */
function Home({ onNew, onWatch }) {
  const [history] = useStorageSync("tapeball:completed_matches", "/api/completed-matches");
  return (
    <div className="tb-fadein" style={{ padding: 20 }}>
      <div style={{ marginTop: 14, marginBottom: 32 }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, letterSpacing: 3, color: C.tape, fontWeight: 800, textTransform: "uppercase" }}>Tapeball Ground Scorer</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 56, fontWeight: 600, lineHeight: 0.92, color: C.ink }}>PRO GROUND<br />SCORECARD</div>
        <div style={{ color: C.inkDim, fontSize: 14, marginTop: 8 }}>One-tap scoring, batsman swap, over history & retired batsman support.</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <BigButton onClick={onNew} bg={C.tape} color="#1A1305" style={{ padding: "20px", fontSize: 22, fontFamily: FONT_DISPLAY, letterSpacing: 0.5 }}>
          ▶ Start New Match
        </BigButton>
        <BigButton onClick={onWatch} style={{ padding: "16px 20px", fontSize: 17, fontFamily: FONT_DISPLAY, letterSpacing: 0.5 }}>
          📡 Watch Live Match (Code Sync)
        </BigButton>
      </div>

      {history && history.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <Label>Recent Match Results</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {history.slice().reverse().slice(0, 5).map((m) => (
              <Panel key={m.id} style={{ padding: 12 }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700 }}>{m.teamA} vs {m.teamB}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.inkDim, marginTop: 2 }}>{m.scoreA} · {m.scoreB}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.tape, marginTop: 4 }}>{m.result}</div>
              </Panel>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   SIMPLE MATCH SETUP WIZARD
--------------------------------------------------------- */
function Setup({ onCancel, onStart }) {
  const [teamA, setTeamA] = useState("Team A");
  const [teamB, setTeamB] = useState("Team B");
  const [overs, setOvers] = useState("8");
  const [striker, setStriker] = useState("Striker 1");
  const [nonStriker, setNonStriker] = useState("Striker 2");
  const [bowler, setBowler] = useState("Bowler 1");

  function start() {
    const code = genCode();
    const inn1 = newInnings(teamA, teamB, [striker, nonStriker], [bowler], Number(overs), null);
    inn1.batsmen[striker] = emptyBatsman(striker);
    inn1.batsmen[nonStriker] = emptyBatsman(nonStriker);
    inn1.bowlers[bowler] = emptyBowler(bowler);
    inn1.striker = striker;
    inn1.nonStriker = nonStriker;
    inn1.currentBowler = bowler;
    inn1.order = [striker, nonStriker];

    const m = {
      code, teamA, teamB,
      oversLimit: Number(overs),
      innings: [inn1],
      currentInningsIdx: 0,
      status: "live",
      result: "", winner: "",
      createdAt: Date.now(),
    };
    onStart(m);
  }

  return (
    <div className="tb-fadein">
      <BackBar title="Match Setup" onBack={onCancel} />
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <Label>Team A Name</Label>
            <TextInput value={teamA} onChange={(e) => setTeamA(e.target.value)} style={{ marginTop: 6 }} />
          </div>
          <div>
            <Label>Team B Name</Label>
            <TextInput value={teamB} onChange={(e) => setTeamB(e.target.value)} style={{ marginTop: 6 }} />
          </div>
        </div>

        <div>
          <Label>Overs Limit</Label>
          <TextInput type="number" value={overs} onChange={(e) => setOvers(e.target.value)} style={{ marginTop: 6 }} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[4, 6, 8, 10, 12, 15, 20].map((n) => (
              <Chip key={n} active={overs === String(n)} onClick={() => setOvers(String(n))}>{n} ov</Chip>
            ))}
          </div>
        </div>

        <Panel style={{ padding: 14 }}>
          <Label>Opening Batsmen ({teamA})</Label>
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

        <Panel style={{ padding: 14 }}>
          <Label>Opening Bowler ({teamB})</Label>
          <TextInput value={bowler} onChange={(e) => setBowler(e.target.value)} style={{ marginTop: 6 }} />
        </Panel>

        <BigButton onClick={start} disabled={!teamA || !teamB || !striker || !nonStriker || !bowler} bg={C.win} color="#0A1F0B" style={{ padding: 16, width: "100%", fontFamily: FONT_DISPLAY, fontSize: 22 }}>
          Start Match ▶
        </BigButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   LIVE SCORER (SWAP BATSMAN, OVER HISTORY, RETIRED BATSMAN)
--------------------------------------------------------- */
function Live({ match, setMatch, onUndo, canUndo, onInningsBreak, onMatchDone, onExit }) {
  const inn = match.innings[match.currentInningsIdx];
  const [wicketOpen, setWicketOpen] = useState(false);
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

  function applyExtra(kind) {
    const m2 = structuredClone(match);
    const inn2 = m2.innings[m2.currentInningsIdx];
    const bowl = inn2.bowlers[inn2.currentBowler];

    if (kind === "wd") {
      inn2.extras.wd += 1;
      inn2.score += 1;
      if (bowl) bowl.runs += 1;
      inn2.curOverRuns += 1;
      inn2.currentOverBalls.push({ type: "wide", label: "wd" });
    } else if (kind === "nb") {
      inn2.extras.nb += 1;
      inn2.score += 1;
      if (bowl) bowl.runs += 1;
      inn2.curOverRuns += 1;
      inn2.currentOverBalls.push({ type: "noball", label: "nb" });
      inn2.freeHit = true;
    }

    const { m2: m3, ended, toBreak } = checkInningsEnd(m2, inn2);
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
  const unbattedPlayers = inn.battingPlayers.filter((p) => !inn.order.includes(p));

  return (
    <div className="tb-fadein">
      <BackBar title={`${match.teamA} vs ${match.teamB}`} onBack={onExit}
        right={
          <button onClick={onUndo} disabled={!canUndo} className="tb-btn" style={{ background: "none", border: `1px solid ${C.panelBorder}`, color: canUndo ? C.ink : C.inkFaint, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: FONT_BODY, fontWeight: 700 }}>
            ↺ Undo
          </button>
        }
      />
      <ScoreHeader inn={inn} code={match.code} />

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
            <BigButton onClick={() => applyExtra("wd")} disabled={!inn.currentBowler} style={{ padding: "14px 0", fontFamily: FONT_DISPLAY, fontSize: 20 }}>WD (+1 Extra)</BigButton>
            <BigButton onClick={() => applyExtra("nb")} disabled={!inn.currentBowler} style={{ padding: "14px 0", fontFamily: FONT_DISPLAY, fontSize: 20 }}>NB (+1 Free Hit)</BigButton>
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
          onClose={() => setNewBatModal(null)}
        />
      )}

      {bowlerModal && (
        <BowlerModal
          existingBowlers={inn.bowlingPlayers.filter(p => p !== inn.prevBowler)}
          onPick={pickBowler}
        />
      )}
    </div>
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

/* WICKET MODAL WITH RETIRED BATSMAN OPTION */
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

/* DYNAMIC NEW BATSMAN MODAL WITH RETIRED BATSMEN RECALL */
function NewBatsmanModal({ retiredBatsmen = [], unbattedPlayers = [], onConfirm, onClose }) {
  const [customName, setCustomName] = useState("");

  function handleAddCustom() {
    if (customName.trim()) {
      onConfirm(customName.trim());
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
            <Label>Select Unbatted Player</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {unbattedPlayers.map((p) => (
                <BigButton key={p} onClick={() => onConfirm(p)} bg={C.panel2} style={{ padding: 12, textAlign: "left", fontSize: 15 }}>{p}</BigButton>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label>Type New Batsman Name (One-by-One)</Label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <TextInput value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Ali" />
            <BigButton onClick={handleAddCustom} disabled={!customName.trim()} bg={C.tape} color="#1A1305" style={{ padding: "0 16px", whiteSpace: "nowrap" }}>
              + Add
            </BigButton>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

/* DYNAMIC NEW BOWLER MODAL (ADD ONE-BY-ONE) */
function BowlerModal({ existingBowlers = [], onPick }) {
  const [customName, setCustomName] = useState("");

  function handleAddCustom() {
    if (customName.trim()) {
      onPick(customName.trim());
    }
  }

  return (
    <ModalShell title="Over Complete — Next Bowler" onClose={null}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {existingBowlers.length > 0 && (
          <div>
            <Label>Select Existing Bowler</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {existingBowlers.map((p) => (
                <BigButton key={p} onClick={() => onPick(p)} bg={C.panel2} style={{ padding: 12, textAlign: "left", fontSize: 15 }}>{p}</BigButton>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label>Type New Bowler Name (One-by-One)</Label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <TextInput value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Arbaz" />
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,19,15,0.85)", display: "flex", alignItems: "flex-end", zIndex: 50 }}>
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
  const [striker, setStriker] = useState("");
  const [nonStriker, setNonStriker] = useState("");
  const [bowler, setBowler] = useState("");

  const battingTeam = inn1.bowlingTeam;
  const bowlingTeam = inn1.battingTeam;
  const target = inn1.score + 1;

  function start() {
    const m2 = structuredClone(match);
    const inn2 = newInnings(battingTeam, bowlingTeam, [striker, nonStriker], [bowler], match.oversLimit, target);
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
              <TextInput value={striker} onChange={(e) => setStriker(e.target.value)} placeholder="e.g. Player 1" style={{ marginTop: 4 }} />
            </div>
            <div>
              <Label>Non-Striker</Label>
              <TextInput value={nonStriker} onChange={(e) => setNonStriker(e.target.value)} placeholder="e.g. Player 2" style={{ marginTop: 4 }} />
            </div>
          </div>
        </Panel>

        <Panel style={{ padding: 14, marginBottom: 20 }}>
          <Label>Opening Bowler ({bowlingTeam})</Label>
          <TextInput value={bowler} onChange={(e) => setBowler(e.target.value)} placeholder="e.g. Bowler 1" style={{ marginTop: 6 }} />
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
function MatchDone({ match, onHome, onNew }) {
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
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <BigButton onClick={onHome} style={{ flex: 1, padding: 14 }}>Home</BigButton>
          <BigButton onClick={onNew} bg={C.tape} color="#1A1305" style={{ flex: 1, padding: 14, fontWeight: 800 }}>New Match</BigButton>
        </div>
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

  const matchData = useStorageSync(joined ? `tapeball:match:${code}` : null, joined ? `/api/match/${code}` : null)[0];

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
      <ScoreHeader inn={inn} teamA={matchData.teamA} teamB={matchData.teamB} />
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
