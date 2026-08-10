import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20260807093000_align_health_contracts.sql", import.meta.url), "utf8");
const edge = await readFile(new URL("../supabase/functions/send-health-data/index.ts", import.meta.url), "utf8");
const webRepo = await readFile(new URL("../apps/health-web/src/services/supabaseHealthRepository.ts", import.meta.url), "utf8");

assert.match(migration, /health_get_dashboard\(p_limit integer default 30\)/);
assert.doesNotMatch(migration, /health_get_dashboard\([^)]*p_user_id/i);
assert.match(migration, /least\(greatest\(coalesce\(p_limit, 30\), 1\), 90\)/);
assert.match(migration, /where h\.user_id = auth\.uid\(\)/);
const dashboardReturn = migration.match(/health_get_dashboard[\s\S]*?\)\nlanguage plpgsql/)?.[0] ?? "";
assert.doesNotMatch(dashboardReturn, /jsonb/i);

assert.match(migration, /health_ingest_daily\(\s*p_synced_at timestamptz/);
assert.doesNotMatch(migration, /health_ingest_daily\([^)]*p_user_id/i);
assert.match(migration, /v_owner uuid := auth\.uid\(\)/);
assert.match(migration, /where user_id = v_owner/);
assert.match(migration, /octet_length/);
assert.match(migration, /PAYLOAD_TOO_LARGE/);
assert.match(migration, /INVALID_SYNCED_AT/);

for (const key of ["count", "steps", "calories", "activeCalories", "movingMinutes", "duration", "totalMinutes", "durationMinutes", "weightKg", "weight", "restingHeartRate"]) {
  assert.match(migration, new RegExp(key));
}

assert.match(edge, /extractToken\(req\)/);
assert.match(edge, /adminClient\.auth\.getUser\(token\)/);
assert.match(edge, /Authorization: `Bearer \$\{token\}`/);
assert.match(edge, /userClient\.rpc\("health_ingest_daily"/);
assert.doesNotMatch(edge, /console\.log\(/);
assert.doesNotMatch(edge, /user_id/);

assert.match(webRepo, /score: null/);
assert.doesNotMatch(webRepo, /safeHeartRate = restingHeartRate \?\? 58/);

console.log("Health contract tests passed");
