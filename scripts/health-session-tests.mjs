import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const repo = await read("apps/health-web/src/services/supabaseHealthRepository.ts");
const dataSource = await read("apps/health-web/src/services/healthDataSource.ts");
const app = await read("apps/health-web/src/App.tsx");
const types = await read("apps/health-web/src/types.ts");

assert.match(types, /ANONYMOUS_SAMPLE/);
assert.match(types, /SIGNED_IN_NO_DATA/);
assert.match(types, /SIGNED_IN_LIVE/);
assert.match(repo, /storage: window\.sessionStorage/);
assert.match(repo, /persistSession: true/);
assert.match(repo, /autoRefreshToken: true/);
assert.match(repo, /detectSessionInUrl: true/);
assert.match(repo, /signOut\(\{ scope: "local" \}\)/);
assert.doesNotMatch(repo, /localStorage/);

assert.match(dataSource, /if \(!session\) \{\s*return getAnonymousSampleDashboard\(\);\s*\}/);
const anonymousBlock = dataSource.match(/if \(!session\) \{[\s\S]*?\}/)?.[0] ?? "";
assert.doesNotMatch(anonymousBlock, /fetchSupabaseHealthDashboardData|health_get_dashboard|rpc/);
assert.match(dataSource, /authState: "ANONYMOUS_SAMPLE"/);
assert.match(dataSource, /source: "샘플 데이터"/);

assert.match(app, /비밀번호 확인/);
assert.match(app, /OnboardingPanel/);
assert.match(app, /샘플 데이터/);
assert.match(app, /Samsung Health → Health Connect → Health Atlas/);
assert.doesNotMatch(app, /beforeunload|pagehide/);

console.log("Health session tests passed");
