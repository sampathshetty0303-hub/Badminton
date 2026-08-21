import {
  Trophy,
  CheckCircle2,
  Clock3,
  Users,
  UserCheck,
  Shuffle,
  RotateCw,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";

import AppShell from "../components/AppShell";
import api from "../services/api";

function Matches() {
  const [day, setDay] = useState(null);
  const [matches, setMatches] = useState([]);
  const [activePlayers, setActivePlayers] = useState([]);

  // Generated preview only.
  // This is NOT saved until Start Match.
  const [generatedMatch, setGeneratedMatch] = useState(null);
  const [selectedTeamA, setSelectedTeamA] = useState(0);
  const [selectedTeamB, setSelectedTeamB] = useState(1);
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [manualTeamA, setManualTeamA] = useState([]);
  const [manualTeamB, setManualTeamB] = useState([]);

  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");

  const [resultMatch, setResultMatch] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      setError("");

      const [dayResponse, playersResponse] = await Promise.all([
        api.get("/days/current"),
        api.get("/players/active"),
      ]);
      const currentDay = dayResponse.data;

      setDay(currentDay);
      setActivePlayers(
        Array.isArray(playersResponse.data) ? playersResponse.data : []
      );

      if (currentDay?._id) {
        const matchesResponse = await api.get(
          `/matches/day/${currentDay._id}`
        );

        setMatches(
          Array.isArray(matchesResponse.data) ? matchesResponse.data : []
        );
      } else {
        setMatches([]);
      }
    } catch (err) {
      console.error("Load matches error:", err);

      setError(
        err.response?.data?.message || "Failed to load current matches."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => loadData(), 0);

    // Auto-refresh match state every 10 seconds to detect newly active players
    const interval = setInterval(() => {
      loadData(true);
    }, 10000);

    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadData]);

  // ============================================================
  // GENERATE RANDOM MATCH
  // ============================================================

  const generateMatch = async () => {
    setError("");
    setMessage("");

    if (!day) {
      setError("Today's session is not open.");
      return;
    }

    if (day.status !== "open") {
      setError("Today's session is closed.");
      return;
    }

    try {
      setGenerating(true);

      const response = await api.post("/matches/random", {
        dayId: day._id,
      });

      setGeneratedMatch(response.data);
      setSelectedTeamA(0);
      setSelectedTeamB(1);
    } catch (err) {
      console.error("Generate random match error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to generate random teams. Make sure enough active players are added to today's session."
      );
    } finally {
      setGenerating(false);
    }
  };

  // ============================================================
  // START MATCH
  // ============================================================

  const openCreateMatch = () => {
    setError("");
    setMessage("");
    setManualTeamA([]);
    setManualTeamB([]);
    setShowCreateMatch(true);
  };

  const toggleManualPlayer = (playerId, team) => {
    if (team === "A") {
      if (manualTeamA.includes(playerId)) {
        setManualTeamA((current) => current.filter((id) => id !== playerId));
      } else if (manualTeamA.length < 2) {
        setManualTeamB((current) => current.filter((id) => id !== playerId));
        setManualTeamA((current) => [...current, playerId]);
      }
      return;
    }

    if (manualTeamB.includes(playerId)) {
      setManualTeamB((current) => current.filter((id) => id !== playerId));
    } else if (manualTeamB.length < 2) {
      setManualTeamA((current) => current.filter((id) => id !== playerId));
      setManualTeamB((current) => [...current, playerId]);
    }
  };

  const createMatch = async () => {
    if (!day || day.status !== "open") {
      setError("Today's session is closed.");
      return;
    }

    if (manualTeamA.length !== 2 || manualTeamB.length !== 2) {
      setError("Choose 2 players for each team.");
      return;
    }

    try {
      setSaving(true);
      const response = await api.post("/matches", {
        dayId: day._id,
        teamA: manualTeamA,
        teamB: manualTeamB,
      });

      setMatches((current) => [...current, response.data]);
      setShowCreateMatch(false);

      setMessage("Match started successfully.");
    } catch (err) {
      console.error("Start match error:", err);

      setError(
        err.response?.data?.message || "Failed to start match."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // RESULT MODAL
  // ============================================================

  const openResultModal = (match) => {
    setResultMatch(match);

    setScoreA(
      match.scoreA !== null && match.scoreA !== undefined
        ? String(match.scoreA)
        : ""
    );

    setScoreB(
      match.scoreB !== null && match.scoreB !== undefined
        ? String(match.scoreB)
        : ""
    );

    setError("");
    setMessage("");
  };

  const closeResultModal = () => {
    setResultMatch(null);
    setScoreA("");
    setScoreB("");
  };

  // ============================================================
  // SAVE RESULT
  // ============================================================

  const saveResult = async () => {
    if (!resultMatch) return;

    setError("");
    setMessage("");

    if (scoreA === "" || scoreB === "") {
      setError("Enter both scores.");
      return;
    }

    const a = Number(scoreA);
    const b = Number(scoreB);

    if (
      !Number.isInteger(a) ||
      !Number.isInteger(b) ||
      a < 0 ||
      b < 0
    ) {
      setError("Scores must be valid whole numbers.");
      return;
    }

    if (a === b) {
      setError("A badminton match cannot end in a tie.");
      return;
    }

    const winner = a > b ? "A" : "B";

    try {
      setSaving(true);

      const response = await api.put(
        `/matches/${resultMatch._id}/result`,
        {
          scoreA: a,
          scoreB: b,
          winner,
        }
      );

      setMatches((current) =>
        current.map((match) =>
          match._id === resultMatch._id ? response.data : match
        )
      );

      closeResultModal();

      setMessage("Match result saved successfully.");
    } catch (err) {
      console.error("Save result error:", err);

      setError(
        err.response?.data?.message || "Failed to save result"
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // TEAM NAMES
  // ============================================================

  const getTeamNames = (team) => {
    if (!Array.isArray(team)) {
      return "";
    }

    return team
      .map((player) => {
        if (typeof player === "object" && player !== null) {
          return player.name;
        }

        return "Player";
      })
      .join(" + ");
  };

  const generatedTeams = generatedMatch?.teams || [];
  const selectedTeamAPlayers = generatedTeams[selectedTeamA] || generatedMatch?.teamA || [];
  const selectedTeamBPlayers = generatedTeams[selectedTeamB] || generatedMatch?.teamB || [];

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <AppShell>
        <div className="loading-page">
          <div className="spinner" />
          <span>Loading matches...</span>
        </div>
      </AppShell>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="eyebrow">MATCH MANAGEMENT</div>
          <h1>Today's matches</h1>
          <p>
            Generate random doubles teams and record match results.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            className="secondary-button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Refresh current session and active players"
          >
            <RotateCw size={16} className={refreshing ? "spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <div className="date-pill">
            <Trophy size={16} />
            ₹5 per player
          </div>
        </div>
      </div>

      {/* ====================================================== */}
      {/* ALERTS */}
      {/* ====================================================== */}

      {error && <div className="alert alert-error">{error}</div>}

      {message && <div className="alert alert-success">{message}</div>}

      {!day ? (
        <section className="panel">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Clock3 size={24} />
            </div>

            <h3>Today's session is not open</h3>

            <p>
              Open today's day from the dashboard before creating
              matches.
            </p>
          </div>
        </section>
      ) : (
        <div className="matches-page-grid">
          {/* ================================================== */}
          {/* RANDOM MATCH GENERATOR */}
          {/* ================================================== */}

          <section className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">NEW MATCH</span>
                <h2>Random team generator</h2>
              </div>

              <div className="panel-icon">
                <Shuffle size={20} />
              </div>
            </div>

            {/* ================================================= */}
            {/* NO GENERATED MATCH */}
            {/* ================================================= */}

            {!generatedMatch ? (
              <div className="random-generator-empty">
                <div className="random-generator-icon">🎲</div>

                <h3>Generate random teams</h3>

                <p>
                  The server will pair every active player into doubles teams,
                  then schedule the first two teams to play.
                </p>

                <div className="generator-rules">
                  <div>
                    <Users size={16} />
                    <span>{activePlayers.length} active players available</span>
                  </div>

                  <div>
                    <Shuffle size={16} />
                    <span>2 players per team</span>
                  </div>

                  <div>
                    <CheckCircle2 size={16} />
                    <span>No duplicates</span>
                  </div>
                </div>

                <button
                  className="primary-button generate-button"
                  onClick={generateMatch}
                  disabled={generating || day.status !== "open"}
                >
                  <Shuffle size={18} />
                  {generating
                    ? "Generating..."
                    : "Generate random match"}
                </button>

                <button
                  className="secondary-button generate-button"
                  onClick={openCreateMatch}
                  disabled={day.status !== "open"}
                >
                  <Users size={18} />
                  Create match manually
                </button>
              </div>
            ) : (
              <>
                {/* ============================================= */}
                {/* GENERATED TEAMS */}
                {/* ============================================= */}

                <div className="generated-match">
                  <div className="generated-match-heading">
                    <div>
                      <span className="panel-kicker">
                        GENERATED TEAMS
                      </span>
                      <h3>Ready to play</h3>
                    </div>

                    <span className="random-badge">RANDOM</span>
                  </div>

                  <div className="match-selection-panel">
                    <strong>Choose the first matchup</strong>
                    <div className="match-selection-controls">
                      <label>
                        Team A
                        <select value={selectedTeamA} onChange={(event) => setSelectedTeamA(Number(event.target.value))}>
                          {generatedMatch.teams?.map((_, index) => (
                            <option value={index} key={`a-${index}`}>Team {index + 1}</option>
                          ))}
                        </select>
                      </label>
                      <span>vs</span>
                      <label>
                        Team B
                        <select value={selectedTeamB} onChange={(event) => setSelectedTeamB(Number(event.target.value))}>
                          {generatedMatch.teams?.map((_, index) => (
                            <option value={index} key={`b-${index}`}>Team {index + 1}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="generated-teams">
                    {/* TEAM A */}

                    <div className="generated-team team-a">
                      <div className="generated-team-header">
                        <div className="team-number">A</div>

                        <div>
                          <strong>Team A</strong>
                          <span>2 players</span>
                        </div>
                      </div>

                      <div className="generated-player-list">
                        {selectedTeamAPlayers.map((player) => (
                          <div
                            className="generated-player"
                            key={player._id}
                          >
                            <div className="player-option-avatar">
                              {player.name?.charAt(0).toUpperCase()}
                            </div>

                            <span>{player.name}</span>

                            <UserCheck size={16} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* VS */}

                    <div className="generated-vs">
                      <span>VS</span>
                    </div>

                    {/* TEAM B */}

                    <div className="generated-team team-b">
                      <div className="generated-team-header">
                        <div className="team-number team-b">B</div>

                        <div>
                          <strong>Team B</strong>
                          <span>2 players</span>
                        </div>
                      </div>

                      <div className="generated-player-list">
                        {selectedTeamBPlayers.map((player) => (
                          <div
                            className="generated-player"
                            key={player._id}
                          >
                            <div className="player-option-avatar">
                              {player.name?.charAt(0).toUpperCase()}
                            </div>

                            <span>{player.name}</span>

                            <UserCheck size={16} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {generatedMatch.teams?.slice(2).map((team, index) => (
                      <div className="generated-team" key={`team-${index + 3}`}>
                        <div className="generated-team-header">
                          <div className="team-number">{index + 3}</div>
                          <div>
                            <strong>Team {index + 3}</strong>
                            <span>Waiting for its turn</span>
                          </div>
                        </div>

                        <div className="generated-player-list">
                          {team.map((player) => (
                            <div className="generated-player" key={player._id}>
                              <div className="player-option-avatar">
                                {player.name?.charAt(0).toUpperCase()}
                              </div>
                              <span>{player.name}</span>
                              <Users size={16} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {generatedMatch.leftOut && (
                      <div className="left-out-player">
                        <strong>Left out this round</strong>
                        <span>{generatedMatch.leftOut.name}</span>
                      </div>
                    )}
                  </div>

                  {/* =========================================== */}
                  {/* GENERATOR ACTIONS */}
                  {/* =========================================== */}

                  <div className="generator-actions">
                    <button
                      className="secondary-button"
                      onClick={generateMatch}
                      disabled={generating || saving}
                    >
                      <Shuffle size={16} />
                      {generating ? "Shuffling..." : "Shuffle again"}
                    </button>

                    <button
                      className="primary-button"
                      onClick={openCreateMatch}
                      disabled={saving || generating}
                    >
                      <CheckCircle2 size={16} />
                      Start match
                    </button>
                  </div>

                  <p className="generator-note">
                    Teams are not saved until you click{" "}
                    <strong>Start match</strong>.
                  </p>
                </div>
              </>
            )}
          </section>

          {/* ================================================== */}
          {/* MATCH HISTORY */}
          {/* ================================================== */}

          <section className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">TODAY</span>
                <h2>Match history</h2>
              </div>

              <span className="count-pill">{matches.length}</span>
            </div>

            {matches.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Trophy size={24} />
                </div>

                <h3>No matches yet</h3>

                <p>
                  Generate the first random match for today's session.
                </p>
              </div>
            ) : (
              <div className="matches-list">
                {matches.map((match, index) => (
                  <div className="match-card" key={match._id}>
                    <div className="match-card-top">
                      <span className="match-label">
                        MATCH {String(index + 1).padStart(2, "0")}
                      </span>

                      {match.status === "completed" ? (
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} />
                          Completed
                        </span>
                      ) : (
                        <span className="badge badge-warning">
                          <Clock3 size={12} />
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="match-scoreboard">
                      {/* TEAM A */}

                      <div
                        className={
                          match.winner === "A"
                            ? "match-team winner"
                            : "match-team"
                        }
                      >
                        <strong>
                          {getTeamNames(match.teamA)}
                        </strong>

                        {match.scoreA !== null &&
                          match.scoreA !== undefined && (
                            <span>{match.scoreA}</span>
                          )}
                      </div>

                      <div className="score-divider">-</div>

                      {/* TEAM B */}

                      <div
                        className={
                          match.winner === "B"
                            ? "match-team winner"
                            : "match-team"
                        }
                      >
                        <strong>
                          {getTeamNames(match.teamB)}
                        </strong>

                        {match.scoreB !== null &&
                          match.scoreB !== undefined && (
                            <span>{match.scoreB}</span>
                          )}
                      </div>
                    </div>

                    {match.status !== "completed" && (
                      <button
                        className="secondary-button full"
                        onClick={() => openResultModal(match)}
                      >
                        Enter result
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {showCreateMatch && (
        <div className="modal-overlay">
          <div className="create-match-modal">
            <div className="modal-header">
              <div>
                <span className="panel-kicker">CREATE MATCH</span>
                <h2>Choose the players</h2>
              </div>
              <button className="modal-close" onClick={() => setShowCreateMatch(false)}>×</button>
            </div>

            <p className="create-match-help">Select exactly two players for each team. This match is created independently of random shuffle.</p>

            <div className="manual-team-grid">
              <section className="manual-team-column">
                <h3>Team 1 <span>{manualTeamA.length}/2</span></h3>
                {activePlayers.map((player) => (
                  <button type="button" key={`manual-a-${player._id}`} className={`manual-player-option ${manualTeamA.includes(player._id) ? "selected" : ""}`} onClick={() => toggleManualPlayer(player._id, "A")}>
                    <span className="player-option-avatar">{player.name?.charAt(0).toUpperCase()}</span>
                    <span>{player.name}</span>
                    {manualTeamA.includes(player._id) && <CheckCircle2 size={15} />}
                  </button>
                ))}
              </section>

              <section className="manual-team-column">
                <h3>Team 2 <span>{manualTeamB.length}/2</span></h3>
                {activePlayers.map((player) => (
                  <button type="button" key={`manual-b-${player._id}`} className={`manual-player-option ${manualTeamB.includes(player._id) ? "selected" : ""}`} onClick={() => toggleManualPlayer(player._id, "B")}>
                    <span className="player-option-avatar">{player.name?.charAt(0).toUpperCase()}</span>
                    <span>{player.name}</span>
                    {manualTeamB.includes(player._id) && <CheckCircle2 size={15} />}
                  </button>
                ))}
              </section>
            </div>

            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setShowCreateMatch(false)}>Cancel</button>
              <button className="primary-button" onClick={createMatch} disabled={saving || manualTeamA.length !== 2 || manualTeamB.length !== 2}>
                <CheckCircle2 size={16} />
                {saving ? "Creating..." : "Create match"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* RESULT MODAL */}
      {/* ====================================================== */}

      {resultMatch && (
        <div className="modal-overlay">
          <div className="result-modal">
            <div className="modal-header">
              <div>
                <span className="panel-kicker">MATCH RESULT</span>
                <h2>Enter final score</h2>
              </div>

              <button
                className="modal-close"
                onClick={closeResultModal}
              >
                ×
              </button>
            </div>

            <div className="result-teams">
              <div>
                <span>Team A</span>
                <strong>{getTeamNames(resultMatch.teamA)}</strong>
              </div>

              <div className="result-vs">VS</div>

              <div>
                <span>Team B</span>
                <strong>{getTeamNames(resultMatch.teamB)}</strong>
              </div>
            </div>

            <div className="score-inputs">
              <div>
                <label>Team A score</label>
                <input
                  type="number"
                  min="0"
                  value={scoreA}
                  onChange={(e) => setScoreA(e.target.value)}
                  placeholder="21"
                />
              </div>

              <div className="score-vs">-</div>

              <div>
                <label>Team B score</label>
                <input
                  type="number"
                  min="0"
                  value={scoreB}
                  onChange={(e) => setScoreB(e.target.value)}
                  placeholder="18"
                />
              </div>
            </div>

            {scoreA !== "" &&
              scoreB !== "" &&
              Number(scoreA) !== Number(scoreB) && (
                <div className="winner-preview">
                  <Trophy size={16} />
                  <span>
                    Winner:{" "}
                    <strong>
                      {Number(scoreA) > Number(scoreB)
                        ? "Team A"
                        : "Team B"}
                    </strong>
                  </span>
                </div>
              )}

            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={closeResultModal}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                onClick={saveResult}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save result"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default Matches;