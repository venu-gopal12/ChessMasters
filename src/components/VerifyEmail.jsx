import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { chessMastersBackend } from "../../config.js";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Verifying email...");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setMessage("Verification token is missing.");
      return;
    }

    fetch(`${chessMastersBackend}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Email verification failed");
        setMessage(data.message || "Email verified successfully.");
      })
      .catch((error) => setMessage(error.message));
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-brand-bg px-4 py-12 text-brand-text">
      <section className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold">Email verification</h1>
        <p className="mt-4 rounded border border-brand-border bg-brand-surface p-4">{message}</p>
      </section>
    </main>
  );
};

export default VerifyEmail;
