import { spawnSync } from "node:child_process";

const steps = [
  ["node", ["scripts/db-reset.mjs"]],
  ["node", ["scripts/db-migrate.mjs"]],
  ["node", ["scripts/db-seed.mjs"]]
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("[db:reseed] Reset, migrate, and seed completed.");
