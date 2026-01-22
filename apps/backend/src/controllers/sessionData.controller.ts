import { getSession, sessions } from "../services/session.store.js";
import { Request, Response } from "express";

export const getCode = (req: Request, res: Response) => {
  const { sessionId } = req.params;
  console.log("📥 Fetching code for session:", sessionId);

  const session = getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json({ code: session.code });
};

export const appendTranscript = (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { speaker, text } = req.body;

  console.log("📝 Transcript received:");
  console.log("   Session:", sessionId);
  console.log("   Speaker:", speaker);
  console.log("   Text:", text);

  const session = sessions.get(sessionId);
  if (!session) {
    console.error("❌ Session not found for transcript:", sessionId);
    return res.status(404).json({ error: "Session not found" });
  }

  session.transcripts.push({ speaker, text });

  console.log("📚 Total transcripts now:", session.transcripts.length);

  res.json({ success: true });
};

export const updateCode = (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { code } = req.body;

  console.log("💻 Updating code:");
  console.log("   Session:", sessionId);
  console.log("   Code length:", code?.length);

  const session = getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  session.code = code;
  res.json({ success: true });
};
