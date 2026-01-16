import { Request, Response } from "express";
import { sessions } from "../services/session.store.js";

export const appendTranscript = (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { speaker, text } = req.body;

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  session.transcripts.push({ speaker, text });
  res.json({ success: true });
};

export const updateCode = (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { code } = req.body;

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  session.code = code;
  res.json({ success: true });
};
