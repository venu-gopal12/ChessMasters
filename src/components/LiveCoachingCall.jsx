import React, { useEffect, useRef, useState } from "react";
import { webRtcIceServers } from "../../config.js";

function LiveCoachingCall({ socket, room, enabled, isInitiator }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerReadyRef = useRef(false);
  const [callActive, setCallActive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [status, setStatus] = useState("Start call when both participants are in the room.");

  const createPeerConnection = () => {
    const peerConnection = new RTCPeerConnection(webRtcIceServers);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket && room) {
        socket.emit("coachIceCandidate", { room, candidate: event.candidate });
      }
    };

    peerConnection.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    localStreamRef.current?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  };

  const createOffer = async () => {
    if (!socket || !room || !localStreamRef.current) return;
    const peerConnection = peerConnectionRef.current || createPeerConnection();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("coachCallOffer", { room, offer });
    setStatus("Calling opponent...");
  };

  const startCall = async () => {
    if (!socket || !room) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setCallActive(true);
      setMicOn(true);
      setCameraOn(true);
      setStatus("Waiting for the other participant...");
      socket.emit("coachCallReady", { room });
      if (isInitiator && peerReadyRef.current) await createOffer();
    } catch (error) {
      console.error("Unable to start coaching call:", error);
      setStatus("Camera or microphone permission was denied.");
    }
  };

  const endCall = (notifyPeer = true) => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallActive(false);
    setStatus("Call ended.");
    if (notifyPeer && socket && room) socket.emit("coachCallEnded", { room });
  };

  useEffect(() => {
    if (!socket || !room || !enabled) return undefined;

    const handlePeerReady = async () => {
      peerReadyRef.current = true;
      setStatus("Other participant is ready.");
      if (isInitiator && localStreamRef.current) await createOffer();
    };

    const handleOffer = async ({ offer }) => {
      if (!localStreamRef.current) await startCall();
      const peerConnection = peerConnectionRef.current || createPeerConnection();
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("coachCallAnswer", { room, answer });
      setStatus("Connected.");
    };

    const handleAnswer = async ({ answer }) => {
      if (!peerConnectionRef.current) return;
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      setStatus("Connected.");
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (!peerConnectionRef.current || !candidate) return;
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Unable to add ICE candidate:", error);
      }
    };

    const handleEnded = () => endCall(false);

    socket.on("coachCallPeerReady", handlePeerReady);
    socket.on("coachCallOffer", handleOffer);
    socket.on("coachCallAnswer", handleAnswer);
    socket.on("coachIceCandidate", handleIceCandidate);
    socket.on("coachCallEnded", handleEnded);

    return () => {
      socket.off("coachCallPeerReady", handlePeerReady);
      socket.off("coachCallOffer", handleOffer);
      socket.off("coachCallAnswer", handleAnswer);
      socket.off("coachIceCandidate", handleIceCandidate);
      socket.off("coachCallEnded", handleEnded);
    };
  }, [socket, room, enabled, isInitiator]);

  useEffect(() => () => endCall(false), []);

  const toggleMic = () => {
    const next = !micOn;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicOn(next);
    socket?.emit("coachCallStatus", { room, status: { micOn: next } });
  };

  const toggleCamera = () => {
    const next = !cameraOn;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCameraOn(next);
    socket?.emit("coachCallStatus", { room, status: { cameraOn: next } });
  };

  if (!enabled) return null;

  return (
    <div className="bg-brand-surface/95 backdrop-blur-sm rounded-xl shadow-2xl p-4 mb-4 border border-brand-accent/30">
      <h2 className="text-lg font-bold text-brand-ink mb-3">Live Video Call</h2>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-black rounded-lg overflow-hidden aspect-video">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        </div>
        <div className="bg-black rounded-lg overflow-hidden aspect-video">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        </div>
      </div>
      <p className="text-sm text-brand-muted mb-3">{status}</p>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={callActive ? () => endCall(true) : startCall}
          className={`px-3 py-2 rounded-lg text-white text-sm font-medium ${callActive ? "bg-brand-danger hover:bg-red-700" : "bg-brand-success hover:bg-green-800"}`}
        >
          {callActive ? "End" : "Start"}
        </button>
        <button
          onClick={toggleMic}
          disabled={!callActive}
          className="px-3 py-2 rounded-lg bg-brand-action disabled:bg-brand-surfaceAlt disabled:text-brand-muted text-white text-sm font-medium"
        >
          {micOn ? "Mute" : "Unmute"}
        </button>
        <button
          onClick={toggleCamera}
          disabled={!callActive}
          className="px-3 py-2 rounded-lg bg-brand-action disabled:bg-brand-surfaceAlt disabled:text-brand-muted text-white text-sm font-medium"
        >
          {cameraOn ? "Camera Off" : "Camera On"}
        </button>
      </div>
    </div>
  );
}

export default LiveCoachingCall;




