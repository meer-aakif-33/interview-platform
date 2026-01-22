// apps/backend/src/routes/livekit.ts
import { Router } from "express";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

const router = Router();

const roomService = new RoomServiceClient(
  process.env.LIVEKIT_URL!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

router.post("/token", async (req, res) => {
  console.log("📞 /api/livekit/token hit");
    console.log("📦 Raw body:", req.body);

  const { sessionId, identity } = req.body;

  if (!sessionId || !identity) {
    return res.status(400).json({
      error: "sessionId and identity are required",
    });
  }

  try {
    // 1. Create room
    console.log("🏠 Creating room:", sessionId);
    
    try {
      await roomService.createRoom({
        name: sessionId,
        emptyTimeout: 300,
        maxParticipants: 10,
      });
      console.log("✅ Room created");
    } catch (err: any) {
      if (!err.message?.includes("already exists")) {
        throw err;
      }
      console.log("ℹ️  Room already exists");
    }

    // 2. 🚨 DISPATCH AGENT with proper admin token
    console.log("🤖 Dispatching agent to room:", sessionId);
    
    const livekitUrl = process.env.LIVEKIT_URL!.replace('wss://', 'https://');
    const dispatchUrl = `${livekitUrl}/twirp/livekit.AgentDispatchService/CreateDispatch`;
    
    // Create admin token with all permissions
    const authToken = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      { identity: "dispatch-service" }
    );
    
    // Add VideoGrant with admin permissions
    authToken.addGrant({
      roomAdmin: true,
      room: sessionId,
    });
    
    const authJwt = await authToken.toJwt();

    const dispatchResponse = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authJwt}`,
      },
      body: JSON.stringify({
        room: sessionId,
        agent_name: "interviewer-agent",
      }),
    });

    const dispatchText = await dispatchResponse.text();
    console.log("📡 Dispatch status:", dispatchResponse.status);
    console.log("📡 Dispatch response:", dispatchText);

    if (!dispatchResponse.ok) {
      console.error("❌ Agent dispatch failed");
    } else {
      console.log("✅ Agent dispatched!");
    }

    // 3. Generate token for candidate
    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      { identity, ttl: "1h" }
    );

    token.addGrant({
      room: sessionId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();

    res.json({
      token: jwt,
      url: process.env.LIVEKIT_URL,
    });

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ 
      error: "Failed to create token",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;