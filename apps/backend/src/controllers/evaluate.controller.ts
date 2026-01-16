import { Request, Response } from "express";
import { runEvaluation } from "../services/evaluation.service.js";
import { sessions } from "../services/session.store.js";

export const evaluateInterview = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const report = await runEvaluation({
      code: session.code,
      transcripts: session.transcripts,
      question: session.question
    });

    sessions.delete(sessionId);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: "Evaluation failed" });
  }
};
