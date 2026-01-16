import { Request, Response } from "express";
import { createInterviewSession } from "../services/interview.service.js";

export const startSession = async (_req: Request, res: Response) => {
  const session = await createInterviewSession();

  res.status(201).json({
    sessionId: session.sessionId
  });
};
