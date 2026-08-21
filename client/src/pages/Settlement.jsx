import { ArrowRight, CheckCircle2, CircleDollarSign, Clock3, History as HistoryIcon, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";

import AppShell from "../components/AppShell";
import api from "../services/api";

function PaymentList({ payments, onMarkPaid }) {
  if (payments.length === 0) return <div className="empty-state"><h3>All players are even</h3><p>No payment is required for this session.</p></div>;
  return <div className="payment-list">{payments.map((payment) => <div className="payment-row" key={payment._id}><div><strong>{payment.fromPlayer?.name || "Player"}</strong><small>pays</small></div><ArrowRight size={17} /><div><strong>{payment.toPlayer?.name || "Player"}</strong><small>receives</small></div><b>₹{payment.amount}</b><span className={`payment-status payment-status-${payment.status}`}>{payment.status === "verified" ? "Paid" : "Pending"}</span>{payment.status !== "verified" && <button className="table-action success" onClick={() => onMarkPaid(payment._id)} title="Mark payment as paid"><CheckCircle2 size={15} /></button>}</div>)}</div>;
}

function Settlement() {
  const [day, setDay] = useState(null);
  const [balance, setBalance] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [payments, setPayments] = useState([]);
  const [settlementHistory, setSettlementHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadSettlement = async () => {
    try {
      setLoading(true);
      setError("");
      const [dayResponse, settlementsResponse] = await Promise.all([api.get("/days/current"), api.get("/settlements")]);
      const currentDay = dayResponse.data;
      const historicalSettlements = Array.isArray(settlementsResponse.data) ? settlementsResponse.data : [];
      const historyWithPayments = await Promise.all(historicalSettlements.map(async (historicalSettlement) => {
        const response = await api.get(`/payments/settlement/${historicalSettlement._id}`);
        return { settlement: historicalSettlement, payments: Array.isArray(response.data) ? response.data : [] };
      }));

      setDay(currentDay || null);
      setSettlementHistory(historyWithPayments);
      if (currentDay?._id) {
        const response = await api.get(`/settlements/day/${currentDay._id}`);
        setBalance(response.data);
        setSettlement(null);
        setPayments([]);
      } else {
        const latest = historicalSettlements[0] || null;
        setSettlement(latest);
        if (latest?._id) {
          const settledDayId = latest.day?._id || latest.day;
          if (settledDayId) {
            const balanceResponse = await api.get(`/settlements/day/${settledDayId}`);
            setBalance(balanceResponse.data);
          }
          setPayments(historyWithPayments[0]?.payments || []);
        } else {
          setBalance(null);
          setPayments([]);
        }
      }
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Unable to load settlement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadSettlement, 0);
    return () => clearTimeout(timer);
  }, []);

  const markPaymentPaid = async (paymentId) => {
    try {
      setError("");
      const response = await api.put(`/payments/${paymentId}/verify`);
      const updatedPayment = response.data.payment;
      setPayments((current) => current.map((payment) => payment._id === paymentId ? updatedPayment : payment));
      setSettlementHistory((current) => current.map((item) => ({ ...item, payments: item.payments.map((payment) => payment._id === paymentId ? updatedPayment : payment) })));
      setMessage("Payment marked as paid.");
    } catch (paymentError) {
      setError(paymentError.response?.data?.message || "Unable to mark payment as paid.");
    }
  };

  const closeDay = async () => {
    try {
      setClosing(true);
      setError("");
      const response = await api.put("/days/close");
      const createdSettlement = response.data.settlement;
      const createdPayments = Array.isArray(response.data.payments) ? response.data.payments : [];
      setSettlement(createdSettlement);
      setPayments(createdPayments);
      setDay(response.data.day || null);
      setSettlementHistory((current) => [{ settlement: createdSettlement, payments: createdPayments }, ...current.filter((item) => item.settlement._id !== createdSettlement._id)]);
      setMessage("Day closed and settlement created.");
    } catch (closeError) {
      setError(closeError.response?.data?.message || "Unable to close day.");
    } finally {
      setClosing(false);
    }
  };

  if (loading) return <AppShell><div className="loading-page"><div className="spinner" /><span>Loading settlement...</span></div></AppShell>;

  const paidSettlements = settlementHistory.filter((item) => item.payments.every((payment) => payment.status === "verified"));
  const pendingSettlements = settlementHistory.filter((item) => item.payments.some((payment) => payment.status !== "verified"));
  const renderHistory = (items) => items.map((item) => <details key={item.settlement._id} className="settlement-history-item"><summary><span>{item.settlement.day?.date ? new Date(item.settlement.day.date).toLocaleDateString("en-IN") : "Closed session"}</span><strong>{item.payments.filter((payment) => payment.status === "verified").length}/{item.payments.length} paid</strong></summary><PaymentList payments={item.payments} onMarkPaid={markPaymentPaid} /></details>);

  return <AppShell>
    <div className="page-header"><div><div className="eyebrow">SETTLEMENT</div><h1>Daily settlement</h1><p>Players send payment proof by WhatsApp. Admin confirms payments here.</p></div>{day && <div className="date-pill"><Clock3 size={16} /> Session {day.status === "open" ? "open" : "closed"}</div>}</div>
    {error && <div className="alert alert-error">{error}</div>}
    {message && <div className="alert alert-success">{message}</div>}

    {balance && <section className="panel settlement-page-panel"><div className="panel-header"><div><span className="panel-kicker">CURRENT BALANCES</span><h2>Who owes what</h2></div><div className="panel-icon"><CircleDollarSign size={20} /></div></div>{balance.balances.length === 0 ? <div className="empty-state small"><h3>No matches played</h3><p>Closing this session will create a settlement with no payment obligations.</p></div> : <div className="settlement-table">{balance.balances.map((entry) => <div className="settlement-row" key={entry.playerId}><strong>{entry.playerName}</strong><span className={entry.amount > 0 ? "settlement-credit" : entry.amount < 0 ? "settlement-debit" : "settlement-even"}>{entry.amount > 0 ? `Gets ₹${entry.amount}` : entry.amount < 0 ? `Pays ₹${Math.abs(entry.amount)}` : "Even"}</span></div>)}</div>}<div className="settlement-footer"><span>{balance.matchesPlayed} completed matches at ₹{balance.betAmount} per player</span>{day?.status === "open" && <button className="primary-button" onClick={closeDay} disabled={closing}><LockKeyhole size={16} />{closing ? "Closing day..." : "Close day and create payments"}</button>}</div></section>}

    {settlement && <section className="panel settlement-page-panel payment-plan-panel"><div className="panel-header"><div><span className="panel-kicker">PAYMENT PLAN</span><h2>Who pays whom</h2><p className="payment-help">Verify WhatsApp proof, then mark each payment as paid.</p></div><div className="panel-icon"><CheckCircle2 size={20} /></div></div><PaymentList payments={payments} onMarkPaid={markPaymentPaid} /></section>}

    <section className="panel settlement-page-panel settlement-history-panel"><div className="panel-header"><div><span className="panel-kicker">ARCHIVE</span><h2>Settlement history</h2></div><div className="panel-icon"><HistoryIcon size={20} /></div></div>{settlementHistory.length === 0 ? <div className="empty-state"><h3>No settlement history</h3><p>Closed sessions will appear here.</p></div> : <div className="settlement-history-groups"><div className="settlement-history-group settlement-history-pending"><h3>Pending payments</h3>{pendingSettlements.length === 0 ? <p className="history-group-empty">No pending settlements.</p> : <div className="settlement-history-list">{renderHistory(pendingSettlements)}</div>}</div><div className="settlement-history-group settlement-history-paid"><h3>Fully paid</h3>{paidSettlements.length === 0 ? <p className="history-group-empty">No fully paid settlements yet.</p> : <div className="settlement-history-list">{renderHistory(paidSettlements)}</div>}</div></div>}</section>
  </AppShell>;
}

export default Settlement;
