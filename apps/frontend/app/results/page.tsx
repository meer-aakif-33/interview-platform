"use client";

import { useEffect, useState } from "react";

type Report = {
  strengths: string[];
  improvements: string[];
  missingEdgeCases: string[];
  communication: string;
  nextSteps: string[];
};

function Section({
  title,
  items = []
}: {
  title: string;
  items?: string[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <h2 className="font-medium mb-2">{title}</h2>
      <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
        {items.map((i, idx) => (
          <li key={idx}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

export default function ResultsPage() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    const data = sessionStorage.getItem("interviewReport");
    if (!data) return;

    const raw = JSON.parse(data);

    // normalize defensively
    const normalized: Report = {
      strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
      improvements: Array.isArray(raw.improvements) ? raw.improvements : [],
      missingEdgeCases: Array.isArray(raw.missingEdgeCases)
        ? raw.missingEdgeCases
        : [],
      nextSteps: Array.isArray(raw.nextSteps) ? raw.nextSteps : [],
      communication:
        typeof raw.communication === "string" ? raw.communication : ""
    };

    setReport(normalized);
  }, []);

  if (!report) {
    return (
      <div className="p-8 text-center text-gray-500">
        No interview report found.
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold">Interview Feedback</h1>

      <Section title="What you did well" items={report.strengths} />
      <Section title="What could be improved" items={report.improvements} />
      <Section
        title="Missing edge cases"
        items={report.missingEdgeCases}
      />

      <div>
        <h2 className="font-medium mb-2">Communication</h2>
        <p className="text-sm text-gray-700">
          {report.communication || "No communication feedback provided."}
        </p>
      </div>

      <Section title="Next steps" items={report.nextSteps} />
    </div>
  );
}
