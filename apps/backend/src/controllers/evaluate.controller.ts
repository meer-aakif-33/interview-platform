import { Request, Response } from "express";
import { runEvaluation } from "../services/evaluation.service.js";
import { sessions } from "../services/session.store.js";

export const evaluateInterview = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    console.log("🧪 Evaluate requested for:", sessionId);
    console.log("🗂 Current sessions:", [...sessions.keys()]);

    const session = sessions.get(sessionId);
    if (!session) {
      console.error("❌ Session not found at evaluation time:", sessionId);
      return res.status(404).json({ error: "Session not found" });
    }

    console.log("📤 Calling runEvaluation with:", {
      codeLength: session.code.length,
      transcriptCount: session.transcripts.length,
      question: session.question,
    });

    const report = await runEvaluation({
      code: session.code,
      transcripts: session.transcripts,
      question: session.question,
    });

    console.log("📊 Evaluation report generated:", report);

    console.log("🧹 Deleting session after evaluation:", sessionId);
    sessions.delete(sessionId);

    console.log("📨 Sending evaluation response to frontend");
    return res.json(report);   // ← IMPORTANT: return it

  } catch (err) {
    console.error("❌ Evaluation failed:", err);
    return res.status(500).json({
      error: "Evaluation failed",
      message: err instanceof Error ? err.message : "Unknown error"
    });
  }
};
