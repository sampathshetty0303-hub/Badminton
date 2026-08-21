import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./index.css";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import PlayerDashboard from "./pages/PlayerDashboard";
import Players from "./pages/Players";
import Matches from "./pages/Matches";
import Settlement from "./pages/Settlement";
import History from "./pages/History";
import PendingApproval from "./pages/PendingApproval";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================================================== */}
        {/* LOGIN */}
        {/* ================================================== */}

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/pending-approval"
          element={<PendingApproval />}
        />

        {/* ================================================== */}
        {/* ADMIN DASHBOARD */}
        {/* ================================================== */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* ================================================== */}
        {/* PLAYER MANAGEMENT */}
        {/* ================================================== */}

        <Route
          path="/admin/players"
          element={
            <ProtectedRoute adminOnly>
              <Players />
            </ProtectedRoute>
          }
        />

        {/* ================================================== */}
        {/* MATCHES */}
        {/* ================================================== */}

        <Route
          path="/admin/matches"
          element={
            <ProtectedRoute adminOnly>
              <Matches />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/settlement"
          element={
            <ProtectedRoute adminOnly>
              <Settlement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/history"
          element={
            <ProtectedRoute adminOnly>
              <History />
            </ProtectedRoute>
          }
        />

        {/* ================================================== */}
        {/* PLAYER DASHBOARD */}
        {/* ================================================== */}

        <Route
          path="/player"
          element={
            <ProtectedRoute>
              <PlayerDashboard />
            </ProtectedRoute>
          }
        />

        {/* ================================================== */}
        {/* DEFAULT */}
        {/* ================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;