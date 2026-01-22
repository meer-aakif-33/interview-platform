// apps/backend/src/app.ts

import express from "express";
import cors from "cors";

import sessionRoutes from "./routes/session.routes.js";
import evaluateRoutes from "./routes/evaluate.routes.js";
import livekitRoutes from "./routes/livekit.js";

const app = express();

app.use((req, _res, next) => {
  console.log(` ${req.method} ${req.url}`);
  next();
});

app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

app.use("/api/livekit", livekitRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/evaluate", evaluateRoutes);

export default app;
  