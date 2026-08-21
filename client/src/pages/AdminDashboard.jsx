import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Users,
  Trophy,
  Plus,
  CheckCircle2,
  Clock3,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";
import AppShell from "../components/AppShell";

function AdminDashboard() {
  const navigate = useNavigate();

  const [day, setDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);

  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        dayResponse,
        playersResponse,
      ] = await Promise.all([
        api.get("/days/current"),
        api.get("/players"),
      ]);

      const currentDay =
        dayResponse.data;

      setDay(currentDay);

      setPlayers(
        Array.isArray(
          playersResponse.data
        )
          ? playersResponse.data
          : []
      );

      if (currentDay?._id) {
        try {
          const matchesResponse =
            await api.get(
              `/matches/day/${currentDay._id}`
            );

          setMatches(
            Array.isArray(
              matchesResponse.data
            )
              ? matchesResponse.data
              : []
          );
        } catch (matchError) {
          console.error(
            "Matches error:",
            matchError
          );

          setMatches([]);
        }
      } else {
        setMatches([]);
      }
    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  const openDay = async () => {
    try {
      setOpening(true);
      setError("");

      const response =
        await api.post(
          "/days/open"
        );

      setDay(response.data.day);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to open day"
      );
    } finally {
      setOpening(false);
    }
  };

  const today = new Date();

  const formattedDate =
    today.toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );

  // IMPORTANT:
  // Player model uses "isActive", not "active"
  const activePlayers =
    players.filter(
      (player) => player.isActive
    );

  const completedMatches =
    matches.filter(
      (match) =>
        match.status ===
        "completed"
    );

  const pendingMatches =
    matches.filter(
      (match) =>
        match.status !==
        "completed"
    );

  if (loading) {
    return (
      <AppShell>
        <div className="loading-page">
          <div className="spinner" />

          <span>
            Loading dashboard...
          </span>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="page-header">
        <div>
          <div className="eyebrow">
            ADMIN OVERVIEW
          </div>

          <h1>
            Good to see you.
          </h1>

          <p>
            Manage today's matches,
            players and settlements
            from one place.
          </p>
        </div>

        <div className="date-pill">
          <CalendarDays size={17} />

          {formattedDate}
        </div>
      </div>

      {/* ======================================================
          ERROR
          ====================================================== */}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* ======================================================
          STATS
          ====================================================== */}

      <div className="stats-grid">

        {/* Active Players */}

        <div className="stat-card">
          <div className="stat-icon">
            <Users size={20} />
          </div>

          <div className="stat-content">
            <span>
              Active players
            </span>

            <strong>
              {activePlayers.length}
            </strong>
          </div>

          <div className="stat-accent">
            <ArrowUpRight size={16} />
          </div>
        </div>

        {/* Matches */}

        <div className="stat-card">
          <div className="stat-icon">
            <Trophy size={20} />
          </div>

          <div className="stat-content">
            <span>
              Matches today
            </span>

            <strong>
              {matches.length}
            </strong>
          </div>

          <div className="stat-accent">
            <Activity size={16} />
          </div>
        </div>

        {/* Stake */}

        <div className="stat-card">
          <div className="stat-icon">
            <CircleDollarSign size={20} />
          </div>

          <div className="stat-content">
            <span>
              Bet per player
            </span>

            <strong>
              ₹5
            </strong>
          </div>

          <div className="stat-accent">
            <span>
              FIXED
            </span>
          </div>
        </div>

      </div>

      {/* ======================================================
          MAIN GRID
          ====================================================== */}

      <div className="dashboard-grid">

        {/* ====================================================
            MATCHES
            ==================================================== */}

        <section className="panel matches-panel">

          <div className="panel-header">
            <div>
              <span className="panel-kicker">
                TODAY
              </span>

              <h2>
                Matches
              </h2>
            </div>

            <button
              className="text-button"
              onClick={() =>
                navigate(
                  "/admin/matches"
                )
              }
            >
              View all

              <ArrowUpRight
                size={16}
              />
            </button>
          </div>

          {/* No matches */}

          {matches.length === 0 ? (
            <div className="empty-state">

              <div className="empty-state-icon">
                <Trophy size={24} />
              </div>

              <h3>
                No matches yet
              </h3>

              <p>
                Start today's session
                by creating the first
                doubles match.
              </p>

              {day?.status ===
                "open" && (
                <button
                  className="primary-button compact"
                  onClick={() =>
                    navigate(
                      "/admin/matches"
                    )
                  }
                >
                  <Plus size={16} />

                  Create match
                </button>
              )}

            </div>
          ) : (

            <div className="match-list">

              {matches
                .slice(0, 5)
                .map(
                  (
                    match,
                    index
                  ) => {

                    const teamA =
                      match.teamA
                        ?.map(
                          (player) =>
                            player.name
                        )
                        .join(
                          " + "
                        );

                    const teamB =
                      match.teamB
                        ?.map(
                          (player) =>
                            player.name
                        )
                        .join(
                          " + "
                        );

                    return (
                      <div
                        className="match-preview"
                        key={
                          match._id ||
                          index
                        }
                      >

                        <div className="match-number">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        <div className="match-teams">

                          <strong>
                            {teamA ||
                              "Team A"}
                          </strong>

                          <span>
                            vs
                          </span>

                          <strong>
                            {teamB ||
                              "Team B"}
                          </strong>

                        </div>

                        <div className="match-result">

                          {match.status ===
                          "completed" ? (
                            <>
                              <span className="match-score">
                                {match.scoreA}
                                {" - "}
                                {match.scoreB}
                              </span>

                              <span className="badge badge-success">
                                <CheckCircle2
                                  size={12}
                                />

                                Completed
                              </span>
                            </>
                          ) : (
                            <span className="badge badge-warning">
                              <Clock3
                                size={12}
                              />

                              Pending
                            </span>
                          )}

                        </div>

                      </div>
                    );
                  }
                )}

              {/* More matches */}

              {matches.length >
                5 && (
                <button
                  className="text-button dashboard-more"
                  onClick={() =>
                    navigate(
                      "/admin/matches"
                    )
                  }
                >
                  View{" "}
                  {matches.length -
                    5}{" "}
                  more matches

                  <ArrowUpRight
                    size={15}
                  />
                </button>
              )}

            </div>
          )}

        </section>

        {/* ====================================================
            SESSION
            ==================================================== */}

        <section className="panel day-panel">

          <div className="panel-header">
            <div>
              <span className="panel-kicker">
                SESSION
              </span>

              <h2>
                Today's day
              </h2>
            </div>
          </div>

          {day ? (

            <>

              {/* Status */}

              <div className="day-status">

                <div
                  className={
                    day.status ===
                    "open"
                      ? "status-dot"
                      : "status-dot closed"
                  }
                />

                <div>

                  <strong>
                    {day.status ===
                    "open"
                      ? "Session is open"
                      : "Session closed"}
                  </strong>

                  <span>
                    {day.status ===
                    "open"
                      ? "You can record matches."
                      : "Today's session is complete."}
                  </span>

                </div>

              </div>

              {/* Metadata */}

              <div className="day-meta">

                <div>
                  <span>
                    Date
                  </span>

                  <strong>
                    {new Date(
                      day.date
                    ).toLocaleDateString(
                      "en-IN"
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Matches
                  </span>

                  <strong>
                    {matches.length}
                  </strong>
                </div>

              </div>

              {/* Match progress */}

              <div className="session-progress">

                <div className="session-progress-header">

                  <span>
                    Match progress
                  </span>

                  <strong>
                    {
                      completedMatches.length
                    }
                    /
                    {
                      matches.length
                    }
                  </strong>

                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width:
                        matches.length
                          ? `${
                              (completedMatches.length /
                                matches.length) *
                              100
                            }%`
                          : "0%",
                    }}
                  />
                </div>

                <small>
                  {pendingMatches.length ===
                  0
                    ? matches.length
                      ? "All matches completed."
                      : "No matches recorded yet."
                    : `${pendingMatches.length} match${
                        pendingMatches.length ===
                        1
                          ? ""
                          : "es"
                      } waiting for result.`}
                </small>

              </div>

              {/* Actions */}

              <div className="day-actions">

                {day.status ===
                  "open" && (
                  <button
                    className="primary-button full"
                    onClick={() =>
                      navigate(
                        "/admin/matches"
                      )
                    }
                  >
                    <Trophy
                      size={17}
                    />

                    Manage matches
                  </button>
                )}

                <button
                  className="secondary-button full"
                  onClick={() =>
                    navigate(
                      "/admin/settlement"
                    )
                  }
                >
                  View settlement

                  <ArrowUpRight
                    size={17}
                  />
                </button>

              </div>

            </>

          ) : (

            <div className="empty-state small">

              <div className="empty-state-icon">
                <CalendarDays size={22} />
              </div>

              <h3>
                Today's session isn't
                open
              </h3>

              <p>
                Open the day when
                you're ready to start
                playing.
              </p>

              <button
                className="primary-button compact"
                onClick={openDay}
                disabled={opening}
              >
                {opening
                  ? "Opening..."
                  : "Open today's day"}
              </button>

            </div>

          )}

        </section>

      </div>
    </AppShell>
  );
}

export default AdminDashboard;