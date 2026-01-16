import { Router } from "express";
import { AccessToken } from "livekit-server-sdk";

const router = Router();

router.post("/token", async (req, res) => {
  console.log(" /api/livekit/token hit");
  console.log("Request body:", req.body);

  const { sessionId, identity } = req.body;

  if (!sessionId || !identity) {
    return res.status(400).json({
      error: "sessionId and identity are required",
      received: req.body,
    });
  }

  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity,
      ttl: "1h",
    }
  );

  token.addGrant({
    room: sessionId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  // 👇 IMPORTANT: await the JWT
  const jwt = await token.toJwt();

  console.log("Generated JWT token:");
  // console.log(jwt);
  console.log("Token type:", typeof jwt);
  // console.log("Token parts count:", jwt.split(".").length);

  const response = {
    token: jwt,
    url: process.env.LIVEKIT_URL,
  };

  console.log("Sending response to frontend:", response);

  res.json(response);
});

export default router;
