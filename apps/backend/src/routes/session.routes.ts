// apps/backend/src/routes/session.routes.ts
import { Router } from "express";
import { startSession } from "../controllers/session.controller.js";
import {
  appendTranscript,
  updateCode,
  getCode,
} from "../controllers/sessionData.controller.js";
import { sessions } from "../services/session.store.js";

const router = Router();

router.post("/start", (req, res, next) => {
  console.log("\n🧠 POST /api/session/start");
  next();
}, startSession);

router.post("/:sessionId/transcript", (req, res, next) => {
  console.log(`\n📝 POST /api/session/${req.params.sessionId}/transcript`);
  console.log("📦 Body:", req.body);
  next();
}, appendTranscript);

router.post("/:sessionId/code", (req, res, next) => {
  console.log(`\n💻 POST /api/session/${req.params.sessionId}/code`);
  console.log("📦 Body:", req.body);
  next();
}, updateCode);

router.get("/:sessionId/code", (req, res, next) => {
  console.log(`\n📥 GET /api/session/${req.params.sessionId}/code`);
  next();
}, getCode);

router.get("/:sessionId/transcripts", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json({ transcripts: session.transcripts });
});

router.get("/:sessionId/next-problem", (req, res) => {
  console.log(`\n🔄 GET /api/session/${req.params.sessionId}/next-problem`);
  const { sessionId } = req.params;

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  // Import getNextProblem from interview.service
  const { getNextProblem } = require("../services/interview.service.js");
  const nextProblem = getNextProblem(sessionId);

  if (!nextProblem) {
    return res.json({ question: null, message: "No more problems" });
  }

  console.log(`✅ Next problem: ${nextProblem.question}`);
  res.json(nextProblem);
});


export default router;
