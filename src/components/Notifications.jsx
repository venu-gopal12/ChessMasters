import React, { useEffect, useState } from "react";
import { chessMastersBackend } from "../../config.js";

const Notifications = () => {
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
    <main className="min-h-screen bg-brand-bg px-4 py-8 text-brand-text">
      <section className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <button
            className="rounded bg-brand-action px-3 py-2 text-sm text-white"
            onClick={async () => {
              await fetch(`${chessMastersBackend}/notifications/read-all`, { method: "PATCH", credentials: "include" });
              loadNotifications();
            }}
          >
            Mark all read
          </button>
        </div>
        {message && <p className="mb-3 rounded border border-brand-border bg-brand-surface p-3">{message}</p>}
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <p className="rounded border border-brand-border bg-brand-surface p-4">No notifications yet.</p>
          ) : notifications.map((notification) => (
            <article key={notification._id} className="rounded border border-brand-border bg-brand-surface p-4">
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
                <a className="mt-3 inline-block text-sm underline" href={notification.link}>
                  Open
                </a>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Notifications;
