import {
  LayoutDashboard,
  Users,
  Trophy,
  WalletCards,
  History,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

function AppShell({ children }) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userString = localStorage.getItem("user");

  const user = (() => {
    try {
      return userString ? JSON.parse(userString) : null;
    } catch {
      return null;
    }
  })();

  const isAdmin = user?.role === "admin";
  const navigation = isAdmin ? [
    {
      label: "Overview",
      path: "/admin",
      icon: LayoutDashboard,
    },
    {
      label: "Players",
      path: "/admin/players",
      icon: Users,
    },
    {
      label: "Matches",
      path: "/admin/matches",
      icon: Trophy,
    },
    {
      label: "Settlement",
      path: "/admin/settlement",
      icon: WalletCards,
    },
    {
      label: "History",
      path: "/admin/history",
      icon: History,
    },
  ] : [
    {
      label: "Overview",
      path: "/player",
      icon: LayoutDashboard,
    },
    {
      label: "Settlement",
      path: "/player/settlement",
      icon: WalletCards,
    },
    {
      label: "History",
      path: "/player/history",
      icon: History,
    },
    {
      label: "Statistics",
      path: "/player/statistics",
      icon: BarChart3,
    },
  ];

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  return (
    <div className="app-shell">
      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${
          mobileOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Trophy size={20} />
          </div>

          <div>
            <div className="brand-name">
              SHUTTLE
            </div>

            <div className="brand-subtitle">
              Match Manager
            </div>
          </div>

          <button
            className="mobile-close"
            type="button"
            aria-label="Close navigation menu"
            onClick={() =>
              setMobileOpen(false)
            }
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">
            {isAdmin ? "MANAGEMENT" : "PLAYER AREA"}
          </div>

          <nav className="sidebar-nav">
            {navigation.map(
              (item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/admin"}
                    onClick={() =>
                      setMobileOpen(false)
                    }
                    className={({ isActive }) =>
                      `sidebar-link ${
                        isActive
                          ? "sidebar-link-active"
                          : ""
                      }`
                    }
                  >
                    <Icon size={19} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              }
            )}
          </nav>
        </div>

        {isAdmin && <div className="sidebar-section">
          <div className="sidebar-label">
            SYSTEM
          </div>

          <nav className="sidebar-nav">
            <NavLink
              to="/admin/history"
              className={({ isActive }) =>
                `sidebar-link ${
                  isActive
                    ? "sidebar-link-active"
                    : ""
                }`
              }
            >
              <History size={19} />
              <span>History</span>
            </NavLink>

            <button
              className="sidebar-link sidebar-link-button"
              type="button"
            >
              <Settings size={19} />
              <span>Settings</span>
            </button>
          </nav>
        </div>}

        <div className="sidebar-bottom">
          <div className="admin-profile">
            <div className="avatar">
              {(user?.name || "A")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="admin-info">
              <strong>
                {user?.name || "Administrator"}
              </strong>

              <span>{isAdmin ? "Administrator" : "Player"}</span>
            </div>
          </div>

          <button
            className="logout-link"
            onClick={logout}
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="top-header">
          <button
            className="mobile-menu"
            type="button"
            aria-label="Open navigation menu"
            onClick={() =>
              setMobileOpen(true)
            }
          >
            <Menu size={22} />
          </button>

          <div className="header-spacer" />

          <div className="header-profile">
            <div className="header-avatar">
              {(user?.name || "A")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {user?.name || (isAdmin ? "Admin" : "Player")}
              </strong>

              <span>{isAdmin ? "Admin" : "Player"}</span>
            </div>
          </div>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;