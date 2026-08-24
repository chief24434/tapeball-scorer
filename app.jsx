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
  if (!vpsUrl) return null;
  const baseUrl = vpsUrl.replace(/\/$/, "");
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
    const vpsUrl = loadLocal("tapeball:vps_url");
    if (vpsUrl && apiPath) {
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
    const interval = setInterval(syncData, 3000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [syncData]);

  const update = useCallback(async (val) => {
    saveLocal(key, val);
    setData(val);
    const vpsUrl = loadLocal("tapeball:vps_url");
    if (vpsUrl && apiPath) {
      await apiFetch(apiPath, 'POST', val);
    }
  }, [key, apiPath]);

  return [data, update];
}

/* ---------------------------------------------------------
   STATISTICAL HELPERS
--------------------------------------------------------- */
function genCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function oversStr(legalBalls, limit) {
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

function newInnings(battingTeam, bowlingTeam, battingPlayers, bowlingPlayers, oversLimit, target) {
  return {
    battingTeam, bowlingTeam, battingPlayers, bowlingPlayers, oversLimit,
    target: target || null,
    batsmen: {}, bowlers: {},
    order: [],
    striker: null, nonStriker: null, currentBowler: null, prevBowler: null,
    score: 0, wkts: 0, legalBalls: 0,
    curOverRuns: 0, curOverWkts: 0,
    currentOverBalls: [],
    extras: { wd: 0, nb: 0, b: 0, lb: 0 },
    freeHit: false,
    isComplete: false,
    resultNote: "",
  };
}

/* ---------------------------------------------------------
   REUSABLE ATOMIC UI COMPONENTS
--------------------------------------------------------- */
function Panel({ children, style, className = "" }) {
  return (
    <div
      className={className}
      style={{ background: C.panel, border: `1px solid ${C.panelBorder}`, borderRadius: 14, ...style }}
    >
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

function BackBar({ title, onBack, right, onVpsClick, vpsConfigured }) {
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
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {onVpsClick && (
          <button onClick={onVpsClick} className="tb-btn" style={{ background: vpsConfigured ? "rgba(111,191,115,0.15)" : C.panel2, border: `1px solid ${vpsConfigured ? C.win : C.panelBorder}`, color: vpsConfigured ? C.win : C.inkFaint, padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            {vpsConfigured ? "🟢 VPS Active" : "⚙️ VPS Sync"}
          </button>
        )}
        {right}
      </div>
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
              ({oversStr(inn.legalBalls, inn.oversLimit)} ov)
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
  const [screen, setScreen] = useState("home"); // home | setup | live | break | done | watch | tournament | tournament_setup
  const [match, setMatch] = useState(null);
  const [tournamentId, setTournamentId] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [vpsModalOpen, setVpsModalOpen] = useState(false);
  const [vpsUrl, setVpsUrlState] = useState(() => loadLocal("tapeball:vps_url") || "");

  const [completedMatches, setCompletedMatches] = useStorageSync("tapeball:completed_matches", "/api/completed-matches");
  const [tournamentTeams, setTournamentTeams] = useStorageSync("tapeball:teams", "/api/teams");
  const [tournaments, setTournaments] = useStorageSync("tapeball:tournaments", "/api/tournaments");

  // Multi-device sync for active live match
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
      tournamentId: m.tournamentId || null,
      matchNum: m.matchNum || null,
      teamA: m.teamA, teamB: m.teamB,
      scoreA: `${inn1.score}/${inn1.wkts} (${oversStr(inn1.legalBalls, inn1.oversLimit)})`,
      scoreB: inn2 ? `${inn2.score}/${inn2.wkts} (${oversStr(inn2.legalBalls, inn2.oversLimit)})` : "DNB",
      runsA: inn1.score, wktsA: inn1.wkts, ballsA: inn1.legalBalls,
      runsB: inn2 ? inn2.score : 0, wktsB: inn2 ? inn2.wkts : 0, ballsB: inn2 ? inn2.legalBalls : 0,
      oversLimit: m.oversLimit,
      result: m.result,
      winner: m.winner,
      date: new Date().toISOString(),
      innings: m.innings,
    };

    const nextList = [...list.filter((x) => x.id !== rec.id), rec];
    setCompletedMatches(nextList);

    // If part of tournament, update tournament match state
    if (m.tournamentId && tournaments) {
      const tour = tournaments[m.tournamentId];
      if (tour) {
        const matchObj = tour.matches.find((x) => x.id === m.tournamentMatchId);
        if (matchObj) {
          matchObj.status = "done";
          matchObj.result = m.result;
          matchObj.winner = m.winner;
          matchObj.innings = m.innings;
          setTournaments({ ...tournaments, [m.tournamentId]: tour });
        }
      }
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: FONT_BODY, paddingBottom: 30 }}>
      {screen === "home" && (
        <Home
          onNew={() => setScreen("setup")}
          onWatch={() => setScreen("watch")}
          onTournament={() => setScreen("tournament")}
          vpsConfigured={!!loadLocal("tapeball:vps_url")}
          onVpsClick={() => setVpsModalOpen(true)}
        />
      )}
      {screen === "setup" && (
        <Setup
          tournamentTeams={tournamentTeams || []}
          onCancel={() => setScreen("home")}
          onStart={async (m) => {
            const currentTeams = tournamentTeams || [];
            const newTeams = Array.from(new Set([...currentTeams, m.teamA, m.teamB]));
            setTournamentTeams(newTeams);
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
          onMatchDone={async (m) => {
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
          onHome={() => { setMatch(null); setScreen(match.tournamentId ? "tournament" : "home"); }}
          onNew={() => { setMatch(null); setScreen("setup"); }}
        />
      )}
      {screen === "watch" && <Watch onBack={() => setScreen("home")} />}
      {screen === "tournament" && (
        <TournamentManager
          tournaments={tournaments}
          setTournaments={setTournaments}
          onBack={() => setScreen("home")}
          onLaunchMatch={(m) => {
            setMatch(m);
            setUndoStack([]);
            setScreen("live");
          }}
          onNewTournament={() => setScreen("tournament_setup")}
        />
      )}
      {screen === "tournament_setup" && (
        <TournamentSetup
          tournaments={tournaments}
          setTournaments={setTournaments}
          onCancel={() => setScreen("tournament")}
          onCreated={(tourId) => {
            setTournamentId(tourId);
            setScreen("tournament");
          }}
        />
      )}

      {vpsModalOpen && (
        <VpsConfigModal
          currentUrl={vpsUrl}
          onClose={() => setVpsModalOpen(false)}
          onSave={(url) => {
            saveLocal("tapeball:vps_url", url);
            setVpsUrlState(url);
            setVpsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   HOME SCREEN
--------------------------------------------------------- */
function Home({ onNew, onWatch, onTournament, vpsConfigured, onVpsClick }) {
  return (
    <div className="tb-fadein" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, letterSpacing: 3, color: C.tape, fontWeight: 800, textTransform: "uppercase" }}>Tapeball Scorer Pro</div>
        <button onClick={onVpsClick} className="tb-btn" style={{ background: vpsConfigured ? "rgba(111,191,115,0.15)" : C.panel2, border: `1px solid ${vpsConfigured ? C.win : C.panelBorder}`, color: vpsConfigured ? C.win : C.inkFaint, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {vpsConfigured ? "🟢 VPS Sync Active" : "⚙️ Configure VPS Backend"}
        </button>
      </div>

      <div style={{ marginTop: 18, marginBottom: 32 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 54, fontWeight: 600, lineHeight: 0.92, color: C.ink }}>3-TEAM TOURNAMENT<br />& GROUND SCORER</div>
        <div style={{ color: C.inkDim, fontSize: 14, marginTop: 8 }}>Repo-Hosted Frontend + VPS Permanent Storage Engine.</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <BigButton onClick={onTournament} bg={C.tape} color="#1A1305" style={{ padding: "20px", fontSize: 20, fontFamily: FONT_DISPLAY, letterSpacing: 0.5 }}>
          🏆 3-Team Tournament System
        </BigButton>
        <BigButton onClick={onNew} bg={C.panel2} color={C.ink} style={{ padding: "16px 20px", fontSize: 17, fontFamily: FONT_DISPLAY, letterSpacing: 0.5 }}>
          ▶ Quick Match
        </BigButton>
        <BigButton onClick={onWatch} style={{ padding: "16px 20px", fontSize: 16, fontFamily: FONT_DISPLAY, letterSpacing: 0.5 }}>
          📡 Watch Live Match (Code Sync)
        </BigButton>
      </div>

      <div style={{ marginTop: 36, color: C.inkFaint, fontSize: 12, lineHeight: 1.6, padding: 14, background: C.bg2, borderRadius: 12, border: `1px solid ${C.panelBorder}` }}>
        ⚡ <strong>Architecture</strong>: Hosted on GitHub / Vercel with zero downtime. Connect your VPS backend URL (`http://YOUR_VPS_IP:5000`) so all players' phones sync live score data automatically!
      </div>
    </div>
  );
}

function VpsConfigModal({ currentUrl, onClose, onSave }) {
  const [url, setUrl] = useState(currentUrl);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  async function testAndSave() {
    if (!url.trim()) {
      onSave("");
      return;
    }
    setTesting(true);
    setStatusMsg("Testing connection to VPS...");
    const cleanUrl = url.trim().replace(/\/$/, "");
    try {
      const res = await fetch(`${cleanUrl}/api/health`);
      if (res.ok) {
        setStatusMsg("✅ Connected successfully to VPS Database!");
        setTimeout(() => onSave(cleanUrl), 800);
      } else {
        setStatusMsg("⚠️ Could not connect. Ensure vps_backend.py is running on port 5000.");
      }
    } catch (e) {
      setStatusMsg("❌ Connection failed. Check IP/Port & CORS.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <ModalShell title="VPS Storage API Settings" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <Label>VPS Server URL (e.g. http://123.45.67.89:5000)</Label>
          <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://YOUR_VPS_IP:5000" style={{ marginTop: 6 }} />
        </div>
        {statusMsg && <div style={{ fontSize: 13, color: statusMsg.startsWith("✅") ? C.win : C.wicket, fontWeight: 700 }}>{statusMsg}</div>}
        <BigButton onClick={testAndSave} disabled={testing} bg={C.win} color="#0A1F0B" style={{ padding: 14, fontFamily: FONT_DISPLAY, fontSize: 18 }}>
          Save & Sync with VPS
        </BigButton>
        <div style={{ color: C.inkFaint, fontSize: 12, lineHeight: 1.5 }}>
          Run <code>python vps_backend.py</code> on your VPS to start the SQLite API storage server.
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------------------------------------------------------
   SETUP WIZARD (FRIENDLY MATCH)
--------------------------------------------------------- */
function Setup({ tournamentTeams, onCancel, onStart }) {
  const [step, setStep] = useState(0);
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [playersAText, setPlayersAText] = useState("");
  const [playersBText, setPlayersBText] = useState("");
  const [tossWinner, setTossWinner] = useState("");
  const [tossDecision, setTossDecision] = useState("bat");
  const [overs, setOvers] = useState("8");
  const [strikerName, setStrikerName] = useState("");
  const [nonStrikerName, setNonStrikerName] = useState("");
  const [bowlerName, setBowlerName] = useState("");

  const playersA = playersAText.split(",").map((s) => s.trim()).filter(Boolean);
  const playersB = playersBText.split(",").map((s) => s.trim()).filter(Boolean);

  const steps = ["Teams", "Team A Players", "Team B Players", "Toss", "Overs", "Openers"];

  const battingFirstTeam = tossDecision === "bat" ? tossWinner : (tossWinner === teamA ? teamB : teamA);
  const bowlingFirstTeam = battingFirstTeam === teamA ? teamB : teamA;
  const battingFirstPlayers = battingFirstTeam === teamA ? playersA : playersB;
  const bowlingFirstPlayers = battingFirstTeam === teamA ? playersB : playersA;

  const canNext = [
    teamA.trim() && teamB.trim() && teamA.trim() !== teamB.trim(),
    playersA.length >= 2,
    playersB.length >= 2,
    tossWinner,
    overs && Number(overs) > 0,
    strikerName && nonStrikerName && strikerName !== nonStrikerName && bowlerName,
  ][step];

  function startMatch() {
    const code = genCode();
    const inn1 = newInnings(battingFirstTeam, bowlingFirstTeam, battingFirstPlayers, bowlingFirstPlayers, Number(overs), null);
    inn1.batsmen[strikerName] = emptyBatsman(strikerName);
    inn1.batsmen[nonStrikerName] = emptyBatsman(nonStrikerName);
    inn1.bowlers[bowlerName] = emptyBowler(bowlerName);
    inn1.striker = strikerName;
    inn1.nonStriker = nonStrikerName;
    inn1.currentBowler = bowlerName;
    inn1.order = [strikerName, nonStrikerName];

    const m = {
      code, teamA, teamB, playersA, playersB,
      oversLimit: Number(overs),
      tossWinner, tossDecision,
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
      <BackBar title="Quick Match Setup" onBack={onCancel} />
      <div style={{ padding: "8px 16px 4px", display: "flex", gap: 6 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? C.tape : C.panelBorder }} />
        ))}
      </div>
      <div style={{ padding: 20 }}>
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <Label>Team A</Label>
              <TextInput value={teamA} onChange={(e) => setTeamA(e.target.value)} placeholder="e.g. Saddam XI" style={{ marginTop: 6 }} />
              {tournamentTeams.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {tournamentTeams.map((t) => <Chip key={t} active={teamA === t} onClick={() => setTeamA(t)}>{t}</Chip>)}
                </div>
              )}
            </div>
            <div>
              <Label>Team B</Label>
              <TextInput value={teamB} onChange={(e) => setTeamB(e.target.value)} placeholder="e.g. Arbaz XI" style={{ marginTop: 6 }} />
              {tournamentTeams.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {tournamentTeams.filter((t) => t !== teamA).map((t) => <Chip key={t} active={teamB === t} onClick={() => setTeamB(t)}>{t}</Chip>)}
                </div>
              )}
            </div>
          </div>
        )}
        {step === 1 && (
          <div>
            <Label>{teamA} — Players (comma separated)</Label>
            <textarea value={playersAText} onChange={(e) => setPlayersAText(e.target.value)} rows={5} placeholder="Ali, Bilal, Hamza, Usman, Fahad, Zeeshan..."
              style={{ width: "100%", marginTop: 6, background: C.bg2, border: `1px solid ${C.panelBorder}`, borderRadius: 10, padding: 12, color: C.ink, fontFamily: FONT_BODY, fontSize: 15 }} />
            <div style={{ color: C.inkFaint, fontSize: 12, marginTop: 6 }}>{playersA.length} players entered · need at least 2</div>
          </div>
        )}
        {step === 2 && (
          <div>
            <Label>{teamB} — Players (comma separated)</Label>
            <textarea value={playersBText} onChange={(e) => setPlayersBText(e.target.value)} rows={5} placeholder="Ahmed, Danish, Kashif, Salman..."
              style={{ width: "100%", marginTop: 6, background: C.bg2, border: `1px solid ${C.panelBorder}`, borderRadius: 10, padding: 12, color: C.ink, fontFamily: FONT_BODY, fontSize: 15 }} />
            <div style={{ color: C.inkFaint, fontSize: 12, marginTop: 6 }}>{playersB.length} players entered · need at least 2</div>
          </div>
        )}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <Label>Toss Won By</Label>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Chip active={tossWinner === teamA} onClick={() => setTossWinner(teamA)}>{teamA}</Chip>
                <Chip active={tossWinner === teamB} onClick={() => setTossWinner(teamB)}>{teamB}</Chip>
              </div>
            </div>
            <div>
              <Label>Elected To</Label>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Chip active={tossDecision === "bat"} onClick={() => setTossDecision("bat")}>Bat First</Chip>
                <Chip active={tossDecision === "bowl"} onClick={() => setTossDecision("bowl")}>Bowl First</Chip>
              </div>
            </div>
          </div>
        )}
        {step === 4 && (
          <div>
            <Label>Overs Per Innings</Label>
            <TextInput type="number" inputMode="numeric" value={overs} onChange={(e) => setOvers(e.target.value)} style={{ marginTop: 6 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {[6, 8, 10, 12, 15, 20].map((n) => <Chip key={n} active={overs === String(n)} onClick={() => setOvers(String(n))}>{n}</Chip>)}
            </div>
          </div>
        )}
        {step === 5 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ color: C.inkDim, fontSize: 13 }}>{battingFirstTeam} bats first · {bowlingFirstTeam} bowls first</div>
            <div>
              <Label>Striker (on strike)</Label>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {battingFirstPlayers.map((p) => <Chip key={p} active={strikerName === p} onClick={() => setStrikerName(p)}>{p}</Chip>)}
              </div>
            </div>
            <div>
              <Label>Non-Striker</Label>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {battingFirstPlayers.filter((p) => p !== strikerName).map((p) => <Chip key={p} active={nonStrikerName === p} onClick={() => setNonStrikerName(p)}>{p}</Chip>)}
              </div>
            </div>
            <div>
              <Label>Opening Bowler</Label>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {bowlingFirstPlayers.map((p) => <Chip key={p} active={bowlerName === p} onClick={() => setBowlerName(p)}>{p}</Chip>)}
              </div>
            </div>
          </div>
        )}
      </div>
      <div style={{ position: "sticky", bottom: 0, padding: 16, background: C.bg, borderTop: `1px solid ${C.panelBorder}`, display: "flex", gap: 10 }}>
        {step > 0 && <BigButton onClick={() => setStep(step - 1)} style={{ padding: "14px 18px" }}>Back</BigButton>}
        {step < steps.length - 1 && (
          <BigButton onClick={() => setStep(step + 1)} disabled={!canNext} bg={C.tape} color="#1A1305" style={{ flex: 1, padding: "14px 18px", fontWeight: 800 }}>
            Continue
          </BigButton>
        )}
        {step === steps.length - 1 && (
          <BigButton onClick={startMatch} disabled={!canNext} bg={C.win} color="#0A1F0B" style={{ flex: 1, padding: "14px 18px", fontWeight: 800 }}>
            Start Match ▶
          </BigButton>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   LIVE SCORING ENGINE (FULLY FIXED & ROBUST)
--------------------------------------------------------- */
function Live({ match, setMatch, onUndo, canUndo, onInningsBreak, onMatchDone, onExit }) {
  const inn = match.innings[match.currentInningsIdx];
  const [extraMode, setExtraMode] = useState(null); // 'wd' | 'nb' | 'b' | 'lb'
  const [wicketOpen, setWicketOpen] = useState(false);
  const [bowlerModal, setBowlerModal] = useState(() => !inn.currentBowler);
  const [newBatModal, setNewBatModal] = useState(null); // dismissal details pending new batsman
  const [tab, setTab] = useState("score"); // score | card

  const availableNewBatsmen = inn.battingPlayers.filter((p) => !inn.order.includes(p));
  const availableBowlers = inn.bowlingPlayers.filter((p) => p !== inn.prevBowler);

  function checkInningsEnd(m2, inn2) {
    const maxWkts = inn2.battingPlayers.length - 1;
    const allOut = inn2.wkts >= maxWkts;
    const oversDone = inn2.legalBalls >= inn2.oversLimit * 6;
    const chased = inn2.target != null && inn2.score >= inn2.target;

    if (!allOut && !oversDone && !chased) return { m2, ended: false };

    inn2.isComplete = true;
    if (m2.currentInningsIdx === 0) {
      m2.status = "break";
      return { m2, ended: true, toBreak: true };
    } else {
      m2.status = "done";
      const inn1 = m2.innings[0];
      if (inn2.score >= inn2.target) {
        const wktsLeft = maxWkts - inn2.wkts;
        m2.winner = inn2.battingTeam;
        m2.result = `${inn2.battingTeam} won by ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"}`;
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

  function applyExtra(kind, extraRuns) {
    const m2 = structuredClone(match);
    const inn2 = m2.innings[m2.currentInningsIdx];
    const bowl = inn2.bowlers[inn2.currentBowler];

    if (kind === "wd") {
      const total = 1 + extraRuns;
      inn2.extras.wd += total;
      inn2.score += total;
      if (bowl) bowl.runs += total;
      inn2.curOverRuns += total;
      inn2.currentOverBalls.push({ type: "wide", label: extraRuns ? `wd+${extraRuns}` : "wd" });
      if (extraRuns % 2 === 1) { const t = inn2.striker; inn2.striker = inn2.nonStriker; inn2.nonStriker = t; }
    } else if (kind === "nb") {
      const bat = inn2.batsmen[inn2.striker];
      inn2.extras.nb += 1;
      inn2.score += 1 + extraRuns;
      if (bat) {
        bat.runs += extraRuns;
        bat.balls += 1;
        if (extraRuns === 4) bat.fours += 1;
        if (extraRuns === 6) bat.sixes += 1;
      }
      if (bowl) bowl.runs += 1 + extraRuns;
      inn2.curOverRuns += 1 + extraRuns;
      inn2.currentOverBalls.push({ type: "noball", label: `nb+${extraRuns}` });
      inn2.freeHit = true;
      if (extraRuns % 2 === 1) { const t = inn2.striker; inn2.striker = inn2.nonStriker; inn2.nonStriker = t; }
      setMatch(m2);
      setExtraMode(null);
      return;
    } else if (kind === "b" || kind === "lb") {
      const bat = inn2.batsmen[inn2.striker];
      inn2.extras[kind] += extraRuns;
      inn2.score += extraRuns;
      if (bat) bat.balls += 1;
      if (bowl) bowl.balls += 1;
      inn2.legalBalls += 1;
      inn2.curOverRuns += extraRuns;
      inn2.currentOverBalls.push({ type: kind, label: `${kind}${extraRuns}` });
      inn2.freeHit = false;
      if (extraRuns % 2 === 1) { const t = inn2.striker; inn2.striker = inn2.nonStriker; inn2.nonStriker = t; }
    }

    const { m2: m3, ended, toBreak } = checkInningsEnd(m2, inn2);
    setExtraMode(null);
    if (ended) {
      if (toBreak) { setMatch(m3); onInningsBreak(m3); return; }
      else { onMatchDone(m3); return; }
    }
    if ((kind === "b" || kind === "lb") && inn2.legalBalls % 6 === 0) {
      finishOver(m3, inn2);
      setMatch(m3);
      setBowlerModal(true);
      return;
    }
    setMatch(m3);
  }

  function applyWicket({ type, whoOut, runsCompleted, newBatsman, fielder }) {
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
      bat.fielder = fielder || "";
      if (type !== "run out") { bat.bowler = inn2.currentBowler; }
      bat.balls += type === "run out" ? 0 : 1;
    }

    if (type !== "run out" && bowl) {
      bowl.wkts += 1;
      bowl.balls += 1;
    } else if (bowl && type === "run out") {
      bowl.balls += 1;
    }

    inn2.legalBalls += 1;
    inn2.wkts += 1;
    inn2.curOverWkts += 1;
    inn2.currentOverBalls.push({ type: "wicket", label: "W" });
    inn2.freeHit = false;

    const maxWkts = inn2.battingPlayers.length - 1;
    const isAllOut = inn2.wkts >= maxWkts || !newBatsman;

    if (!isAllOut && newBatsman) {
      inn2.batsmen[newBatsman] = inn2.batsmen[newBatsman] || emptyBatsman(newBatsman);
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

    if (inn2.legalBalls % 6 === 0) {
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
    setMatch(m2);
    setBowlerModal(false);
  }

  const bat1 = inn.striker ? inn.batsmen[inn.striker] : null;
  const bat2 = inn.nonStriker ? inn.batsmen[inn.nonStriker] : null;
  const bowl = inn.currentBowler ? inn.bowlers[inn.currentBowler] : null;

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
        <Chip active={tab === "card"} onClick={() => setTab("card")}>Full Scorecard</Chip>
      </div>

      {tab === "score" && (
        <div style={{ padding: "0 16px" }}>
          <Panel style={{ padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT_MONO, fontSize: 14 }}>
              <div>
                <div style={{ color: C.tape }}>
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

          {extraMode && (
            <Panel style={{ padding: 12, marginBottom: 12, borderColor: C.tape }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontFamily: FONT_BODY, fontWeight: 800, color: C.tape, fontSize: 13, textTransform: "uppercase" }}>
                  {extraMode === "wd" ? "Wide — extra runs run?" : extraMode === "nb" ? "No ball — runs off the bat?" : extraMode === "b" ? "Bye — runs taken" : "Leg bye — runs taken"}
                </div>
                <button onClick={() => setExtraMode(null)} style={{ background: "none", border: "none", color: C.inkFaint, cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {(extraMode === "nb" ? [0, 1, 2, 3, 4, 6] : [0, 1, 2, 3, 4]).map((n) => (
                  <BigButton key={n} onClick={() => applyExtra(extraMode, n)} bg={C.panel2} style={{ padding: "12px 0", fontFamily: FONT_DISPLAY, fontSize: 22 }}>{n}</BigButton>
                ))}
              </div>
            </Panel>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 8 }}>
            {[0, 1, 2, 3, 4, 6].map((n) => (
              <BigButton key={n} onClick={() => applyNormal(n)} disabled={!!extraMode || !inn.currentBowler}
                bg={n === 4 ? "rgba(79,168,214,0.12)" : n === 6 ? C.tape2 : C.panel2}
                color={n === 6 ? "#fff" : C.ink}
                style={{ padding: "16px 0", fontFamily: FONT_DISPLAY, fontSize: 28 }}>
                {n}
              </BigButton>
            ))}
            <BigButton onClick={() => setWicketOpen(true)} disabled={!!extraMode || !inn.currentBowler} bg={C.wicket} color="#fff" style={{ padding: "16px 0", fontFamily: FONT_DISPLAY, fontSize: 22 }}>OUT</BigButton>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            <BigButton onClick={() => setExtraMode("wd")} disabled={!inn.currentBowler} style={{ padding: "12px 0", fontFamily: FONT_DISPLAY, fontSize: 18 }}>WD</BigButton>
            <BigButton onClick={() => setExtraMode("nb")} disabled={!inn.currentBowler} style={{ padding: "12px 0", fontFamily: FONT_DISPLAY, fontSize: 18 }}>NB</BigButton>
            <BigButton onClick={() => setExtraMode("b")} disabled={!inn.currentBowler} style={{ padding: "12px 0", fontFamily: FONT_DISPLAY, fontSize: 18 }}>BYE</BigButton>
            <BigButton onClick={() => setExtraMode("lb")} disabled={!inn.currentBowler} style={{ padding: "12px 0", fontFamily: FONT_DISPLAY, fontSize: 18 }}>LB</BigButton>
          </div>

          <div style={{ marginTop: 16, fontFamily: FONT_MONO, fontSize: 11, color: C.inkFaint }}>
            Extras — wd {inn.extras.wd} · nb {inn.extras.nb} · b {inn.extras.b} · lb {inn.extras.lb}
          </div>
        </div>
      )}

      {tab === "card" && <Scorecard inn={inn} />}

      {wicketOpen && (
        <WicketModal
          isFreeHit={inn.freeHit}
          striker={inn.striker} nonStriker={inn.nonStriker}
          fielders={inn.bowlingPlayers}
          onClose={() => setWicketOpen(false)}
          onConfirm={(dismissalData) => {
            const maxWkts = inn.battingPlayers.length - 1;
            const willBeAllOut = inn.wkts + 1 >= maxWkts || availableNewBatsmen.length === 0;
            if (willBeAllOut) {
              applyWicket({ ...dismissalData, newBatsman: null });
            } else {
              setNewBatModal(dismissalData);
            }
          }}
        />
      )}

      {newBatModal && (
        <NewBatsmanModal
          available={availableNewBatsmen}
          onConfirm={(name) => applyWicket({ ...newBatModal, newBatsman: name })}
          onClose={() => setNewBatModal(null)}
        />
      )}

      {bowlerModal && (
        <BowlerModal available={availableBowlers} onPick={pickBowler} />
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
                    <div style={{ color: C.inkFaint, fontSize: 10 }}>{b.out ? `${b.how}${b.fielder ? ` (${b.fielder})` : ""}` : "not out"}</div>
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

function WicketModal({ isFreeHit, striker, nonStriker, fielders = [], onClose, onConfirm }) {
  const [type, setType] = useState(isFreeHit ? "run out" : "bowled");
  const [whoOut, setWhoOut] = useState("striker");
  const [runsCompleted, setRunsCompleted] = useState(0);
  const [fielder, setFielder] = useState("");

  const types = isFreeHit ? ["run out"] : ["bowled", "caught", "lbw", "run out", "stumped", "hit wicket", "retired"];
  const needsFielder = type === "caught" || type === "run out" || type === "stumped";

  return (
    <ModalShell title={isFreeHit ? "Wicket (Free Hit)" : "How out?"} onClose={onClose}>
      {isFreeHit && (
        <div style={{ color: C.free, fontSize: 12, marginBottom: 10, fontWeight: 700 }}>
          ⚡ Free Hit active: Only Run Out is allowed!
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {types.map((t) => <Chip key={t} active={type === t} onClick={() => setType(t)}>{t}</Chip>)}
      </div>
      {type === "run out" && (
        <div style={{ marginBottom: 16 }}>
          <Label>Who's Out</Label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Chip active={whoOut === "striker"} onClick={() => setWhoOut("striker")}>{striker || "Striker"}</Chip>
            <Chip active={whoOut === "nonStriker"} onClick={() => setWhoOut("nonStriker")}>{nonStriker || "Non-Striker"}</Chip>
          </div>
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <Label>Runs Completed Before Dismissal</Label>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {[0, 1, 2, 3].map((n) => <Chip key={n} active={runsCompleted === n} onClick={() => setRunsCompleted(n)}>{n}</Chip>)}
        </div>
      </div>
      {needsFielder && (
        <div style={{ marginBottom: 16 }}>
          <Label>{type === "stumped" ? "Wicketkeeper" : "Fielder"} (optional)</Label>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {fielders.map((f) => <Chip key={f} active={fielder === f} onClick={() => setFielder(f)}>{f}</Chip>)}
          </div>
        </div>
      )}
      <BigButton onClick={() => onConfirm({ type, whoOut: type === "run out" ? whoOut : "striker", runsCompleted, fielder })} bg={C.wicket} color="#fff" style={{ width: "100%", padding: 14, fontFamily: FONT_DISPLAY, fontSize: 18 }}>
        Confirm Wicket
      </BigButton>
    </ModalShell>
  );
}

function NewBatsmanModal({ available = [], onConfirm, onClose }) {
  return (
    <ModalShell title="Select Next Batsman" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {available.map((p) => (
          <BigButton key={p} onClick={() => onConfirm(p)} bg={C.panel2} style={{ padding: 14, textAlign: "left", fontSize: 15 }}>{p}</BigButton>
        ))}
      </div>
    </ModalShell>
  );
}

function BowlerModal({ available = [], onPick }) {
  return (
    <ModalShell title="Over Complete — Select Next Bowler" onClose={null}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {available.map((p) => (
          <BigButton key={p} onClick={() => onPick(p)} bg={C.panel2} style={{ padding: 14, textAlign: "left", fontSize: 15 }}>{p}</BigButton>
        ))}
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
  const battingPlayers = battingTeam === match.teamA ? match.playersA : match.playersB;
  const bowlingPlayers = bowlingTeam === match.teamA ? match.playersA : match.playersB;
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
          <div style={{ color: C.inkDim, fontSize: 13 }}>in {oversStr(inn1.legalBalls, inn1.oversLimit)} overs</div>
          <div style={{ marginTop: 10, color: C.tape, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 16 }}>
            {bowlingTeam} Target: {target} runs in {match.oversLimit} overs
          </div>
        </Panel>

        <Label>Striker</Label>
        <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {battingPlayers.map((p) => <Chip key={p} active={striker === p} onClick={() => setStriker(p)}>{p}</Chip>)}
        </div>
        <Label>Non-striker</Label>
        <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {battingPlayers.filter((p) => p !== striker).map((p) => <Chip key={p} active={nonStriker === p} onClick={() => setNonStriker(p)}>{p}</Chip>)}
        </div>
        <Label>Opening Bowler</Label>
        <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {bowlingPlayers.map((p) => <Chip key={p} active={bowler === p} onClick={() => setBowler(p)}>{p}</Chip>)}
        </div>
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
            <div style={{ color: C.inkFaint, fontSize: 11 }}>({oversStr(inn1.legalBalls, inn1.oversLimit)} ov)</div>
          </Panel>
          {inn2 && (
            <Panel style={{ padding: 14, flex: 1 }}>
              <div style={{ color: C.inkFaint, fontSize: 11 }}>{inn2.battingTeam}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26 }}>{inn2.score}/{inn2.wkts}</div>
              <div style={{ color: C.inkFaint, fontSize: 11 }}>({oversStr(inn2.legalBalls, inn2.oversLimit)} ov)</div>
            </Panel>
          )}
        </div>
        <Scorecard inn={inn1} />
        {inn2 && <Scorecard inn={inn2} />}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <BigButton onClick={onHome} style={{ flex: 1, padding: 14 }}>Back to Menu</BigButton>
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
        <div style={{ padding: 20, color: C.inkDim }}>Searching for live match with code {code}…</div>
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

/* ===========================================================
   TOURNAMENT MANAGEMENT SYSTEM (3 TEAMS, 2 ROUNDS + FINAL)
=========================================================== */
function TournamentManager({ tournaments, setTournaments, onBack, onLaunchMatch, onNewTournament }) {
  const [activeTourId, setActiveTourId] = useState(() => {
    const keys = Object.keys(tournaments || {});
    return keys.length > 0 ? keys[keys.length - 1] : null;
  });
  const [tab, setTab] = useState("standings"); // standings | schedule | leaderboards | results

  const tournament = activeTourId && tournaments ? tournaments[activeTourId] : null;

  if (!tournament) {
    return (
      <div className="tb-fadein">
        <BackBar title="Tournament Manager" onBack={onBack} />
        <div style={{ padding: 20, textAlign: "center" }}>
          <div style={{ color: C.inkDim, marginBottom: 20 }}>No active tournament found. Create a 3-Team 2-Round tournament to begin!</div>
          <BigButton onClick={onNewTournament} bg={C.tape} color="#1A1305" style={{ padding: 16, width: "100%", fontFamily: FONT_DISPLAY, fontSize: 20 }}>
            + Create New 3-Team Tournament
          </BigButton>
        </div>
      </div>
    );
  }

  const standings = calculateTournamentStandings(tournament);
  const qualification = calculateQualificationStatus(tournament, standings);
  const stats = calculatePlayerLeaderboards(tournament);

  return (
    <div className="tb-fadein">
      <BackBar title={tournament.name} onBack={onBack}
        right={
          <button onClick={onNewTournament} className="tb-btn" style={{ background: C.panel2, color: C.tape, border: `1px solid ${C.panelBorder}`, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
            + New
          </button>
        }
      />

      <div style={{ display: "flex", gap: 6, padding: "10px 16px", overflowX: "auto" }}>
        <Chip active={tab === "standings"} onClick={() => setTab("standings")}>Points & NRR</Chip>
        <Chip active={tab === "schedule"} onClick={() => setTab("schedule")}>Schedule & Play</Chip>
        <Chip active={tab === "leaderboards"} onClick={() => setTab("leaderboards")}>Leaderboards</Chip>
        <Chip active={tab === "results"} onClick={() => setTab("results")}>Results</Chip>
      </div>

      {tab === "standings" && (
        <div style={{ padding: "0 16px 16px" }}>
          <Panel style={{ padding: 14, marginBottom: 14 }}>
            <Label>3-Team Group Standings (Win=2, Tie=1, Loss=0)</Label>
            <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 13 }}>
              <thead>
                <tr style={{ color: C.inkFaint, textAlign: "left", fontSize: 11 }}>
                  <th style={{ paddingBottom: 8 }}>Team</th><th>P</th><th>W</th><th>L</th><th>T</th><th>Pts</th><th>NRR</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((st, idx) => {
                  const statusInfo = qualification[st.team] || {};
                  return (
                    <tr key={st.team} className="table-row-hover" style={{ borderTop: `1px solid ${C.panelBorder}` }}>
                      <td style={{ padding: "10px 0", color: idx < 2 ? C.tape : C.ink, fontWeight: 700 }}>
                        {st.team}
                        <div style={{ marginTop: 2 }}>
                          {statusInfo.status === "QUALIFIED" && <span className="badge-qual">QUALIFIED</span>}
                          {statusInfo.status === "DIRECT_FINALIST" && <span className="badge-direct">DIRECT FINALIST</span>}
                          {statusInfo.status === "ELIMINATED" && <span className="badge-elim">ELIMINATED</span>}
                        </div>
                      </td>
                      <td>{st.played}</td><td>{st.won}</td><td>{st.lost}</td><td>{st.tied}</td>
                      <td style={{ color: C.tape, fontWeight: 700 }}>{st.pts}</td>
                      <td>{st.nrr > 0 ? `+${st.nrr.toFixed(3)}` : st.nrr.toFixed(3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          <Panel style={{ padding: 14 }}>
            <Label>Qualification Status</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10, fontSize: 13 }}>
              {Object.entries(qualification).map(([team, info]) => (
                <div key={team} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.panelBorder}`, paddingBottom: 8 }}>
                  <div>
                    <strong style={{ color: C.ink }}>{team}</strong>
                    <div style={{ color: C.inkDim, fontSize: 12 }}>{info.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {tab === "schedule" && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {tournament.matches.map((m) => {
            const isCompleted = m.status === "done";
            return (
              <Panel key={m.id} style={{ padding: 14, borderColor: m.isFinal ? C.tape : C.panelBorder }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: m.isFinal ? C.tape : C.inkFaint, fontWeight: 800, textTransform: "uppercase" }}>
                    {m.isFinal ? "🏆 FINAL MATCH" : `Round ${m.round} · Match ${m.matchNum}`}
                  </div>
                  {isCompleted ? (
                    <span style={{ color: C.win, fontSize: 11, fontWeight: 800 }}>✓ COMPLETED</span>
                  ) : (
                    <span style={{ color: C.tape, fontSize: 11, fontWeight: 800 }}>UPCOMING</span>
                  )}
                </div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: C.ink }}>
                  {m.teamA} <span style={{ color: C.inkFaint, fontSize: 16 }}>vs</span> {m.teamB}
                </div>
                {isCompleted ? (
                  <div style={{ color: C.tape, fontSize: 13, marginTop: 4, fontWeight: 700 }}>
                    Result: {m.result}
                  </div>
                ) : (
                  <BigButton
                    onClick={() => {
                      const matchConfig = prepareTournamentMatch(tournament, m);
                      onLaunchMatch(matchConfig);
                    }}
                    bg={m.isFinal ? C.win : C.tape}
                    color={m.isFinal ? "#0A1F0B" : "#1A1305"}
                    style={{ marginTop: 10, width: "100%", padding: 12, fontFamily: FONT_DISPLAY, fontSize: 18 }}
                  >
                    Start Match ▶
                  </BigButton>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      {tab === "leaderboards" && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>🟠</span>
              <Label>Top Run Scorers (Orange Cap)</Label>
            </div>
            <table style={{ width: "100%", marginTop: 6, borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
              <thead>
                <tr style={{ color: C.inkFaint, textAlign: "left" }}>
                  <th style={{ paddingBottom: 6 }}>Player</th><th>Team</th><th>Runs</th><th>Inns</th><th>SR</th><th>4s/6s</th>
                </tr>
              </thead>
              <tbody>
                {stats.batsmen.slice(0, 10).map((b, i) => (
                  <tr key={b.name} style={{ borderTop: `1px solid ${C.panelBorder}` }}>
                    <td style={{ padding: "6px 0", color: i === 0 ? C.tape : C.ink, fontWeight: i === 0 ? 700 : 400 }}>{b.name}</td>
                    <td style={{ color: C.inkDim }}>{b.team}</td>
                    <td style={{ color: C.tape, fontWeight: 700 }}>{b.runs}</td>
                    <td>{b.innings}</td>
                    <td>{strikeRate(b.runs, b.balls)}</td>
                    <td>{b.fours}/{b.sixes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>🟣</span>
              <Label>Top Wicket Takers (Purple Cap)</Label>
            </div>
            <table style={{ width: "100%", marginTop: 6, borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12 }}>
              <thead>
                <tr style={{ color: C.inkFaint, textAlign: "left" }}>
                  <th style={{ paddingBottom: 6 }}>Player</th><th>Team</th><th>Wkts</th><th>Overs</th><th>Runs</th><th>Econ</th>
                </tr>
              </thead>
              <tbody>
                {stats.bowlers.slice(0, 10).map((bw, i) => (
                  <tr key={bw.name} style={{ borderTop: `1px solid ${C.panelBorder}` }}>
                    <td style={{ padding: "6px 0", color: i === 0 ? C.tape : C.ink, fontWeight: i === 0 ? 700 : 400 }}>{bw.name}</td>
                    <td style={{ color: C.inkDim }}>{bw.team}</td>
                    <td style={{ color: C.win, fontWeight: 700 }}>{bw.wkts}</td>
                    <td>{Math.floor(bw.balls / 6)}.{bw.balls % 6}</td>
                    <td>{bw.runs}</td>
                    <td>{economy(bw.runs, bw.balls)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      )}

      {tab === "results" && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {tournament.matches.filter((m) => m.status === "done").map((m) => (
            <Panel key={m.id} style={{ padding: 14 }}>
              <div style={{ color: C.tape, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700 }}>
                Match {m.matchNum} · {m.teamA} vs {m.teamB}
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: C.ink, marginTop: 4 }}>
                {m.result}
              </div>
              {m.innings && m.innings[0] && (
                <Scorecard inn={m.innings[0]} />
              )}
              {m.innings && m.innings[1] && (
                <Scorecard inn={m.innings[1]} />
              )}
            </Panel>
          ))}
          {tournament.matches.filter((m) => m.status === "done").length === 0 && (
            <div style={{ color: C.inkDim, padding: 20 }}>No completed matches in this tournament yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   CREATE 3-TEAM 2-ROUND TOURNAMENT WIZARD
--------------------------------------------------------- */
function TournamentSetup({ tournaments, setTournaments, onCancel, onCreated }) {
  const [tourName, setTourName] = useState("Tapeball Super League 2026");
  const [overs, setOvers] = useState("8");
  const [teamA, setTeamA] = useState("Saddam XI");
  const [teamB, setTeamB] = useState("Arbaz XI");
  const [teamC, setTeamC] = useState("Zain XI");

  const [playersA, setPlayersA] = useState("Saddam, Ali, Bilal, Hamza, Usman, Fahad");
  const [playersB, setPlayersB] = useState("Arbaz, Ahmed, Danish, Kashif, Salman, Waqas");
  const [playersC, setPlayersC] = useState("Zain, Rashid, Imran, Kamran, Tariq, Rizwan");

  function createTournament() {
    const listA = playersA.split(",").map((s) => s.trim()).filter(Boolean);
    const listB = playersB.split(",").map((s) => s.trim()).filter(Boolean);
    const listC = playersC.split(",").map((s) => s.trim()).filter(Boolean);

    const tourId = "tour-" + Date.now();

    const matches = [
      { id: "m1", matchNum: 1, round: 1, teamA, teamB, status: "pending" },
      { id: "m2", matchNum: 2, round: 1, teamB, teamC, status: "pending" },
      { id: "m3", matchNum: 3, round: 1, teamC, teamA, status: "pending" },
      { id: "m4", matchNum: 4, round: 2, teamA, teamB, status: "pending" },
      { id: "m5", matchNum: 5, round: 2, teamB, teamC, status: "pending" },
      { id: "m6", matchNum: 6, round: 2, teamC, teamA, status: "pending" },
      { id: "m7", matchNum: 7, round: 3, isFinal: true, teamA: "Top Team 1", teamB: "Top Team 2", status: "pending" },
    ];

    const tournamentData = {
      id: tourId,
      name: tourName,
      oversLimit: Number(overs),
      teams: {
        [teamA]: listA,
        [teamB]: listB,
        [teamC]: listC,
      },
      teamNames: [teamA, teamB, teamC],
      matches,
      createdAt: Date.now(),
    };

    const existing = tournaments || {};
    const nextTournaments = { ...existing, [tourId]: tournamentData };
    setTournaments(nextTournaments);

    onCreated(tourId);
  }

  return (
    <div className="tb-fadein">
      <BackBar title="Create 3-Team Tournament" onBack={onCancel} />
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <Label>Tournament Name</Label>
          <TextInput value={tourName} onChange={(e) => setTourName(e.target.value)} style={{ marginTop: 6 }} />
        </div>
        <div>
          <Label>Overs Per Match</Label>
          <TextInput type="number" value={overs} onChange={(e) => setOvers(e.target.value)} style={{ marginTop: 6 }} />
        </div>

        <Panel style={{ padding: 14 }}>
          <Label>Team 1 Name & Roster</Label>
          <TextInput value={teamA} onChange={(e) => setTeamA(e.target.value)} style={{ marginTop: 6, marginBottom: 8 }} />
          <textarea value={playersA} onChange={(e) => setPlayersA(e.target.value)} rows={3} style={{ width: "100%", background: C.bg2, border: `1px solid ${C.panelBorder}`, borderRadius: 10, padding: 10, color: C.ink, fontFamily: FONT_BODY, fontSize: 14 }} />
        </Panel>

        <Panel style={{ padding: 14 }}>
          <Label>Team 2 Name & Roster</Label>
          <TextInput value={teamB} onChange={(e) => setTeamB(e.target.value)} style={{ marginTop: 6, marginBottom: 8 }} />
          <textarea value={playersB} onChange={(e) => setPlayersB(e.target.value)} rows={3} style={{ width: "100%", background: C.bg2, border: `1px solid ${C.panelBorder}`, borderRadius: 10, padding: 10, color: C.ink, fontFamily: FONT_BODY, fontSize: 14 }} />
        </Panel>

        <Panel style={{ padding: 14 }}>
          <Label>Team 3 Name & Roster</Label>
          <TextInput value={teamC} onChange={(e) => setTeamC(e.target.value)} style={{ marginTop: 6, marginBottom: 8 }} />
          <textarea value={playersC} onChange={(e) => setPlayersC(e.target.value)} rows={3} style={{ width: "100%", background: C.bg2, border: `1px solid ${C.panelBorder}`, borderRadius: 10, padding: 10, color: C.ink, fontFamily: FONT_BODY, fontSize: 14 }} />
        </Panel>

        <BigButton onClick={createTournament} bg={C.win} color="#0A1F0B" style={{ padding: 16, width: "100%", fontFamily: FONT_DISPLAY, fontSize: 20 }}>
          Generate Tournament Schedule ▶
        </BigButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   TOURNAMENT CALCULATIONS: STANDINGS, NRR & QUALIFICATION
--------------------------------------------------------- */
function calculateTournamentStandings(tour) {
  const teams = tour.teamNames || Object.keys(tour.teams || {});
  const stats = {};

  teams.forEach((t) => {
    stats[t] = { team: t, played: 0, won: 0, lost: 0, tied: 0, pts: 0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0, nrr: 0 };
  });

  tour.matches.forEach((m) => {
    if (m.status !== "done" || !m.innings || m.innings.length < 1) return;
    const inn1 = m.innings[0], inn2 = m.innings[1];
    if (!inn1) return;

    const t1 = inn1.battingTeam, t2 = inn1.bowlingTeam;
    if (!stats[t1] || !stats[t2]) return;

    stats[t1].played += 1;
    stats[t2].played += 1;

    if (m.winner === t1) {
      stats[t1].won += 1; stats[t1].pts += 2;
      stats[t2].lost += 1;
    } else if (m.winner === t2) {
      stats[t2].won += 1; stats[t2].pts += 2;
      stats[t1].lost += 1;
    } else {
      stats[t1].tied += 1; stats[t1].pts += 1;
      stats[t2].tied += 1; stats[t2].pts += 1;
    }

    stats[t1].runsScored += inn1.score;
    const maxWkts1 = inn1.battingPlayers ? inn1.battingPlayers.length - 1 : 10;
    stats[t1].ballsFaced += (inn1.wkts >= maxWkts1) ? inn1.oversLimit * 6 : inn1.legalBalls;

    stats[t2].runsConceded += inn1.score;
    stats[t2].ballsBowled += (inn1.wkts >= maxWkts1) ? inn1.oversLimit * 6 : inn1.legalBalls;

    if (inn2) {
      stats[t2].runsScored += inn2.score;
      const maxWkts2 = inn2.battingPlayers ? inn2.battingPlayers.length - 1 : 10;
      stats[t2].ballsFaced += (inn2.wkts >= maxWkts2) ? inn2.oversLimit * 6 : inn2.legalBalls;

      stats[t1].runsConceded += inn2.score;
      stats[t1].ballsBowled += (inn2.wkts >= maxWkts2) ? inn2.oversLimit * 6 : inn2.legalBalls;
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

function calculateQualificationStatus(tour, standings) {
  const result = {};
  const groupMatches = tour.matches.filter((m) => !m.isFinal);
  const remainingMatches = groupMatches.filter((m) => m.status !== "done").length;

  standings.forEach((s) => {
    const remMatchesForTeam = groupMatches.filter((m) => m.status !== "done" && (m.teamA === s.team || m.teamB === s.team)).length;
    const maxAchievablePts = s.pts + (remMatchesForTeam * 2);
    result[s.team] = { status: "IN_CONTENTION", note: `Max points achievable: ${maxAchievablePts}`, maxAchievablePts };
  });

  if (remainingMatches === 0) {
    standings.forEach((s, idx) => {
      if (idx < 2) {
        result[s.team] = { status: "QUALIFIED", note: "Secured Final spot" };
      } else {
        result[s.team] = { status: "ELIMINATED", note: "Eliminated from tournament" };
      }
    });
  } else if (standings.length >= 3) {
    const team2Pts = standings[1] ? standings[1].pts : 0;
    const team3MaxPts = result[standings[2].team] ? result[standings[2].team].maxAchievablePts : 0;

    if (team3MaxPts < team2Pts) {
      result[standings[2].team] = { status: "ELIMINATED", note: "Cannot catch top 2 points" };
      result[standings[0].team] = { status: "DIRECT_FINALIST", note: "Qualified directly for Final" };
      result[standings[1].team] = { status: "DIRECT_FINALIST", note: "Qualified directly for Final" };
    }
  }

  return result;
}

function prepareTournamentMatch(tour, matchObj) {
  const code = genCode();

  let teamA = matchObj.teamA;
  let teamB = matchObj.teamB;

  if (matchObj.isFinal) {
    const standings = calculateTournamentStandings(tour);
    teamA = standings[0] ? standings[0].team : "Team A";
    teamB = standings[1] ? standings[1].team : "Team B";
  }

  const playersA = tour.teams[teamA] || ["Player 1", "Player 2", "Player 3", "Player 4"];
  const playersB = tour.teams[teamB] || ["Player 1", "Player 2", "Player 3", "Player 4"];

  const inn1 = newInnings(teamA, teamB, playersA, playersB, tour.oversLimit, null);
  inn1.batsmen[playersA[0]] = emptyBatsman(playersA[0]);
  inn1.batsmen[playersA[1]] = emptyBatsman(playersA[1]);
  inn1.bowlers[playersB[0]] = emptyBowler(playersB[0]);
  inn1.striker = playersA[0];
  inn1.nonStriker = playersA[1];
  inn1.currentBowler = playersB[0];
  inn1.order = [playersA[0], playersA[1]];

  return {
    code,
    tournamentId: tour.id,
    tournamentMatchId: matchObj.id,
    matchNum: matchObj.matchNum,
    teamA, teamB, playersA, playersB,
    oversLimit: tour.oversLimit,
    tossWinner: teamA, tossDecision: "bat",
    innings: [inn1],
    currentInningsIdx: 0,
    status: "live",
    result: "", winner: "",
    createdAt: Date.now(),
  };
}

function calculatePlayerLeaderboards(tour) {
  const batsmen = {};
  const bowlers = {};

  tour.matches.forEach((m) => {
    if (m.status !== "done" || !m.innings) return;

    m.innings.forEach((inn) => {
      if (!inn || !inn.batsmen) return;

      Object.values(inn.batsmen).forEach((b) => {
        if (!b || b.balls === 0) return;
        if (!batsmen[b.name]) {
          batsmen[b.name] = { name: b.name, team: inn.battingTeam, runs: 0, balls: 0, fours: 0, sixes: 0, innings: 0 };
        }
        batsmen[b.name].runs += b.runs;
        batsmen[b.name].balls += b.balls;
        batsmen[b.name].fours += b.fours;
        batsmen[b.name].sixes += b.sixes;
        batsmen[b.name].innings += 1;
      });

      if (!inn.bowlers) return;
      Object.values(inn.bowlers).forEach((bw) => {
        if (!bw || bw.balls === 0) return;
        if (!bowlers[bw.name]) {
          bowlers[bw.name] = { name: bw.name, team: inn.bowlingTeam, wkts: 0, balls: 0, runs: 0 };
        }
        bowlers[bw.name].wkts += bw.wkts;
        bowlers[bw.name].balls += bw.balls;
        bowlers[bw.name].runs += bw.runs;
      });
    });
  });

  const sortedBatsmen = Object.values(batsmen).sort((a, b) => b.runs - a.runs || b.sixes - a.sixes);
  const sortedBowlers = Object.values(bowlers).sort((a, b) => b.wkts - a.wkts || a.runs - b.runs);

  return { batsmen: sortedBatsmen, bowlers: sortedBowlers };
}

/* ---------------------------------------------------------
   MOUNT APP TO DOM
--------------------------------------------------------- */
const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);
root.render(<App />);
