import {
  UserCheck,
  UserX,
  Phone,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "../services/api";
import AppShell from "../components/AppShell";

function Players() {
  const [players, setPlayers] = useState([]);
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ============================
  // LOAD PLAYERS
  // ============================
  const loadPlayers = async () => {
    try {
      setLoading(true);
      setError("");

      const [playersResponse, pendingResponse] = await Promise.all([
        api.get("/players"),
        api.get("/admin/pending-users"),
      ]);
      setPlayers(playersResponse.data);
      setPendingAccounts(Array.isArray(pendingResponse.data) ? pendingResponse.data : []);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Failed to load players."
      );
    } finally {
      setLoading(false);
    }
  };

  const approveAccount = async (account) => {
    try {
      setUpdatingId(account._id);
      setError("");
      const response = await api.put(`/admin/users/${account._id}/approve`);
      setPendingAccounts((current) => current.filter((item) => item._id !== account._id));
      setSuccess(`${response.data.user.name} can now sign in.`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve account.");
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadPlayers(), 0);
    return () => clearTimeout(timer);
  }, []);

  // ============================
  // MODAL
  // ============================
  // ============================
  // ACTIVATE PLAYER
  // ============================
  const activatePlayer = async (player) => {
    try {
      setUpdatingId(player._id);
      setError("");
      setSuccess("");

      const response = await api.put(`/players/${player._id}`, {
        isActive: true,
      });

      setPlayers((current) =>
        current.map((item) =>
          item._id === player._id
            ? response.data.player
            : item
        )
      );

      setSuccess(`${player.name} activated.`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to activate player."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // ============================
  // DEACTIVATE PLAYER
  // (NO CONFIRMATION POPUP)
  // ============================
  const deactivatePlayer = async (player) => {
    try {
      setUpdatingId(player._id);
      setError("");
      setSuccess("");

      const response = await api.delete(`/players/${player._id}`);

      setPlayers((current) =>
        current.map((item) =>
          item._id === player._id
            ? response.data.player
            : item
        )
      );

      setSuccess(`${player.name} deactivated.`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to deactivate player."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // ============================
  // HELPERS
  // ============================
  const getInitials = (name) => {
    const words = name.trim().split(" ");

    if (words.length === 1)
      return words[0].substring(0, 2).toUpperCase();

    return (
      words[0][0] +
      words[words.length - 1][0]
    ).toUpperCase();
  };

  const activeCount = players.filter(
    (p) => p.isActive
  ).length;

  const inactiveCount = players.filter(
    (p) => !p.isActive
  ).length;

  // ============================
  // UI
  // ============================
  return (
    <AppShell>
      <div className="main-content">

        {/* HEADER */}
        <div className="page-header">
          <div>
            <span className="eyebrow">
              PLAYER MANAGEMENT
            </span>

            <h1>Players</h1>

            <p>
              Manage players available for today's badminton matches.
            </p>
          </div>

          <span className="date-pill">Registration approval required</span>
        </div>

        {/* ALERTS */}
        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {pendingAccounts.length > 0 && (
          <section className="panel pending-accounts-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">APPROVAL QUEUE</span>
                <h2>New player accounts</h2>
              </div>
              <span className="badge badge-warning">{pendingAccounts.length} pending</span>
            </div>
            <div className="pending-account-list">
              {pendingAccounts.map((account) => (
                <div className="pending-account-row" key={account._id}>
                  <div>
                    <strong>{account.name}</strong>
                    <span>{account.email}</span>
                  </div>
                  <button className="primary-button compact" onClick={() => approveAccount(account)} disabled={updatingId === account._id}>
                    <UserCheck size={15} />
                    {updatingId === account._id ? "Approving..." : "Approve"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SUMMARY */}
        <div className="players-layout">

          <div className="panel add-player-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">
                  OVERVIEW
                </span>

                <h2>Player Summary</h2>
              </div>

              <Users size={20} />
            </div>

            <div className="day-meta">
              <div>
                <span>Total</span>
                <strong>{players.length}</strong>
              </div>

              <div>
                <span>Active</span>
                <strong>{activeCount}</strong>
              </div>

              <div>
                <span>Inactive</span>
                <strong>{inactiveCount}</strong>
              </div>

              <div>
                <span>Available Today</span>
                <strong>{activeCount}</strong>
              </div>
            </div>

            <p className="approval-note">Players appear here after account registration and admin approval. Activate them below to make them available for matches.</p>
          </div>

          {/* PLAYERS */}
          <div className="panel players-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">
                  DIRECTORY
                </span>

                <h2>All Players</h2>
              </div>

              <span className="player-count">
                {players.length} Players
              </span>
            </div>

            {loading ? (
              <div className="loading-page inline">
                <div className="spinner" />
                <span>Loading players...</span>
              </div>
            ) : players.length === 0 ? (
              <div className="empty-state">
                <Users size={30} />
                <h3>No Players Found</h3>
                <p>Add your first player.</p>
              </div>
            ) : (
              <div className="players-list">
                {players.map((player) => (
                  <div
                    key={player._id}
                    className={`player-row ${
                      !player.isActive
                        ? "player-row-inactive"
                        : ""
                    }`}
                  >
                    <div className="player-avatar">
                      {getInitials(player.name)}
                    </div>

                    <div className="player-details">
                      <strong>{player.name}</strong>

                      <span>
                        <Phone size={11} />
                        {player.phone || "No phone number"}
                      </span>
                    </div>

                    <div className="player-status">
                      {player.isActive ? (
                        <span className="badge badge-success">
                          <span className="badge-dot" />
                          Active
                        </span>
                      ) : (
                        <span className="badge badge-neutral">
                          <span className="badge-dot" />
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="player-actions">
                      {player.isActive ? (
                        <button
                          className="icon-button icon-button-danger"
                          disabled={
                            updatingId === player._id
                          }
                          onClick={() =>
                            deactivatePlayer(player)
                          }
                        >
                          {updatingId === player._id ? (
                            "..."
                          ) : (
                            <UserX size={16} />
                          )}
                        </button>
                      ) : (
                        <button
                          className="icon-button icon-button-success"
                          disabled={
                            updatingId === player._id
                          }
                          onClick={() =>
                            activatePlayer(player)
                          }
                        >
                          {updatingId === player._id ? (
                            "..."
                          ) : (
                            <UserCheck size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </AppShell>
  );
}

export default Players;