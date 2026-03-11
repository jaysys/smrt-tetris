import type { ApiResponse, UserSettings } from "@tetris/shared-types";
import { Body, Controller, Get, Headers, Put } from "@nestjs/common";
import { successResponse } from "../common/api-response";
import { extractBearerToken } from "../common/auth";
import { DEFAULT_SETTINGS } from "../domain/defaults";
import { SettingsService } from "./settings.service";

@Controller("v1/settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(
    @Headers("authorization") authorization?: string
  ): ApiResponse<UserSettings> {
    const guestToken = extractBearerToken(authorization) ?? "anonymous";
    const settings = this.settingsService.getSettings(guestToken);

    return successResponse(settings);
  }

  @Put()
  updateSettings(
    @Body() payload: Partial<UserSettings>,
    @Headers("authorization") authorization?: string
  ): ApiResponse<UserSettings> {
    const guestToken = extractBearerToken(authorization) ?? "anonymous";
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      ...payload
    };

    return successResponse(this.settingsService.saveSettings(guestToken, settings));
  }
}
