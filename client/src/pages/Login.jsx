import { ArrowRight, KeyRound, Trophy, UserPlus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isRegistering = mode === "register";

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setPassword("");
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isRegistering && !name.trim()) {
      setError("Enter your name.");
      return;
    }

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    if (!password.trim()) {
      setError("Enter your password.");
      return;
    }

    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const endpoint = isRegistering ? "/auth/register" : "/auth/login";
      const payload = isRegistering
        ? { name: name.trim(), email: email.trim(), password: password.trim() }
        : { email: email.trim(), password: password.trim() };

      const response = await api.post(endpoint, payload);
      const { token, user } = response.data;

      if (user.role !== "admin" && user.approved !== true) {
        navigate("/pending-approval", {
          state: { email: user.email, name: user.name },
        });
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify({ ...user, approved: true }));

      if (isRegistering) {
        setSuccess("Account created successfully.");
      }

      navigate(user.role === "admin" ? "/admin" : "/player", { replace: true });
    } catch (submitError) {
      if (submitError.response?.data?.code === "ACCOUNT_PENDING_APPROVAL") {
        navigate("/pending-approval", {
          state: { email: email.trim(), name },
        });
        return;
      }

      setError(submitError.response?.data?.message || "Unable to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-modern">
      <div className="login-brand-panel">
        <div className="login-brand"><div className="login-brand-mark"><Trophy size={22} /></div><div><strong>SHUTTLE</strong><span>Match Manager</span></div></div>
        <div className="login-hero"><span className="login-kicker">BADMINTON • MATCHES • SETTLEMENTS</span><h1>Every match.<br />Every score.<br />Accounted for.</h1><p>A simple way to manage your daily doubles games, ₹5 stakes and end-of-day settlements.</p></div>
        <div className="login-brand-footer"><span>Private match management</span><span>v1.0</span></div>
      </div>

      <div className="login-form-panel">
        <div className="login-form-container">
          <div className="mobile-login-brand"><div className="login-brand-mark"><Trophy size={20} /></div><strong>SHUTTLE</strong></div>
          <div className="login-heading"><span className="eyebrow">{isRegistering ? "PLAYER REGISTRATION" : "SHUTTLE ACCESS"}</span><h2>{isRegistering ? "Create your account" : "Welcome back"}</h2><p>{isRegistering ? "Create a player account with your email and password." : "Sign in with your email and password."}</p></div>

          <div className="auth-mode-switch" role="tablist" aria-label="Authentication mode">
            <button type="button" className={mode === "login" ? "auth-mode-active" : ""} onClick={() => switchMode("login")}>Sign in</button>
            <button type="button" className={mode === "register" ? "auth-mode-active" : ""} onClick={() => switchMode("register")}><UserPlus size={14} /> Create account</button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {isRegistering && <div><label htmlFor="name">Full name</label><input id="name" type="text" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} disabled={loading} autoComplete="name" /></div>}
            <div><label htmlFor="email">Email address</label><input id="email" type="email" placeholder="you@badminton.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} autoComplete="email" /></div>
            <div><label htmlFor="password">Password</label><div className="password-input"><input id="password" type="password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} autoComplete={isRegistering ? "new-password" : "current-password"} /><KeyRound size={16} /></div></div>
            {error && <div className="login-error">{error}</div>}
            {success && <div className="login-success">{success}</div>}
            <button className="login-submit" disabled={loading}><span>{loading ? (isRegistering ? "Creating account..." : "Signing in...") : (isRegistering ? "Create account" : "Sign in")}</span>{!loading && <ArrowRight size={17} />}</button>
          </form>

          <p className="login-security"><KeyRound size={13} /> Use your email and password to continue</p>
        </div>
      </div>
    </div>
  );
}

export default Login;