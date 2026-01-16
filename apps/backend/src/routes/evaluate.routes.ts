import { Router } from "express";
import { evaluateInterview } from "../controllers/evaluate.controller.js";

const router = Router();

router.post("/", evaluateInterview);

export default router;
