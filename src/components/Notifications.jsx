// Purpose: React UI component for the Notifications experience.
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { chessMastersBackend } from "../../config.js";

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState("");

  const loadNotifications = async () => {
    try {
      const response = await fetch(`${chessMastersBackend}/notifications`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load notifications");
      setNotifications(data);
    } catch (error) {
      setMessage(error.message);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markRead = async (id) => {
    await fetch(`${chessMastersBackend}/notifications/${id}/read`, {
      method: "PATCH",
      credentials: "include",
    });
    loadNotifications();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-page via-brand-pageAlt to-black px-4 py-8 text-brand-ink">
      <section className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              className="rounded bg-brand-surfaceAlt px-3 py-2 text-sm text-brand-ink transition hover:bg-brand-accent"
              onClick={() => navigate(-1)}
            >
              Back
            </button>
            <h1 className="text-2xl font-semibold">Notifications</h1>
          </div>
          {notifications.length > 0 && (
            <button
              className="rounded bg-brand-action px-3 py-2 text-sm text-white"
              onClick={async () => {
                await fetch(`${chessMastersBackend}/notifications/read-all`, { method: "PATCH", credentials: "include" });
                loadNotifications();
              }}
            >
              Mark all read
            </button>
          )}
        </div>
        {message && <p className="mb-3 rounded border border-brand-accent/30 bg-brand-surface p-3">{message}</p>}
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <p className="rounded border border-brand-accent/30 bg-brand-surface p-4">No notifications yet.</p>
          ) : notifications.map((notification) => (
            <article key={notification._id} className="rounded border border-brand-accent/30 bg-brand-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{notification.title}</h2>
                  {notification.message && <p className="mt-1 text-sm opacity-80">{notification.message}</p>}
                </div>
                {!notification.readAt && (
                  <button className="rounded bg-brand-action px-3 py-1 text-sm text-white" onClick={() => markRead(notification._id)}>
                    Read
                  </button>
                )}
              </div>
              {notification.link && (
                <Link className="mt-3 inline-block text-sm underline" to={notification.link}>
                  Open
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Notifications;
