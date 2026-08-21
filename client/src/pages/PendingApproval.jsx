import { Clock3, LogOut, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

function PendingApproval() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="pending-approval-page">
      <div className="pending-approval-card">
        <div className="pending-approval-icon"><Clock3 size={28} /></div>
        <span className="eyebrow">ACCOUNT REVIEW</span>
        <h1>Waiting for admin approval</h1>
        <p>Your email has been verified, but an admin must approve your player account before you can access the dashboard.</p>
        {email && <div className="pending-approval-email">{email}</div>}
        <div className="pending-approval-note"><ShieldCheck size={16} /> You will be able to sign in after approval.</div>
        <button className="secondary-button" onClick={signOut}><LogOut size={16} /> Back to sign in</button>
      </div>
    </div>
  );
}

export default PendingApproval;