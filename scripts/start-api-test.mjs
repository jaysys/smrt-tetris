import { spawn } from "node:child_process";

const child = spawn("pnpm", ["--dir", "apps/api", "start"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    TEST_MODE: "true",
    HOST: process.env.HOST ?? "127.0.0.1",
    PORT: process.env.PORT ?? "3001"
  },
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
