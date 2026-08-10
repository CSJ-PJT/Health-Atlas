import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const envFiles = [".env.production.local", ".env.local", ".env"].map((file) => resolve(root, file));
const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
const values = new Map();

for (const file of envFiles) {
  if (!existsSync(file)) continue;
  const content = readFileSync(file, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (!required.includes(key) && key !== "VITE_SUPABASE_PROJECT_ID") continue;
    values.set(key, rawValue.replace(/^['"]|['"]$/g, "").trim());
  }
}

const missing = required.filter((key) => !values.get(key));
const url = values.get("VITE_SUPABASE_URL") ?? "";
const projectId = values.get("VITE_SUPABASE_PROJECT_ID") ?? "";

if (missing.length > 0) {
  console.error("HEALTH_WEB_ENV_MISSING");
  console.error(`Missing keys: ${missing.join(", ")}`);
  process.exit(1);
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
  console.error("HEALTH_WEB_ENV_MISSING");
  console.error("VITE_SUPABASE_URL is not a Supabase project URL.");
  process.exit(1);
}

if (projectId && !url.includes(projectId)) {
  console.error("HEALTH_WEB_ENV_MISSING");
  console.error("VITE_SUPABASE_PROJECT_ID does not match VITE_SUPABASE_URL.");
  process.exit(1);
}

console.log("Health Web Supabase target configured: true");
