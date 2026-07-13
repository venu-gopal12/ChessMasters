import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, DollarSign, Languages, MapPin, Star } from "lucide-react";
import { chessMastersBackend } from "../../config.js";

const CARD_STYLES = [
  {
    avatar: "from-brand-action to-brand-surfaceAlt",
    border: "hover:border-brand-accent",
    button: "group-hover:bg-brand-actionHover",
    pill: "bg-brand-surfaceAlt text-brand-ink",
  },
  {
    avatar: "from-brand-action to-brand-surfaceAlt",
    border: "hover:border-brand-accent",
    button: "group-hover:bg-brand-actionHover",
    pill: "bg-brand-surfaceAlt text-brand-ink",
  },
  {
    avatar: "from-brand-action to-brand-surfaceAlt",
    border: "hover:border-brand-accent",
    button: "group-hover:bg-brand-actionHover",
    pill: "bg-brand-surfaceAlt text-brand-ink",
  },
  {
    avatar: "from-brand-success to-brand-action",
    border: "hover:border-brand-accent",
    button: "group-hover:bg-brand-actionHover",
    pill: "bg-brand-surfaceAlt text-brand-ink",
  },
];

const Coachprofile = () => {
  const [coachData, setCoachData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const response = await axios.get(`${chessMastersBackend}/coach/coaches`, {
          withCredentials: true,
        });

        setCoachData(response.data);
        if (response.data.length === 0) setError("No coaches available at the moment");
      } catch (error) {
        console.error("Error fetching coach data:", error);
        if (error.response?.status === 404) setError("No coaches available at the moment");
        else setError("Unable to load coach profiles. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchCoaches();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-72 animate-pulse rounded-lg border border-brand-accent/30 bg-brand-surface p-5 shadow-sm">
            <div className="mb-5 h-14 w-14 rounded-md bg-brand-surfaceAlt" />
            <div className="mb-3 h-5 w-2/3 rounded bg-brand-surfaceAlt" />
            <div className="mb-6 h-4 w-full rounded bg-brand-surfaceAlt" />
            <div className="space-y-3">
              <div className="h-4 w-4/5 rounded bg-brand-surfaceAlt" />
              <div className="h-4 w-3/5 rounded bg-brand-surfaceAlt" />
              <div className="h-4 w-2/5 rounded bg-brand-surfaceAlt" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <motion.div
          className="mx-auto max-w-lg rounded-lg border-l-4 border-brand-accent bg-brand-surface p-8 shadow-md"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="mb-3 text-center text-2xl font-bold text-brand-ink">
            {error === "No coaches available at the moment" ? "No Coaches Found" : "Something Went Wrong"}
          </h2>
          <p className="text-center text-brand-muted">
            {error === "No coaches available at the moment"
              ? "There are currently no coaches available. Please check back later."
              : "We are having trouble loading coach profiles. Please try again later."}
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-brand-action px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-actionHover"
            >
              Refresh Page
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {coachData.map((coach, index) => {
        const user = coach.user || {};
        const style = CARD_STYLES[index % CARD_STYLES.length];
        const initials = (user.UserName || "Coach")
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        return (
          <motion.div
            key={coach._id}
            className={`group overflow-hidden rounded-lg border border-brand-accent/30 bg-brand-surface shadow-md transition hover:-translate-y-1 hover:bg-brand-surfaceAlt ${style.border} hover:shadow-xl`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.04 }}
          >
            <button
              className="flex h-full w-full flex-col text-left focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
              onClick={() => navigate(`/Coachdash/${coach._id}`)}
            >
              <div className="p-5">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${style.avatar} text-lg font-bold text-white shadow-md`}>
                      {initials}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-brand-ink">{user.UserName || "Unknown Coach"}</h2>
                      <p className="text-sm text-brand-ink/80">{coach.Fide_id ? `FIDE ${coach.Fide_id}` : "Chess coach"}</p>
                    </div>
                  </div>
                  <div className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold ${style.pill}`}>
                    <Star className="h-4 w-4 fill-current" />
                    {coach.rating || "N/A"}
                  </div>
                </div>

                <p className="mb-5 min-h-[48px] rounded-md bg-brand-surfaceAlt p-3 text-sm leading-6 text-brand-muted">
                  {coach.quote || coach.aboutMe || "Focused chess coaching for practical improvement."}
                </p>

                <div className="space-y-3 text-sm text-brand-muted">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-brand-ink" />
                    <span>{coach.location || "Location not set"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-brand-ink" />
                    <span>{coach.languages?.length ? coach.languages.join(", ") : "Languages not set"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-brand-ink" />
                    <span>{coach.teachingExperience || "Teaching experience not set"}</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-brand-accent/30 pt-4">
                  <div className="flex items-center gap-1 text-lg font-bold text-brand-ink">
                    <DollarSign className="h-5 w-5 text-brand-ink" />
                    {coach.hourlyRate || "N/A"}
                    <span className="text-sm font-medium text-brand-muted">/hr</span>
                  </div>
                  <span className={`rounded-lg bg-brand-action px-3 py-2 text-sm font-medium text-white transition ${style.button}`}>
                    View Profile
                  </span>
                </div>
              </div>
            </button>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default Coachprofile;





