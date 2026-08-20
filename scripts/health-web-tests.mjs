import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const app = await read("apps/health-web/src/App.tsx");
const repoSource = await read("apps/health-web/src/services/supabaseHealthRepository.ts");
const dataSource = await read("apps/health-web/src/services/healthDataSource.ts");
const syncStatus = await read("apps/health-web/src/services/syncStatus.ts");
const env = await read("apps/health-web/src/services/env.ts");
const styles = await read("apps/health-web/src/styles.css");
const viteConfig = await read("apps/health-web/vite.config.ts");
const packageJson = await read("package.json");
const healthStatus = JSON.parse(
  (await read("apps/health-web/public/health-status.json")).replace(/^\uFEFF/, ""),
);

assert.match(viteConfig, /envDir/);
assert.match(viteConfig, /new URL\("\.\.\/\.\.\/", import\.meta\.url\)/);
assert.match(packageJson, /verify:health-web-env/);
assert.match(packageJson, /build:health-web": "npm run verify:health-web-env && npm run build/);
assert.equal(healthStatus.status, "operational");
assert.equal(healthStatus.backendAvailable, true);
assert.equal(healthStatus.liveData, false);

assert.match(repoSource, /client\.rpc\("health_get_dashboard", \{ p_limit: 30 \}\)/);
assert.doesNotMatch(repoSource, /from\("health_data"\)/);
assert.doesNotMatch(repoSource, /syncedAt: new Date\(\)\.toISOString\(\)/);
assert.doesNotMatch(repoSource, /date: new Date\(\)\.toISOString\(\)\.slice/);
assert.match(repoSource, /mode: "supabase"/);
assert.match(repoSource, /loadMode: "signed_in"/);

assert.match(dataSource, /if \(!env\.isSupabaseConfigured\)/);
assert.match(dataSource, /getAnonymousSampleDashboard/);
assert.match(dataSource, /authState: "ANONYMOUS_SAMPLE"/);
assert.match(dataSource, /source: "샘플 데이터"/);
assert.match(dataSource, /const \{ session \} = await getHealthAuthSession\(env\)/);
assert.match(dataSource, /if \(!session\)/);
assert.match(dataSource, /return getAnonymousSampleDashboard\(\)/);
assert.doesNotMatch(dataSource, /new Date\(\)\.toISOString/);
assert.doesNotMatch(dataSource, /Date\.now/);

assert.match(app, /formatSyncTime\(summary\.syncedAt\)/);
assert.match(app, /return "없음"/);
assert.match(app, /계정 만들기/);
assert.match(app, /signUpWithEmail/);
assert.match(app, /샘플 데이터/);
assert.match(app, /Samsung Health/);
assert.match(app, /handleOnboardingAction/);
assert.match(app, /health-connect-onboarding-steps/);
assert.match(app, /loadMode === "signed_out" \|\| needsOnboarding/);
assert.doesNotMatch(app, /dashboard\.source\}<\/small>/);
assert.doesNotMatch(app, /health_get_dashboard/);

assert.doesNotMatch(syncStatus, /"planning"/);
assert.doesNotMatch(syncStatus, /"unconfigured"/);

assert.match(env, /rawSamplePreview === "true"/);
assert.doesNotMatch(env, /VITE_ENABLE_SAMPLE_PREVIEW.*\?\? "true"/);
assert.match(styles, /min-height: 44px/);

console.log("Health web tests passed");
