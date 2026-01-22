// apps/frontend/app/results/page.tsx
"use client";

import { useEffect, useState } from "react";

type Bug = {
  lineNumber?: number;
  line: string;
  issue: string;
  fix: string;
};

type Strength = {
  aspect: string;
  evidence: string;
  explanation: string;
};

type Improvement = {
  issue: string;
  evidence: string;
  suggestion: string;
};

type TranscriptMistake = {
  transcriptIndex: number;
  speaker: "CANDIDATE" | "AGENT";
  quote: string;
  issue: string;
  betterResponse: string;
};

type Report = {
  overallScore: number;
  strengths: Strength[];
  improvements: Improvement[];
  transcriptMistakes?: TranscriptMistake[];
  codeAnalysis: {
    correctness: string;
    bugs: Bug[];
    timeComplexity: string;
    spaceComplexity: string;
    missingEdgeCases: string[];
  };
  communicationAnalysis: {
    clarity: string;
    thinkingProcess: string;
    questionAsking: string;
  };
  nextSteps: string[];
};

export default function ResultsPage() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    const data = sessionStorage.getItem("interviewReport");
    if (!data) return;
    setReport(JSON.parse(data));
  }, []);

  if (!report) {
    return (
      <div className="p-8 text-center text-gray-500">
        No interview report found.
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Interview Feedback</h1>
        <div className="text-4xl font-bold text-blue-600">
          {report.overallScore}/10
        </div>
      </div>

      {/* Strengths */}
      {report.strengths?.length > 0 && (
        <section className="bg-green-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-green-900">✓ Strengths</h2>
          <div className="space-y-4">
            {report.strengths.map((s, i) => (
              <div key={i} className="bg-white p-4 rounded">
                <h3 className="font-medium text-green-800">{s.aspect}</h3>
                <p className="text-sm text-gray-600 italic mt-1">"{s.evidence}"</p>
                <p className="text-sm mt-2">{s.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Improvements */}
      {report.improvements?.length > 0 && (
        <section className="bg-orange-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-orange-900">⚠ Areas for Improvement</h2>
          <div className="space-y-4">
            {report.improvements.map((imp, i) => (
              <div key={i} className="bg-white p-4 rounded">
                <h3 className="font-medium text-orange-800">{imp.issue}</h3>
                <p className="text-sm text-gray-600 italic mt-1">"{imp.evidence}"</p>
                <p className="text-sm mt-2 text-green-700">💡 {imp.suggestion}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Transcript Mistakes */}
      {report.transcriptMistakes && report.transcriptMistakes.length > 0 && (
        <section className="bg-red-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-red-900">💬 Conversation Mistakes</h2>
          <div className="space-y-4">
            {report.transcriptMistakes.map((mistake, i) => (
              <div key={i} className="bg-white p-4 rounded border-l-4 border-red-500">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded">
                    Transcript #{mistake.transcriptIndex}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${mistake.speaker === 'CANDIDATE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                    {mistake.speaker}
                  </span>
                </div>
                <p className="text-sm text-gray-600 italic mb-2">"{mistake.quote}"</p>
                <p className="text-sm text-red-800 mb-2">❌ <strong>Issue:</strong> {mistake.issue}</p>
                <p className="text-sm text-green-700">✅ <strong>Better:</strong> {mistake.betterResponse}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Code Analysis */}
      <section className="bg-blue-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-blue-900">📝 Code Analysis</h2>

        <div className="space-y-3 bg-white p-4 rounded">
          <div>
            <span className="font-medium">Correctness:</span>
            <p className="text-sm mt-1">{report.codeAnalysis?.correctness}</p>
          </div>

          <div>
            <span className="font-medium">Time Complexity:</span>
            <span className="ml-2 text-sm font-mono">{report.codeAnalysis?.timeComplexity}</span>
          </div>

          <div>
            <span className="font-medium">Space Complexity:</span>
            <span className="ml-2 text-sm font-mono">{report.codeAnalysis?.spaceComplexity}</span>
          </div>
        </div>

        {report.codeAnalysis?.bugs?.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium text-red-700 mb-2">🐛 Bugs Found</h3>
            <div className="space-y-3">
              {report.codeAnalysis.bugs.map((bug, i) => (
                <div key={i} className="bg-red-50 p-3 rounded">
                  {bug.lineNumber && (
                    <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded mb-2 inline-block">
                      Line {bug.lineNumber}
                    </span>
                  )}
                  <code className="text-sm bg-gray-800 text-white px-2 py-1 rounded block mb-2">
                    {bug.line}
                  </code>
                  <p className="text-sm text-red-800">Issue: {bug.issue}</p>
                  <p className="text-sm text-green-700 mt-1">Fix: {bug.fix}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.codeAnalysis?.missingEdgeCases?.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Missing Edge Cases</h3>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {report.codeAnalysis.missingEdgeCases.map((ec, i) => (
                <li key={i}>{ec}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Communication Analysis */}
      <section className="bg-purple-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-purple-900">💬 Communication</h2>
        <div className="space-y-3 bg-white p-4 rounded text-sm">
          <div>
            <span className="font-medium">Clarity:</span>
            <p className="mt-1">{report.communicationAnalysis?.clarity}</p>
          </div>
          <div>
            <span className="font-medium">Thinking Process:</span>
            <p className="mt-1">{report.communicationAnalysis?.thinkingProcess}</p>
          </div>
          <div>
            <span className="font-medium">Question Asking:</span>
            <p className="mt-1">{report.communicationAnalysis?.questionAsking}</p>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      {report.nextSteps?.length > 0 && (
        <section className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">🎯 Next Steps</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            {report.nextSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}