import type { ApiResponse, BootstrapData } from "@tetris/shared-types";
import { Controller, Get, Headers } from "@nestjs/common";
import { successResponse } from "../common/api-response";
import { extractBearerToken } from "../common/auth";
import { BootstrapService } from "./bootstrap.service";

@Controller("v1/bootstrap")
export class BootstrapController {
  constructor(private readonly bootstrapService: BootstrapService) {}

  @Get()
  getBootstrap(
    @Headers("authorization") authorization?: string
  ): ApiResponse<BootstrapData> {
    const guestToken = extractBearerToken(authorization);
    const data = this.bootstrapService.createBootstrapData(guestToken);

    return successResponse(data);
  }
}
