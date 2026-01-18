// apps/frontend/app/components/interview/VoiceAgentPanel.tsx
"use client";

import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  createLocalAudioTrack,
  ConnectionState,
} from "livekit-client";

interface Props {
  sessionId: string;
  onEnd: () => void;
  onPartialTranscript: (speaker: "AGENT" | "CANDIDATE", text: string) => void;
  onFinalTranscript: (speaker: "AGENT" | "CANDIDATE", text: string) => void;
}

export default function VoiceAgentPanel({
  sessionId,
  onEnd,
  onPartialTranscript,
  onFinalTranscript,
}: Props) {
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);

const startCall = async () => {
  console.log("🚀 Starting call for session:", sessionId);

  const res = await fetch("http://localhost:4000/api/livekit/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, identity: "candidate" }),
  });
  const data = await res.json();
  console.log("LiveKit response:", data);

  const { token, url } = data;

  if (typeof token !== "string") {
    console.error("Invalid token type:", token);
    throw new Error("LiveKit token must be a string");
  }

  console.log("🎟 Token parts:", token.split(".").length);
  console.log("🌍 LiveKit URL:", url);

  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  roomRef.current = room;

  // Connection lifecycle
  room.on(RoomEvent.ConnectionStateChanged, (state) => {
    console.log("🔌 Connection state:", state);
  });

  room.on(RoomEvent.Disconnected, (reason) => {
    console.log("❌ Disconnected from LiveKit:", reason);
  });

  room.on(RoomEvent.Reconnecting, () => {
    console.warn("⚠️ Reconnecting to LiveKit...");
  });

  room.on(RoomEvent.Reconnected, () => {
    console.log("✅ Reconnected to LiveKit");
  });

  // 🔊 AUDIO TRACK SUBSCRIPTION - ADD THIS
  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    console.log("🎵 Track subscribed:", track.kind, "from", participant.identity);
    
    if (track.kind === "audio") {
      const audioElement = track.attach();
      document.body.appendChild(audioElement);
      console.log("🔊 Audio element attached and playing");
    }
  });

  room.on(RoomEvent.TrackPublished, (publication, participant) => {
    console.log("📢 Track published:", publication.kind, "from", participant.identity);
  });

  console.log("🔗 Connecting to LiveKit...");
  await room.connect(url, token);
  console.log("✅ Connected to LiveKit");

  console.log("🎤 Creating local mic track...");
  const micTrack = await createLocalAudioTrack();
  await room.localParticipant.publishTrack(micTrack);
  console.log("🎙 Mic published");

  // Debug participants
  room.on(RoomEvent.ParticipantConnected, (p) => {
    console.log("👤 Participant joined:", p.identity);
  });

  room.on(RoomEvent.ParticipantDisconnected, (p) => {
    console.log("👤 Participant left:", p.identity);
  });

  // Debug data messages
  room.on(RoomEvent.DataReceived, (payload) => {
    const decoded = new TextDecoder().decode(payload);
    console.log("📩 Raw DataReceived:", decoded);

    const msg = JSON.parse(decoded);
    console.log("📨 Parsed message:", msg);

    if (msg.type === "transcript") {
      if (msg.final) {
        console.log("🧾 Final transcript:", msg.text);
        onFinalTranscript(msg.speaker, msg.text);

        fetch(`http://localhost:4000/api/session/${sessionId}/transcript`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            speaker: msg.speaker,
            text: msg.text,
          }),
        }).then(() => console.log("💾 Transcript saved to backend"));
      } else {
        console.log("✏️ Partial transcript:", msg.text);
        onPartialTranscript(msg.speaker, msg.text);
      }
    }

    if (msg.type === "control" && msg.action === "INTERVIEW_ENDED") {
      console.warn("🛑 Interview ended by agent");
      room.disconnect();
      setConnected(false);
      onEnd();
    }
  });

  setConnected(true);
  console.log("🟢 Call fully initialized");
};

  const toggleMute = () => {
    if (!roomRef.current) return;
    roomRef.current.localParticipant.setMicrophoneEnabled(muted);
    setMuted(!muted);
    console.log(muted ? "🔊 Mic unmuted" : "🔇 Mic muted");
  };

  const endCall = async () => {
    console.warn("🛑 Ending call manually");

    if (roomRef.current) {
      await roomRef.current.localParticipant.publishData(
        new TextEncoder().encode(
          JSON.stringify({ type: "control", action: "END_INTERVIEW" })
        ),
        { reliable: true }
      );

      console.log("📤 Sent END_INTERVIEW signal to agent");

      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    setConnected(false);
    onEnd();
  };

  return (
    <div className="h-20 border-t flex items-center justify-center gap-6">
      {!connected ? (
        <button
          onClick={startCall}
          className="px-4 py-2 rounded bg-black text-white"
        >
          Start Call
        </button>
      ) : (
        <>
          <button onClick={toggleMute} className="p-3 rounded-full border">
            {muted ? <MicOff /> : <Mic />}
          </button>

          <button
            onClick={endCall}
            className="p-3 rounded-full bg-red-600 text-white"
          >
            <PhoneOff />
          </button>
        </>
      )}
    </div>
  );
}
