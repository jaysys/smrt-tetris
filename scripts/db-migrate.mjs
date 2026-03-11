import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const databasePath = resolve(
  process.cwd(),
  process.env.SQLITE_DB_PATH ?? "./data/app.db"
);
const migrationsDir = resolve(process.cwd(), "infra", "migrations");
const databaseDir = dirname(databasePath);

if (!existsSync(databaseDir)) {
  mkdirSync(databaseDir, { recursive: true });
}

const db = new DatabaseSync(databasePath);

db.exec("PRAGMA foreign_keys = ON;");
db.exec(
  "CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);"
);

const appliedRows = db
  .prepare("SELECT id FROM _migrations ORDER BY id ASC")
  .all()
  .map((row) => String(row.id));
const appliedSet = new Set(appliedRows);
const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const file of migrationFiles) {
  if (appliedSet.has(file)) {
    continue;
  }

  const sql = readFileSync(resolve(migrationsDir, file), "utf8");
  db.exec("BEGIN;");
  try {
    db.exec(sql);
    db.prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, ?)")
      .run(file, new Date().toISOString());
    db.exec("COMMIT;");
    console.log(`[db:migrate] Applied ${file}`);
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

db.close();
console.log(`[db:migrate] Migration completed for ${databasePath}`);
