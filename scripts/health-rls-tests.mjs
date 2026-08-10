import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20260807093000_align_health_contracts.sql", import.meta.url), "utf8");

assert.match(migration, /revoke all on function public\.health_get_dashboard\(integer\) from public/);
assert.match(migration, /revoke all on function public\.health_get_dashboard\(integer\) from anon/);
assert.match(migration, /grant execute on function public\.health_get_dashboard\(integer\) to authenticated/);

assert.match(migration, /revoke all on function public\.health_ingest_daily/);
assert.match(migration, /grant execute on function public\.health_ingest_daily[\s\S]*to authenticated/);
assert.match(migration, /set search_path = pg_catalog, public, auth/);

assert.match(migration, /revoke insert, update, delete on table public\.health_data from anon/);
assert.match(migration, /revoke insert, update, delete on table public\.health_data from authenticated/);
assert.match(migration, /revoke select on table public\.health_data from anon/);
assert.match(migration, /grant select on table public\.health_data to authenticated/);
assert.match(migration, /create policy "Health data owner select"/);
assert.match(migration, /using \(\(select auth\.uid\(\)\) = user_id\)/);

assert.doesNotMatch(migration, /to authenticated\s+using\s+\(true\)/i);
assert.doesNotMatch(migration, /p_user_id/i);

console.log("Health RLS tests passed");
