// apps/frontend/app/interview/page.tsx
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
  const [transcripts, setTranscripts] = useState<
    { speaker: "AGENT" | "CANDIDATE"; text: string }[]
  >([]);
  const [liveTranscript, setLiveTranscript] = useState<{
    speaker: "AGENT" | "CANDIDATE";
    text: string;
  } | null>(null);

  // Sync code to backend
  useEffect(() => {
    if (!sessionId) return;

    const timeout = setTimeout(() => {
      fetch(`http://localhost:4000/api/session/${sessionId}/code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [code, sessionId]);

  useEffect(() => {
    if (!sessionId) router.push("/");
  }, [sessionId, router]);

  if (!sessionId) return null;

const submitEvaluation = async () => {
  console.log("🧪 Submitting evaluation for session:", sessionId);

  const res = await fetch("http://localhost:4000/api/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });

  console.log("📊 Evaluation HTTP status:", res.status);

  // Read raw text first for debugging
  const text = await res.text();
  console.log("📊 Raw evaluation response:", text);

  if (!text) {
    throw new Error("Empty response from evaluation API");
  }

  let report;
  try {
    report = JSON.parse(text);
  } catch (err) {
    console.error("Invalid JSON:", text);
    throw err;
  }

  console.log("📊 Evaluation report:", report);

  sessionStorage.setItem("interviewReport", JSON.stringify(report));
  router.push("/results");
};



  return (
    <div className="h-screen flex flex-col">
      <div className="h-12 border-b px-4 flex items-center justify-between">
        <span className="font-medium">
          Live Coding Interview
        </span>
        <span className="text-sm text-gray-500">
          Session: {sessionId}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r">
          <CodeEditorPanel
            code={code}
            onChange={setCode}
          />
        </div>

        <div className="w-1/2 flex flex-col">
          <TranscriptPanel
            transcripts={transcripts}
            liveTranscript={liveTranscript}
          />

          <VoiceAgentPanel
            sessionId={sessionId}
            onEnd={submitEvaluation}
            onPartialTranscript={(speaker, text) =>
              setLiveTranscript({ speaker, text })
            }
            onFinalTranscript={(speaker, text) => {
              setLiveTranscript(null);
              setTranscripts((prev) => [
                ...prev,
                { speaker, text }
              ]);
            }}
          />
        </div>
      </div>
    </div>
  );
}
