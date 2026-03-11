import type { ApiResponse } from "@tetris/shared-types";
import {
  Controller,
  Get,
  NotFoundException,
  Post
} from "@nestjs/common";
import { successResponse } from "../common/api-response";

type TestPingData = {
  status: "ok";
  testMode: true;
  serverTime: string;
  testClockIsoUtc: string | null;
};

type TestResetData = {
  accepted: true;
  capabilities: string[];
};

@Controller("v1/test")
export class TestController {
  @Get("ping")
  getPing(): ApiResponse<TestPingData> {
    this.assertTestMode();

    return successResponse({
      status: "ok",
      testMode: true,
      serverTime: new Date().toISOString(),
      testClockIsoUtc: process.env.TEST_CLOCK_ISO_UTC ?? null
    });
  }

  @Post("reset")
  resetState(): ApiResponse<TestResetData> {
    this.assertTestMode();

    return successResponse({
      accepted: true,
      capabilities: [
        "db:reset-command",
        "db:seed-command",
        "test-clock-env",
        "test-endpoint-gate"
      ]
    });
  }

  private assertTestMode() {
    if (process.env.TEST_MODE !== "true") {
      throw new NotFoundException();
    }
  }
}
