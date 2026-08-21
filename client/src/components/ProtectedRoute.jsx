import { Navigate } from "react-router-dom";

function ProtectedRoute({
  children,
  adminOnly = false,
}) {
  const token = localStorage.getItem("token");
  const userString = localStorage.getItem("user");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const user = (() => {
    try {
      return userString ? JSON.parse(userString) : null;
    } catch {
      return null;
    }
  })();

  if (user?.role === "player" && user?.approved !== true) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/pending-approval" replace />;
  }

  if (adminOnly && user?.role !== "admin") {
    return <Navigate to="/player" replace />;
  }

  return children;
}

export default ProtectedRoute;