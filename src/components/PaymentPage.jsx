// Purpose: React UI component for the Payment Page experience.
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { chessMastersBackend } from "../../config.js";

const PaymentPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { coachId, plan } = state || {};
  const [coachName, setCoachName] = useState("Coach");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!coachId || plan !== "Standard") {
      navigate("/CoachesAvailable", { replace: true });
      return;
    }
    axios.get(`${chessMastersBackend}/coach/${coachId}`)
      .then(response => setCoachName(response.data?.user?.UserName || "Coach"))
      .catch(() => setCoachName("Coach"));
  }, [coachId, navigate, plan]);

  const confirmSubscription = async () => {
    setSubmitting(true);
    setError("");
    try {
      await axios.post(
        `${chessMastersBackend}/player/subscribe`,
        { coachId, plan },
        { withCredentials: true }
      );
      navigate("/CoachesAvailable", { state: { subscribed: true } });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Subscription could not be activated.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-page to-brand-pageAlt flex items-center justify-center p-4">
      <section className="bg-brand-surface rounded-2xl shadow-xl p-8 w-full max-w-md text-brand-ink border border-brand-accent/30">
        <h1 className="text-3xl font-bold text-center text-brand-ink mb-5">
          Confirm subscription
        </h1>
        <p className="text-center mb-4">
          Standard plan with <strong>{coachName}</strong> for 30 days.
        </p>
        <p className="rounded-lg border border-brand-accent/40 bg-brand-accentSoft p-3 text-sm text-brand-muted mb-6">
          Demo billing mode: no card information is collected. Connect a PCI-compliant payment
          provider before enabling real charges.
        </p>
        <button
          type="button"
          onClick={confirmSubscription}
          disabled={submitting}
          className="w-full rounded-md bg-brand-action px-4 py-3 font-semibold text-white hover:bg-brand-actionHover disabled:opacity-50"
        >
          {submitting ? "Activating..." : "Activate demo subscription"}
        </button>
        {error && <p className="mt-4 text-center text-brand-danger">{error}</p>}
      </section>
    </div>
  );
};

export default PaymentPage;





