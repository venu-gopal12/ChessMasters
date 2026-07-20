// Purpose: React UI component for the Reset Password experience.
import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { chessMastersBackend } from "../../config.js";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${chessMastersBackend}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token: searchParams.get("token"),
          newPassword,
          confirmPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to reset password");
      setMessage(data.message);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-bg px-4 py-12 text-brand-text">
      <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">Choose a new password</h1>
        <input
          className="w-full rounded border border-brand-border bg-brand-surface px-3 py-2"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="New password"
          minLength={6}
          required
        />
        <input
          className="w-full rounded border border-brand-border bg-brand-surface px-3 py-2"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm password"
          minLength={6}
          required
        />
        <button disabled={loading} className="w-full rounded bg-brand-action px-4 py-2 text-white disabled:opacity-60">
          {loading ? "Saving..." : "Save password"}
        </button>
        {message && <p className="rounded border border-brand-border bg-brand-surface p-3">{message}</p>}
      </form>
    </main>
  );
};

export default ResetPassword;
