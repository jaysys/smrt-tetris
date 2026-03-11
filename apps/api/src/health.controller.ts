import type { ApiResponse, HealthData } from "@tetris/shared-types";
import { Controller, Get } from "@nestjs/common";
import { successResponse } from "./common/api-response";

@Controller("v1")
export class HealthController {
  @Get("health")
  getHealth(): ApiResponse<HealthData> {
    return successResponse({
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString()
    });
  }
}
