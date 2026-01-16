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

export async function runEvaluation(input: Input) {
  const SYSTEM_PROMPT = `
You must return ONLY valid JSON.

{
  "strengths": [],
  "improvements": [],
  "missingEdgeCases": [],
  "communication": "",
  "nextSteps": []
}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
${SYSTEM_PROMPT}

Question:
${input.question}

Code:
${input.code}

Transcript:
${input.transcripts
  .map((t) => `${t.speaker}: ${t.text}`)
  .join("\n")}
`
  });

  const text =
    response.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("No response text");

  return extractJSON(text);
}
