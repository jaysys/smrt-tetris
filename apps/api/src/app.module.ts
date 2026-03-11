import { Module } from "@nestjs/common";
import { BootstrapModule } from "./bootstrap/bootstrap.module";
import { GameSessionModule } from "./game-session/game-session.module";
import { HealthController } from "./health.controller";
import { SettingsModule } from "./settings/settings.module";
import { TestModule } from "./test/test.module";

@Module({
  imports: [BootstrapModule, SettingsModule, GameSessionModule, TestModule],
  controllers: [HealthController]
})
export class AppModule {}
