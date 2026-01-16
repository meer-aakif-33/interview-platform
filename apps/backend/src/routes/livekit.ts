import { Router } from "express";
import { AccessToken } from "livekit-server-sdk";

const router = Router();

router.post("/token", (req, res) => {
  const { sessionId, identity } = req.body;

  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity,
      ttl: "1h"
    }
  );

  token.addGrant({
    room: sessionId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true
  });

  res.json({
    token: token.toJwt(),
    url: process.env.LIVEKIT_URL
  });
});

export default router;
