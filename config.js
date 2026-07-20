// Purpose: Frontend runtime API endpoint configuration.
export const chessMastersBackend = import.meta.env.VITE_BACKEND 
|| "http://localhost:3000";

export const webRtcIceServers = (() => {
  const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
  const turnUrls = import.meta.env.VITE_TURN_URLS;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrls && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrls.split(",").map((url) => url.trim()).filter(Boolean),
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return { iceServers };
})();
