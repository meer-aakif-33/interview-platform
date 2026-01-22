// apps/frontend/app/components/interview/VoiceAgentPanel.tsx
"use client";

import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  createLocalAudioTrack,
} from "livekit-client";

interface Props {
  sessionId: string;
  onCallStarted: () => void;
  onEnd: () => void;
  onPartialTranscript: (speaker: "AGENT" | "CANDIDATE", text: string) => void;
  onFinalTranscript: (speaker: "AGENT" | "CANDIDATE", text: string) => void;
  onQuestionUpdate?: (question: string) => void;
}

export default function VoiceAgentPanel({
  sessionId,
  onCallStarted,
  onEnd,
  onPartialTranscript,
  onFinalTranscript,
  onQuestionUpdate,
}: Props) {
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);

  const startCall = async () => {
    console.log("🚀 Starting call for session:", sessionId);

    console.log("🎟 Requesting LiveKit token with payload:");
    const payload = {
      sessionId: sessionId,
      identity: "candidate",
    };
    console.log(payload);

    let res: Response;
    try {
      res = await fetch("http://localhost:4000/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId, identity: "candidate" }),
      });
    } catch (err) {
      console.error("❌ Network error while calling backend:", err);
      throw err;
    }

    console.log("🌐 HTTP status:", res.status);
    console.log("🌐 HTTP ok?:", res.ok);

    const rawText = await res.text();
    console.log("🧪 Raw backend response:", rawText);

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error("❌ Backend did not return valid JSON:", rawText);
      throw e;
    }

    console.log("📦 Parsed backend JSON:", data);

    const { token, url } = data;

    console.log("🔑 Extracted token:", token);
    console.log("🌍 Extracted url:", url);

    if (!token) {
      console.error("❌ Token is missing from backend response");
      console.error("Full response object:", data);
      throw new Error("Backend did not return a token field");
    }

    if (typeof token !== "string") {
      console.error("❌ Invalid token type:", typeof token, token);
      throw new Error("LiveKit token must be a string");
    }

    if (!url) {
      console.error("❌ LiveKit URL missing from backend response");
      throw new Error("Backend did not return LiveKit URL");
    }

    console.log("🎟 Token parts:", token.split(".").length);
    console.log("🌍 LiveKit URL:", url);

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    roomRef.current = room;

    /* ---------- Connection debug ---------- */
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

    /* ---------- Participant debug ---------- */
    room.on(RoomEvent.ParticipantConnected, (p) => {
      console.log("👤 Participant joined:", p.identity);
    });

    room.on(RoomEvent.ParticipantDisconnected, (p) => {
      console.log("👤 Participant left:", p.identity);
    });

    /* ---------- Track debug ---------- */
    room.on(RoomEvent.TrackPublished, (publication, participant) => {
      console.log(
        "📢 Track published:",
        publication.kind,
        "from",
        participant.identity
      );
    });

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log(
        "🎵 Track subscribed:",
        track.kind,
        "from",
        participant.identity
      );

      if (track.kind === "audio") {
        const audioEl = track.attach();
        document.body.appendChild(audioEl);
        console.log("🔊 Audio element attached and playing");
      }
    });
    async function saveTranscript(sessionId: string, speaker: string, text: string) {
      try {
        await fetch(`http://localhost:4000/api/session/${sessionId}/transcript`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ speaker, text }),
        });
      } catch (err) {
        console.error("❌ Failed to save transcript:", err);
      }
    }

    /* ---------- Data channel debug ---------- */
    room.on(RoomEvent.DataReceived, async (payload, participant) => {
      const decoded = new TextDecoder().decode(payload);
      console.log("📩 DataReceived event");
      console.log("   From:", participant?.identity);
      console.log("   Raw:", decoded);

      let msg;
      try {
        msg = JSON.parse(decoded);
      } catch {
        console.error("❌ Invalid JSON payload:", decoded);
        return;
      }

      console.log("📨 Parsed message:", msg);

      /* ----------- QUESTION UPDATE ----------- */
      if (msg.type === "question_update") {
        console.log("🔄 Question update received:", msg.question);
        if (onQuestionUpdate && msg.question) {
          onQuestionUpdate(msg.question);
        }
      }

      /* ----------- TRANSCRIPT HANDLING ----------- */
      if (msg.type === "transcript") {
        const speaker: "AGENT" | "CANDIDATE" =
          msg.speaker?.toUpperCase() === "AGENT" ? "AGENT" : "CANDIDATE";

        if (!msg.text) {
          console.warn("⚠️ Transcript without text:", msg);
          return;
        }
        // 🔥 Save to backend session store
        await saveTranscript(sessionId, speaker, msg.text);

        if (msg.final) {
          console.log("🧾 Final transcript:", speaker, msg.text);
          onFinalTranscript(speaker, msg.text);
        } else {
          console.log("✏️ Partial transcript:", speaker, msg.text);
          onPartialTranscript(speaker, msg.text);
        }
      }
      /* ----------- CONTROL MESSAGES ----------- */
      if (msg.type === "control" && msg.action === "INTERVIEW_ENDED") {
        console.warn("🛑 Interview ended by agent");
        room.disconnect();
        setConnected(false);
        onEnd();
      }

    });

    console.log("🔗 Connecting to LiveKit...");
    await room.connect(url, token);
    console.log("✅ Connected to LiveKit");

    console.log("🎤 Creating local mic track...");
    console.log("📢 Sending CLIENT_READY signal");
    await room.localParticipant.publishData(
      new TextEncoder().encode(
        JSON.stringify({ type: "control", action: "CLIENT_READY" })
      ),
      { reliable: true }
    );

    const micTrack = await createLocalAudioTrack();
    await room.localParticipant.publishTrack(micTrack);

    console.log("🎙 Mic published");

    setConnected(true);
    onCallStarted();
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
