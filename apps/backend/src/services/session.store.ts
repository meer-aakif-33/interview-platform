// apps/backend/src/services/session.store.ts
export interface Transcript {
  speaker: "AGENT" | "CANDIDATE";
  text: string;
}

export interface InterviewSessionState {
  sessionId: string;
  question: string;
  currentProblemId: number;
  problemsAttempted: number[];
  code: string;
  transcripts: Transcript[];
  startedAt: string;
}

export const sessions = new Map<string, InterviewSessionState>();

export function addSession(session: InterviewSessionState) {
  console.log("🗂 Creating session in store:", session.sessionId);
  sessions.set(session.sessionId, session);
}

export function getSession(sessionId: string) {
  const session = sessions.get(sessionId);
  console.log(
    session
      ? `📦 Session found: ${sessionId}`
      : `❌ Session NOT found: ${sessionId}`
  );
  return session;
}
