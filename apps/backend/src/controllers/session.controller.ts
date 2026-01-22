// apps/backend/src/controllers/session.controller.ts
import { Request, Response } from "express";
import { createInterviewSession } from "../services/interview.service.js";

export const startSession = async (_req: Request, res: Response) => {
  console.log("🚀 Creating new interview session...");

  const session = await createInterviewSession();

  console.log("✅ Session created:", session.sessionId);

  res.status(201).json({
    sessionId: session.sessionId,
  });
};
