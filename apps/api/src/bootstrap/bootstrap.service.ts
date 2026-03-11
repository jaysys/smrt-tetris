import type { BootstrapData } from "@tetris/shared-types";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_SETTINGS,
  createDailyChallenge
} from "../domain/defaults";

@Injectable()
export class BootstrapService {
  createBootstrapData(existingGuestToken?: string): BootstrapData {
    return {
      guestToken: existingGuestToken ?? this.createGuestToken(),
      defaultMode: "MARATHON",
      dailyChallenge: createDailyChallenge(new Date()),
      announcements: DEFAULT_ANNOUNCEMENTS,
      settings: DEFAULT_SETTINGS,
      featureFlags: DEFAULT_FEATURE_FLAGS
    };
  }

  private createGuestToken(): string {
    return `guest_${randomUUID().replaceAll("-", "")}`;
  }
}
