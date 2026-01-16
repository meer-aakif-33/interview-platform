import { v4 as uuidv4 } from "uuid";
import { sessions } from "./session.store.js";

export const createInterviewSession = async () => {
  const sessionId = uuidv4();

  const session = {
    sessionId,
    question:
      "Given an array of integers, return indices of two numbers that add up to a target.",
    code: "",
    transcripts: [],
    startedAt: new Date().toISOString()
  };

  sessions.set(sessionId, session);
  return { sessionId };
};
