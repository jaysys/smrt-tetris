import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  app.enableCors({
    origin: true,
    credentials: true
  });
  const port = Number(process.env.PORT ?? 60040);
  const host = process.env.HOST ?? "127.0.0.1";

  await app.listen({ port, host });

  Logger.log(`API server listening on http://${host}:${port}`, "Bootstrap");
}

void bootstrap();
