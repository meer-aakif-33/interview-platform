//apps/frontend/app/components/interview/TranscriptPanel.tsx
"use client";

import { useEffect, useRef } from "react";

interface Transcript {
  speaker: "AGENT" | "CANDIDATE";
  text: string;
}

interface Props {
  transcripts: Transcript[];
  liveTranscript?: Transcript | null;
}

export default function TranscriptPanel({
  transcripts,
  liveTranscript,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts, liveTranscript]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
      {transcripts.map((t, i) => (
        <div key={i}>
          <span className="font-semibold">
            {t.speaker === "AGENT" ? "Interviewer" : "You"}:
          </span>{" "}
          <span>{t.text}</span>
        </div>
      ))}

      {liveTranscript && (
        <div className="opacity-60 italic">
          <span className="font-semibold">
            {liveTranscript.speaker === "AGENT" ? "Interviewer" : "You"}:
          </span>{" "}
          {liveTranscript.text}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

