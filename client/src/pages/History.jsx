import { Edit3, History as HistoryIcon, LockKeyhole, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import AppShell from "../components/AppShell";
import api from "../services/api";

const playerId = (player) => String(player?._id || player || "");

function History() {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [editingMatch, setEditingMatch] = useState(null);
  const [form, setForm] = useState({ teamA: ["", ""], teamB: ["", ""], scoreA: "", scoreB: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError("");
      const [matchesResponse, playersResponse] = await Promise.all([
        api.get("/matches"),
        api.get("/players"),
      ]);
      setMatches(Array.isArray(matchesResponse.data) ? matchesResponse.data : []);
      setPlayers(Array.isArray(playersResponse.data) ? playersResponse.data : []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Unable to load match history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadHistory, 0);
    return () => clearTimeout(timer);
  }, []);

  const openEdit = (match) => {
    setError("");
    setMessage("");
    setEditingMatch(match);
    setForm({
      teamA: match.teamA.map(playerId),
      teamB: match.teamB.map(playerId),
      scoreA: match.scoreA ?? "",
      scoreB: match.scoreB ?? "",
    });
  };

  const updateTeamPlayer = (team, index, value) => {
    setForm((current) => ({
      ...current,
      [team]: current[team].map((player, playerIndex) => playerIndex === index ? value : player),
    }));
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    const selectedPlayers = [...form.teamA, ...form.teamB];

    if (selectedPlayers.some((player) => !player) || new Set(selectedPlayers).size !== 4) {
      setError("Choose four different players.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const response = await api.put(`/matches/${editingMatch._id}`, form);
      setMatches((current) => current.map((match) => match._id === response.data._id ? response.data : match));
      setEditingMatch(null);
      setMessage("Match updated successfully.");
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Unable to update match.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMatch = async (match) => {
    if (match.day?.status === "closed" || !window.confirm("Delete this match?")) return;

    try {
      setError("");
      await api.delete(`/matches/${match._id}`);
      setMatches((current) => current.filter((item) => item._id !== match._id));
      setMessage("Match deleted successfully.");
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || "Unable to delete match.");
    }
  };

  const getWinnerLabel = (match) => {
    if (match.status !== "completed") return null;
    return match.winner === "A" ? "Team 1 wins" : "Team 2 wins";
  };

  if (loading) {
    return <AppShell><div className="loading-page"><div className="spinner" /><span>Loading match history...</span></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="page-header">
        <div><div className="eyebrow">MATCH HISTORY</div><h1>All matches</h1><p>Edit or remove matches while their session is still open.</p></div>
        <div className="date-pill"><HistoryIcon size={16} /> {matches.length} matches</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <section className="panel history-panel">
        <div className="panel-header"><div><span className="panel-kicker">RECORDS</span><h2>Match history</h2></div></div>
        {matches.length === 0 ? <div className="empty-state"><div className="empty-state-icon"><HistoryIcon size={24} /></div><h3>No matches recorded</h3><p>Created matches will appear here.</p></div> : <div className="history-list">{matches.map((match, index) => { const locked = match.day?.status === "closed"; const winnerLabel = getWinnerLabel(match); const winningTeam = match.status === "completed" && match.winner === "B" ? match.teamB : match.teamA; const losingTeam = match.status === "completed" && match.winner === "B" ? match.teamA : match.teamB; const winningScore = match.winner === "B" ? match.scoreB : match.scoreA; const losingScore = match.winner === "B" ? match.scoreA : match.scoreB; return <article className="history-row" key={match._id}><div className="history-index">{String(index + 1).padStart(2, "0")}</div><div className="history-matchup"><div className={winnerLabel ? "history-team history-team-winner" : "history-team"}><strong>{winningTeam.map((player) => player.name).join(" + ")}</strong>{winnerLabel && <small>WINNER</small>}</div><span>vs</span><div className="history-team"><strong>{losingTeam.map((player) => player.name).join(" + ")}</strong>{winnerLabel && <small>LOSER</small>}</div></div><div className="history-result">{match.status === "completed" ? `${winningScore} - ${losingScore}` : "Pending"}<small>{match.day?.date ? new Date(match.day.date).toLocaleDateString("en-IN") : ""}</small></div><div className="history-actions">{locked ? <span className="history-locked" title="Closed-day matches cannot be changed"><LockKeyhole size={15} /></span> : <><button className="table-action" onClick={() => openEdit(match)} title="Edit match"><Edit3 size={15} /></button><button className="table-action danger" onClick={() => deleteMatch(match)} title="Delete match"><Trash2 size={15} /></button></>}</div></article>; })}</div>}
      </section>

      {editingMatch && <div className="modal-overlay"><form className="create-match-modal history-edit-modal" onSubmit={saveEdit}><div className="modal-header"><div><span className="panel-kicker">EDIT MATCH</span><h2>Update match record</h2></div><button type="button" className="modal-close" onClick={() => setEditingMatch(null)}>×</button></div><div className="history-edit-grid"><div><label>Team 1 player 1<select value={form.teamA[0]} onChange={(event) => updateTeamPlayer("teamA", 0, event.target.value)}>{players.map((player) => <option value={player._id} key={`a1-${player._id}`}>{player.name}</option>)}</select></label><label>Team 1 player 2<select value={form.teamA[1]} onChange={(event) => updateTeamPlayer("teamA", 1, event.target.value)}>{players.map((player) => <option value={player._id} key={`a2-${player._id}`}>{player.name}</option>)}</select></label></div><div><label>Team 2 player 1<select value={form.teamB[0]} onChange={(event) => updateTeamPlayer("teamB", 0, event.target.value)}>{players.map((player) => <option value={player._id} key={`b1-${player._id}`}>{player.name}</option>)}</select></label><label>Team 2 player 2<select value={form.teamB[1]} onChange={(event) => updateTeamPlayer("teamB", 1, event.target.value)}>{players.map((player) => <option value={player._id} key={`b2-${player._id}`}>{player.name}</option>)}</select></label></div></div><div className="history-score-grid"><label>Team 1 score<input type="number" min="0" value={form.scoreA} onChange={(event) => setForm((current) => ({ ...current, scoreA: event.target.value }))} placeholder="Leave blank for pending" /></label><label>Team 2 score<input type="number" min="0" value={form.scoreB} onChange={(event) => setForm((current) => ({ ...current, scoreB: event.target.value }))} placeholder="Leave blank for pending" /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditingMatch(null)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button></div></form></div>}
    </AppShell>
  );
}

export default History;
