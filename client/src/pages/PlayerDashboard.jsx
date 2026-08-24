import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Percent,
  RefreshCw,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import api from "../services/api";
import AppShell from "../components/AppShell";

const getPlayerId = (user) => user?._id || user?.playerId || user?.id;

const formatDate = (date) => new Date(date).toLocaleDateString("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function PlayerDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const playerId = getPlayerId(user);
  const isCurrentPlayer = (player) => String(player?._id) === String(playerId) || player?.name === user.name;
  const [day, setDay] = useState(null);
  const [matches, setMatches] = useState([]);
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const dayResponse = await api.get("/days/current");
      const currentDay = dayResponse.data;
      setDay(currentDay || null);

      if (!currentDay?._id) {
        setMatches([]);
        setSettlement(null);
        return;
      }

      const [matchesResponse, settlementResponse] = await Promise.all([
        api.get(`/matches/day/${currentDay._id}`),
        api.get(`/settlements/day/${currentDay._id}/final`).catch(() => ({ data: null })),
      ]);

      setMatches(Array.isArray(matchesResponse.data) ? matchesResponse.data : []);
      setSettlement(settlementResponse.data || null);
    } catch (loadError) {
      console.error("Player dashboard error:", loadError);
      setError(loadError.response?.data?.message || "Unable to load your dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadDashboard(), 0);

    return () => clearTimeout(timer);
  }, []);

  const playerMatches = matches.filter((match) => [...(match.teamA || []), ...(match.teamB || [])].some(isCurrentPlayer));
  const completedMatches = playerMatches.filter((match) => match.status === "completed");
  const wins = completedMatches.filter((match) => {
    const team = match.teamA.some(isCurrentPlayer) ? "A" : "B";
    return match.winner === team;
  }).length;
  const losses = completedMatches.length - wins;
  const pointsFor = completedMatches.reduce((total, match) => {
    return total + (match.teamA.some(isCurrentPlayer) ? match.scoreA : match.scoreB);
  }, 0);
  const pointsAgainst = completedMatches.reduce((total, match) => {
    return total + (match.teamA.some(isCurrentPlayer) ? match.scoreB : match.scoreA);
  }, 0);
  const winRate = completedMatches.length ? Math.round((wins / completedMatches.length) * 100) : 0;
  const balanceEntry = settlement?.entries?.find(
    (entry) => String(entry.player?._id || entry.player) === String(playerId) || entry.player?.name === user.name
  );
  const balance = balanceEntry?.amount ?? (wins - losses) * (completedMatches[0]?.stakePerPlayer || 5);
  const pendingPayment = balanceEntry?.status === "pending" && balance !== 0;

  if (loading) {
    return <AppShell><div className="loading-page"><div className="spinner" /><span>Loading your dashboard...</span></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="page-header player-page-header">
        <div>
          <div className="eyebrow">PLAYER OVERVIEW</div>
          <h1>Welcome back, {user.name || "Player"}.</h1>
          <p>Keep an eye on today's games and your running balance.</p>
        </div>
        <div className="date-pill"><CalendarDays size={17} />{formatDate(day?.date || new Date())}</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="player-status-banner">
        <div className="player-status-icon"><Activity size={22} /></div>
        <div><span className="panel-kicker">TODAY'S SESSION</span><strong>{day ? "Session is open" : "No session is open"}</strong><p>{day ? "Matches and your balance will update as results are recorded." : "Your next session will appear here when the admin opens it."}</p></div>
        <span className={`status-badge ${day ? "status-open" : "status-idle"}`}>{day ? "Live" : "Waiting"}</span>
      </section>

      <div className="stats-grid player-stats-grid">
        <div className="stat-card"><div className="stat-icon"><Trophy size={20} /></div><div className="stat-content"><span>Your matches</span><strong>{playerMatches.length}</strong></div><div className="stat-accent"><Users size={16} /></div></div>
        <div className="stat-card"><div className="stat-icon"><CheckCircle2 size={20} /></div><div className="stat-content"><span>Wins / losses</span><strong><span className="stat-positive">{wins}</span> / <span className="stat-negative">{losses}</span></strong></div></div>
        <div className="stat-card"><div className="stat-icon"><Percent size={20} /></div><div className="stat-content"><span>Win rate</span><strong>{winRate}%</strong></div></div>
        <div className="stat-card"><div className="stat-icon"><Target size={20} /></div><div className="stat-content"><span>Points for / against</span><strong>{pointsFor} / {pointsAgainst}</strong></div></div>
        <div className="stat-card"><div className={`stat-icon ${balance < 0 ? "stat-icon-danger" : ""}`}>{balance < 0 ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}</div><div className="stat-content"><span>Running balance</span><strong className={balance < 0 ? "stat-negative" : "stat-positive"}>{balance >= 0 ? "+" : "-"}₹{Math.abs(balance)}</strong></div></div>
      </div>

      <div className="player-dashboard-grid">
        <section className="panel">
          <div className="panel-header"><div><span className="panel-kicker">MATCH CENTRE</span><h2>Your matches</h2></div><button className="icon-button" onClick={() => loadDashboard(true)} disabled={refreshing} title="Refresh matches"><RefreshCw size={16} className={refreshing ? "spin" : ""} /></button></div>
          {playerMatches.length === 0 ? <div className="empty-state"><div className="empty-state-icon"><Trophy size={24} /></div><h3>{day ? "No match assigned yet" : "Nothing scheduled"}</h3><p>{day ? "Your matches will show up here once the session is arranged." : "Open a session to see your games."}</p></div> : <div className="player-match-list">{playerMatches.map((match, index) => { const isTeamA = match.teamA.some(isCurrentPlayer); const won = match.status === "completed" && match.winner === (isTeamA ? "A" : "B"); return <article className="player-match" key={match._id}><div className="player-match-heading"><span>GAME {String(index + 1).padStart(2, "0")}</span><span className={`status-badge ${match.status === "completed" ? "status-complete" : "status-pending"}`}>{match.status === "completed" ? <><CheckCircle2 size={12} /> Complete</> : <><Clock3 size={12} /> Pending</>}</span></div><div className="player-match-score"><div className={isTeamA ? "player-team player-team-current" : "player-team"}><span>TEAM A</span><strong>{match.teamA.map((player) => player.name).join(" & ")}</strong></div><div className="score-block">{match.status === "completed" ? <><strong>{match.scoreA}</strong><small>:</small><strong>{match.scoreB}</strong></> : <small>VS</small>}</div><div className={!isTeamA ? "player-team player-team-current" : "player-team"}><span>TEAM B</span><strong>{match.teamB.map((player) => player.name).join(" & ")}</strong></div></div>{match.status === "completed" && <div className={`match-result ${won ? "result-win" : "result-loss"}`}>{won ? "You won this game" : "You lost this game"}</div>}</article>; })}</div>}
        </section>

        <section className="panel balance-panel"><div className="panel-header"><div><span className="panel-kicker">SETTLEMENT</span><h2>Your balance</h2></div><div className="panel-icon"><CircleDollarSign size={19} /></div></div><div className="balance-summary"><strong className={balance < 0 ? "stat-negative" : "stat-positive"}>{balance >= 0 ? "+" : "-"}₹{Math.abs(balance)}</strong><span>{balance > 0 ? "You are owed" : balance < 0 ? "You need to pay" : "All square for now"}</span></div>{settlement ? <div className="settlement-note"><span className={`status-badge ${pendingPayment ? "status-pending" : "status-complete"}`}>{pendingPayment ? "Payment pending" : "Settled"}</span><p>The final settlement for this session has been recorded.</p></div> : <div className="settlement-note"><span className="status-badge status-idle">In progress</span><p>Your final balance is calculated when today's session is closed.</p></div>}</section>
      </div>
    </AppShell>
  );
}

export default PlayerDashboard;