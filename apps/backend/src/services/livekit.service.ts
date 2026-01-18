// apps/backend/src/services/livekit.service.ts
import { AccessToken } from "livekit-server-sdk";

export function createToken(identity: string, room: string) {
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    { identity }
  );

  token.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
  });

  return token.toJwt();
}
