// Purpose: React UI component for the Request Password Reset experience.
import React, { useState } from "react";
import { chessMastersBackend } from "../../config.js";

const RequestPasswordReset = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${chessMastersBackend}/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to request reset");
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-bg px-4 py-12 text-brand-text">
      <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <input
          className="w-full rounded border border-brand-border bg-brand-surface px-3 py-2"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
        />
        <button disabled={loading} className="w-full rounded bg-brand-action px-4 py-2 text-white disabled:opacity-60">
          {loading ? "Sending..." : "Send reset link"}
        </button>
        {message && <p className="rounded border border-brand-border bg-brand-surface p-3">{message}</p>}
      </form>
    </main>
  );
};

export default RequestPasswordReset;
