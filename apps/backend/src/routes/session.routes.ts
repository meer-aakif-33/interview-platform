// apps/backend/src/routes/session.routes.ts
import { Router } from "express";
import { startSession } from "../controllers/session.controller.js";
import {
  appendTranscript,
  updateCode
} from "../controllers/sessionData.controller.js";

const router = Router();

router.post("/start", startSession);
router.post("/:sessionId/transcript", appendTranscript);
router.post("/:sessionId/code", updateCode);

export default router;
