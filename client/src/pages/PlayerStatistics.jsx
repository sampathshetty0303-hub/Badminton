import {
  BarChart3,
  CheckCircle2,
  Percent,
  Target,
  Trophy,
  Swords,
} from "lucide-react";
import { useEffect, useState } from "react";

import AppShell from "../components/AppShell";
import api from "../services/api";

const emptyStatistics = {
  playerName: "Player",
  totalMatches: 0,
  wins: 0,
  losses: 0,
  pointsScored: 0,
  pointsConceded: 0,
  winPercentage: 0,
  rating: 0,
};

function PlayerStatistics() {
  const [statistics, setStatistics] = useState(emptyStatistics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const response = await api.get("/players/me/statistics");
        setStatistics({ ...emptyStatistics, ...response.data });
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Unable to load your statistics.");
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, []);

  if (loading) {
    return <AppShell><div className="loading-page"><div className="spinner" /><span>Loading your statistics...</span></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="page-header player-page-header">
        <div>
          <div className="eyebrow">PLAYER STATISTICS</div>
          <h1>{statistics.playerName}'s numbers</h1>
          <p>Your all-time performance across every completed match.</p>
        </div>
        <div className="date-pill"><BarChart3 size={17} />All time</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid player-statistics-grid">
        <div className="stat-card"><div className="stat-icon"><Swords size={20} /></div><div className="stat-content"><span>Total matches</span><strong>{statistics.totalMatches}</strong></div></div>
        <div className="stat-card"><div className="stat-icon"><Trophy size={20} /></div><div className="stat-content"><span>Total matches won</span><strong className="stat-positive">{statistics.wins}</strong></div></div>
        <div className="stat-card"><div className="stat-icon stat-icon-danger"><CheckCircle2 size={20} /></div><div className="stat-content"><span>Total matches lost</span><strong className="stat-negative">{statistics.losses}</strong></div></div>
        <div className="stat-card"><div className="stat-icon"><Target size={20} /></div><div className="stat-content"><span>Total points scored</span><strong>{statistics.pointsScored}</strong></div></div>
        <div className="stat-card"><div className="stat-icon stat-icon-danger"><Target size={20} /></div><div className="stat-content"><span>Total points conceded</span><strong>{statistics.pointsConceded}</strong></div></div>
        <div className="stat-card"><div className="stat-icon"><Percent size={20} /></div><div className="stat-content"><span>Win percentage</span><strong>{statistics.winPercentage}%</strong></div></div>
      </div>

      <section className="panel player-rating-panel">
        <div className="panel-header"><div><span className="panel-kicker">OVERALL RATING</span><h2>Your player rating</h2></div><div className="panel-icon"><BarChart3 size={20} /></div></div>
        <div className="player-rating-content"><strong>{statistics.rating}<small>/100</small></strong><p>Calculated from wins, losses, points scored, points conceded, and completed-match experience.</p></div>
      </section>
    </AppShell>
  );
}

export default PlayerStatistics;
