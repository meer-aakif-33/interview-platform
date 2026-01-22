"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CodeEditorPanel from "@/components/interview/CodeEditorPanel";
import TranscriptPanel from "@/components/interview/TranscriptPanel";
import VoiceAgentPanel from "@/components/interview/VoiceAgentPanel";

export default function InterviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("sessionId");

  const [code, setCode] = useState("// Write your solution here");
  const [question, setQuestion] = useState("");
  const [callStarted, setCallStarted] = useState(false);

  const [transcripts, setTranscripts] = useState<
    { speaker: "AGENT" | "CANDIDATE"; text: string }[]
  >([]);

  const [liveTranscript, setLiveTranscript] = useState<{
    speaker: "AGENT" | "CANDIDATE";
    text: string;
  } | null>(null);

  /* ---------------- Detect question from first AGENT transcript ---------------- */
  useEffect(() => {
    const firstAgentMsg = transcripts.find(t => t.speaker === "AGENT");
    if (firstAgentMsg && !question) {
      console.log("🧠 Question detected:", firstAgentMsg.text);
      setQuestion(firstAgentMsg.text);
    }
  }, [transcripts, question]);

  /* ---------------- Sync code to backend ---------------- */
  // ✅ only sync after call starts and session is valid
  useEffect(() => {
    if (!sessionId || !callStarted) return;

    const timeout = setTimeout(() => {
      console.log("💾 Syncing code to backend:", sessionId);
      fetch(`http://localhost:4000/api/session/${sessionId}/code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [code, sessionId, callStarted]);


  /* ---------------- Redirect if no session ---------------- */
  useEffect(() => {
    if (!sessionId) router.push("/");
  }, [sessionId, router]);

  /* ---------------- Load transcript history on refresh ---------------- */
  useEffect(() => {
    if (!sessionId || !callStarted) return;

    async function loadHistory() {
      console.log("📚 Loading transcript history for:", sessionId);
      const res = await fetch(
        `http://localhost:4000/api/session/${sessionId}/transcripts`
      );
      const data = await res.json();
      console.log("📚 Loaded transcripts:", data.transcripts);
      setTranscripts(data.transcripts || []);
    }

    loadHistory();
  }, [sessionId, callStarted]);


  if (!sessionId) return null;

  /* ---------------- Evaluation ---------------- */
  const submitEvaluation = async () => {
    console.log("🧪 Submitting evaluation for session:", sessionId);

    const res = await fetch("http://localhost:4000/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    const text = await res.text();
    console.log("📊 Raw evaluation response:", text);

    const report = JSON.parse(text);
    sessionStorage.setItem("interviewReport", JSON.stringify(report));
    router.push("/results");
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="h-12 border-b px-4 flex items-center justify-between">
        <span className="font-medium">Live Coding Interview</span>
        <span className="text-sm text-gray-500">Session: {sessionId}</span>
      </div>

      {/* Question Panel */}
      {callStarted && question && (
        <div className="p-4 bg-blue-50 border-b">
          <p className="text-sm font-semibold text-blue-900">Problem</p>
          <p className="text-sm text-blue-800 mt-1">{question}</p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Code Editor */}
        <div className="w-1/2 border-r">
          <CodeEditorPanel code={code} onChange={setCode} />
        </div>

        {/* Transcript + Voice */}
        <div className="w-1/2 flex flex-col">
          <TranscriptPanel
            transcripts={transcripts}
            liveTranscript={liveTranscript}
          />

          <VoiceAgentPanel
            sessionId={sessionId}
            onCallStarted={() => {
              console.log("📞 Call started");
              setCallStarted(true); // ❌ DO NOT clear transcripts
            }}
            onEnd={submitEvaluation}
            onPartialTranscript={(speaker, text) =>
              setLiveTranscript({ speaker, text })
            }
            onFinalTranscript={(speaker, text) => {
              setLiveTranscript(null);
              setTranscripts(prev => [...prev, { speaker, text }]);
            }}
            onQuestionUpdate={(newQuestion) => {
              console.log("🔄 Question updated:", newQuestion);
              setQuestion(newQuestion);
            }}
          />
        </div>
      </div>
    </div>
  );
}
