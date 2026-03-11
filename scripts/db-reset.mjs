import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";

const configuredPath = resolve(
  process.cwd(),
  process.env.SQLITE_DB_PATH ?? "./data/app.db"
);
const databaseDir = dirname(configuredPath);

if (!existsSync(databaseDir)) {
  mkdirSync(databaseDir, { recursive: true });
}

if (existsSync(configuredPath)) {
  rmSync(configuredPath);
  console.log(`[db:reset] Removed ${configuredPath}`);
} else {
  console.log(`[db:reset] No database file found at ${configuredPath}`);
}

console.log("[db:reset] SQLite reset scaffold completed.");
