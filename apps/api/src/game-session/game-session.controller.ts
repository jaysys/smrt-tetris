import type {
  ApiResponse,
  CreateGameSessionData,
  CreateGameSessionRequest
} from "@tetris/shared-types";
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { successResponse } from "../common/api-response";
import { GameSessionService } from "./game-session.service";

@Controller("v1/game-sessions")
export class GameSessionController {
  constructor(private readonly gameSessionService: GameSessionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createSession(
    @Body() payload: CreateGameSessionRequest
  ): ApiResponse<CreateGameSessionData> {
    const session = this.gameSessionService.createSession(payload);
    return successResponse(session);
  }
}
