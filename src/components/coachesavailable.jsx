import React from "react";
import Coachprofile from "./Coachprofile";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";

const CoachesAvailable = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-page to-brand-pageAlt px-4 py-6 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto w-full max-w-7xl"
      >
        <div className="mb-6 overflow-hidden rounded-lg border-l-4 border-brand-accent bg-brand-surface shadow-md">
          <div className="flex flex-col gap-6 px-5 py-6 sm:px-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <button
              onClick={() => navigate("/Index?role=player")}
              className="mb-5 inline-flex items-center gap-2 rounded-lg bg-brand-action px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-brand-actionHover"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">
              Find a Chess Coach
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-muted sm:text-base">
              Choose a coach for lessons, subscribed content, and live practice games.
            </p>
          </div>

          <div className="flex w-full items-center gap-3 rounded-lg border border-brand-accent/40 bg-brand-surfaceAlt px-3 py-3 shadow-sm lg:max-w-sm">
            <Search className="h-4 w-4 text-brand-ink" />
            <span className="text-sm font-medium text-brand-ink">Browse all available coaches</span>
          </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.3 }}>
          <Coachprofile />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default CoachesAvailable;






