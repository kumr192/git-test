import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import path from "path"

const dbPath = path.join(process.cwd(), "agentops.db")
const sqlite = new Database(dbPath)
sqlite.pragma("journal_mode = WAL")
sqlite.pragma("foreign_keys = ON")

const db = drizzle(sqlite)

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") })
console.log("Migration complete")
sqlite.close()
