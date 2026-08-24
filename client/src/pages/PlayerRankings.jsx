import { BarChart3, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

import AppShell from "../components/AppShell";
import api from "../services/api";

function PlayerRankings() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadRankings = async () => {
      try {
        const response = await api.get("/players/rankings");
        setRankings(Array.isArray(response.data) ? response.data : []);
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Unable to load player rankings.");
      } finally {
        setLoading(false);
      }
    };

    loadRankings();
  }, []);

  return (
    <AppShell>
      <div className="page-header player-page-header">
        <div>
          <div className="eyebrow">PLAYER RANKINGS</div>
          <h1>Leaderboard</h1>
          <p>See how every active player ranks across completed matches.</p>
        </div>
        <div className="date-pill"><BarChart3 size={17} />All time</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="panel rankings-panel">
        <div className="panel-header"><div><span className="panel-kicker">RANKINGS</span><h2>Top players</h2></div><Trophy size={21} className="ranking-header-icon" /></div>
        {loading ? <div className="loading-page inline"><div className="spinner" /><span>Loading rankings...</span></div> : rankings.length === 0 ? <div className="empty-state"><Trophy size={30} /><h3>No rankings yet</h3><p>Complete a match to start the leaderboard.</p></div> : <div className="rankings-list">{rankings.map((player) => <div className="ranking-row" key={String(player.playerId)}><strong className="ranking-position">{String(player.rank).padStart(2, "0")}</strong><div className="ranking-player"><strong>{player.playerName}</strong><span>{player.wins} wins · {player.losses} losses · {player.winPercentage}% win rate</span></div><div className="ranking-score"><strong>{player.rating}</strong><span>/100</span></div></div>)}</div>}
      </section>
    </AppShell>
  );
}

export default PlayerRankings;
