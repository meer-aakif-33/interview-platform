// apps/backend/src/services/interview.service.ts
import { v4 as uuidv4 } from "uuid";
import { addSession, sessions } from "./session.store.js";

const PROBLEMS = [
  {
    id: 1,
    difficulty: "easy",
    question: "Given an array of integers, return indices of two numbers that add up to a target.",
    hints: ["Consider using a hash map", "Think about the time complexity"]
  },
  {
    id: 2,
    difficulty: "medium",
    question: "Given a binary tree, find its maximum depth.",
    hints: ["Think recursively", "Consider both left and right subtrees"]
  },
  {
    id: 3,
    difficulty: "medium",
    question: "Reverse a linked list in-place.",
    hints: ["Think about pointer manipulation", "Consider iterative vs recursive"]
  },
  {
    id: 4,
    difficulty: "hard",
    question: "Find the median of two sorted arrays.",
    hints: ["Binary search approach", "Think about merging"]
  }
];

export const createInterviewSession = async () => {
  const sessionId = uuidv4();
  
  // Start with an easy problem
  const initialProblem = PROBLEMS[0];

  const session = {
    sessionId,
    question: initialProblem.question,
    currentProblemId: initialProblem.id,
    problemsAttempted: [initialProblem.id],
    code: "",
    transcripts: [],
    startedAt: new Date().toISOString()
  };

  addSession(session);
  
  sessions.set(sessionId, session);
  
  return { sessionId, question: initialProblem.question };
};

export const getNextProblem = (sessionId: string) => {
  const session = sessions.get(sessionId);
  if (!session) return null;

  // Get problems not yet attempted
  const unattempted = PROBLEMS.filter(
    p => !session.problemsAttempted.includes(p.id)
  );

  if (unattempted.length === 0) {
    return null; // All problems done
  }

  // Pick next problem (could be random or difficulty-based)
  const nextProblem = unattempted[0];
  
  session.currentProblemId = nextProblem.id;
  session.problemsAttempted.push(nextProblem.id);
  session.question = nextProblem.question;

  return nextProblem;
};