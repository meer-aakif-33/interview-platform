export interface Transcript {
  speaker: "AGENT" | "CANDIDATE";
  text: string;
}

export interface InterviewSessionState {
  sessionId: string;
  question: string;
  code: string;
  transcripts: Transcript[];
  startedAt: string;
}

export const sessions = new Map<string, InterviewSessionState>();
