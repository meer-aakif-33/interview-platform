// apps/backend/src/services/evaluation.service.ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!
});

interface Input {
  code: string;
  transcripts: any[];
  question: string;
}

function extractJSON(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found");
  return JSON.parse(match[0]);
}

function hasMeaningfulCode(code: string) {
  if (!code) return false;

  // Remove whitespace and common placeholders
  const cleaned = code
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();

  // Very small code usually means no real attempt
  return cleaned.length > 10;
}


function hasMeaningfulAnswers(transcripts: any[]) {
  return transcripts.some(
    (t) =>
      t.speaker === "CANDIDATE" &&
      typeof t.text === "string" &&
      t.text.trim().length > 3
  );
}

function hasAnyParticipation(input: Input) {
  return (
    hasMeaningfulAnswers(input.transcripts) ||
    hasMeaningfulCode(input.code)
  );
}

const SYSTEM_PROMPT = `
You must return ONLY valid JSON.
Do not include markdown. Do not include explanations outside JSON.

If the candidate:
- Spoke but did not write code → focus on coding gaps.
- Wrote code but spoke very little → focus on communication.
- Did neither → be direct and state lack of participation.
- Did both → provide full evaluation.

Do NOT hallucinate strengths if no real attempt exists.

Use this exact schema:

{
  "strengths": string[],
  "improvements": string[],
  "missingEdgeCases": string[],
  "communication": string,
  "nextSteps": string[]
}
`;


export async function runEvaluation(input: Input) {
  const participated = hasAnyParticipation(input);

  if (!participated) {
    return {
      strengths: [],
      improvements: [
        "The candidate did not provide spoken answers or attempt to write code."
      ],
      missingEdgeCases: [],
      communication: "No communication or problem-solving attempt was observed.",
      nextSteps: [
        "Encourage the candidate to try solving even partially.",
        "Practice thinking out loud while coding.",
        "Start with small examples before attempting full solutions."
      ]
    };
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
${SYSTEM_PROMPT}

Question:
${input.question}

Code:
${input.code || "(No code written)"}

Transcript:
${
  input.transcripts.length
    ? input.transcripts.map((t) => `${t.speaker}: ${t.text}`).join("\n")
    : "(No transcript)"
}
`
  });

  const text =
    response.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned no text");
  }

  const result = extractJSON(text);

  if (!result) {
    throw new Error("Failed to extract JSON from Gemini response");
  }

  return result;
}
