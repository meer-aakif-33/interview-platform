// apps/backend/src/services/evaluation.service.ts
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY!
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
    .replace(/\/\/ Write your solution here/gi, "")
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
You are an expert technical interviewer analyzing a coding interview.

Provide DETAILED, SPECIFIC feedback with EVIDENCE from the code and conversation.

Return ONLY valid JSON with this schema:

{
  "overallScore": number (1-10),
  "strengths": [
    {
      "aspect": string,
      "evidence": string (quote from code or transcript),
      "explanation": string
    }
  ],
  "improvements": [
    {
      "issue": string,
      "evidence": string (quote from code or transcript),
      "suggestion": string
    }
  ],
  "transcriptMistakes": [
    {
      "transcriptIndex": number,
      "speaker": "CANDIDATE" | "AGENT",
      "quote": string,
      "issue": string,
      "betterResponse": string
    }
  ],
  "codeAnalysis": {
    "correctness": string (detailed analysis),
    "bugs": [
      {
        "lineNumber": number,
        "line": string (code snippet),
        "issue": string,
        "fix": string
      }
    ],
    "timeComplexity": string,
    "spaceComplexity": string,
    "missingEdgeCases": string[]
  },
  "communicationAnalysis": {
    "clarity": string (with examples from transcript),
    "thinkingProcess": string,
    "questionAsking": string
  },
  "nextSteps": string[]
}

IMPORTANT:
- For bugs, include the actual LINE NUMBER (estimate based on typical code structure)
- For transcriptMistakes, include the TRANSCRIPT INDEX (1-based) from the conversation
- Quote EXACT text from code and transcripts
- Be SPECIFIC, not generic
`;

export async function runEvaluation(input: Input) {
  const participated = hasAnyParticipation(input);

  if (!participated) {
    return {
      overallScore: 1,
      strengths: [],
      improvements: [
        {
          issue: "No participation",
          evidence: "No code written, no verbal communication",
          suggestion: "Try solving even partially and explain your thought process"
        }
      ],
      codeAnalysis: {
        correctness: "No code submitted",
        bugs: [],
        timeComplexity: "N/A",
        spaceComplexity: "N/A",
        missingEdgeCases: []
      },
      communicationAnalysis: {
        clarity: "No communication observed",
        thinkingProcess: "Not demonstrated",
        questionAsking: "No questions asked"
      },
      nextSteps: [
        "Practice thinking out loud while coding",
        "Start with simple examples",
        "Ask clarifying questions"
      ]
    };
  }

  const response = await openai.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: `
Problem:
${input.question}

Candidate's Code:
\`\`\`
${input.code || "(No code written)"}
\`\`\`

Full Conversation Transcript:
${input.transcripts.length
            ? input.transcripts.map((t, i) => `[${i + 1}] ${t.speaker}: ${t.text}`).join("\n")
            : "(No conversation)"
          }

Analyze THOROUGHLY with specific evidence.
`
      }
    ],
    temperature: 0.3,
  });

  const text = response.choices[0]?.message?.content;

  if (!text) {
    throw new Error("Groq returned no text");
  }

  const result = extractJSON(text);

  if (!result) {
    throw new Error("Failed to extract JSON from Groq response");
  }

  return result;
}