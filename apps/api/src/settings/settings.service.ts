import type { UserSettings } from "@tetris/shared-types";
import { Injectable } from "@nestjs/common";
import { DEFAULT_SETTINGS } from "../domain/defaults";

@Injectable()
export class SettingsService {
  private readonly settingsByGuestToken = new Map<string, UserSettings>();

  getSettings(guestToken: string): UserSettings {
    return this.settingsByGuestToken.get(guestToken) ?? DEFAULT_SETTINGS;
  }

  saveSettings(guestToken: string, settings: UserSettings): UserSettings {
    this.settingsByGuestToken.set(guestToken, settings);
    return settings;
  }
}
