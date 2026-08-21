import { ArrowRight, KeyRound, Trophy, UserPlus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isRegistering = mode === "register";

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setCodeSent(false);
    setCode("");
    setError("");
    setSuccess("");
  };

  const requestCode = async () => {
    if (isRegistering && !name.trim()) {
      setError("Enter your name.");
      return;
    }

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await api.post("/auth/request-otp", {
        name: name.trim(),
        email: email.trim(),
        purpose: mode,
      });
      setCodeSent(true);
      setSuccess(`A verification code was sent to ${email.trim()}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await api.post("/auth/verify-otp", {
        email: email.trim(),
        code: code.trim(),
        purpose: mode,
      });
      const { token, user } = response.data;

      if (user.role !== "admin" && user.approved !== true) {
        navigate("/pending-approval", {
          state: { email: user.email, name: user.name },
        });
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify({ ...user, approved: true }));
      navigate(user.role === "admin" ? "/admin" : "/player", { replace: true });
    } catch (verifyError) {
      if (verifyError.response?.data?.code === "ACCOUNT_PENDING_APPROVAL") {
        navigate("/pending-approval", {
          state: { email: email.trim(), name },
        });
        return;
      }
      setError(verifyError.response?.data?.message || "Unable to verify code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (codeSent) await verifyCode();
    else await requestCode();
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
          <div className="login-heading"><span className="eyebrow">{isRegistering ? "PLAYER REGISTRATION" : "SHUTTLE ACCESS"}</span><h2>{isRegistering ? "Create your account" : "Welcome back"}</h2><p>{isRegistering ? "Create a player account with your email." : "Use a one-time code to securely continue."}</p></div>

          <div className="auth-mode-switch" role="tablist" aria-label="Authentication mode">
            <button type="button" className={mode === "login" ? "auth-mode-active" : ""} onClick={() => switchMode("login")}>Sign in</button>
            <button type="button" className={mode === "register" ? "auth-mode-active" : ""} onClick={() => switchMode("register")}><UserPlus size={14} /> Create account</button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {isRegistering && !codeSent && <div><label htmlFor="name">Full name</label><input id="name" type="text" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} disabled={loading} autoComplete="name" /></div>}
            <div><label htmlFor="email">Email address</label><input id="email" type="email" placeholder="you@badminton.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading || codeSent} autoComplete="email" /></div>
            {codeSent && <div><label htmlFor="code">Verification code</label><div className="password-input"><input id="code" type="text" inputMode="numeric" maxLength={6} placeholder="Enter 6 digits" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} disabled={loading} autoComplete="one-time-code" /><KeyRound size={16} /></div></div>}
            {error && <div className="login-error">{error}</div>}
            {success && <div className="login-success">{success}</div>}
            <button className="login-submit" disabled={loading}><span>{loading ? (codeSent ? "Verifying..." : "Sending code...") : (codeSent ? "Verify and continue" : "Send verification code")}</span>{!loading && <ArrowRight size={17} />}</button>
          </form>

          {codeSent && <button type="button" className="change-email-button" onClick={() => { setCodeSent(false); setCode(""); setSuccess(""); setError(""); }} disabled={loading}>Use a different email</button>}
          <p className="login-security"><KeyRound size={13} /> Codes expire after 10 minutes</p>
        </div>
      </div>
    </div>
  );
}

export default Login;