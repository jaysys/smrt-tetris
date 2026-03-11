import type {
  CreateGameSessionData,
  CreateGameSessionRequest
} from "@tetris/shared-types";
import { Injectable } from "@nestjs/common";
import { randomBytes, randomUUID } from "node:crypto";

@Injectable()
export class GameSessionService {
  createSession(request: CreateGameSessionRequest): CreateGameSessionData {
    return {
      sessionId: `gs_${randomUUID().replaceAll("-", "").slice(0, 16)}`,
      mode: request.mode,
      seed: randomBytes(3).toString("hex"),
      issuedAt: new Date().toISOString(),
      configVersion: 1,
      timeLimitSec: null,
      rules: {
        holdEnabled: true,
        ghostEnabledDefault: true,
        nextQueueSize: 5
      }
    };
  }
}
