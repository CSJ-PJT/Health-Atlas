import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const app = await read("apps/health-web/src/App.tsx");
const repoSource = await read("apps/health-web/src/services/supabaseHealthRepository.ts");
const dataSource = await read("apps/health-web/src/services/healthDataSource.ts");
const syncStatus = await read("apps/health-web/src/services/syncStatus.ts");
const env = await read("apps/health-web/src/services/env.ts");
const viteConfig = await read("apps/health-web/vite.config.ts");
const packageJson = await read("package.json");

assert.match(viteConfig, /envDir/);
assert.match(viteConfig, /new URL\("\.\.\/\.\.\/", import\.meta\.url\)/);
assert.match(packageJson, /verify:health-web-env/);
assert.match(packageJson, /build:health-web": "npm run verify:health-web-env && npm run build/);

assert.match(repoSource, /client\.rpc\("health_get_dashboard", \{ p_limit: 30 \}\)/);
assert.doesNotMatch(repoSource, /from\("health_data"\)/);
assert.doesNotMatch(repoSource, /syncedAt: new Date\(\)\.toISOString\(\)/);
assert.doesNotMatch(repoSource, /date: new Date\(\)\.toISOString\(\)\.slice/);
assert.match(repoSource, /statusMessage: "최근 동기화 데이터가 없습니다\."/);
assert.match(repoSource, /mode: "supabase"/);
assert.match(repoSource, /loadMode: "signed_in"/);

assert.match(dataSource, /if \(!env\.isSupabaseConfigured\)/);
assert.match(dataSource, /statusMessage: "로그인 필요"/);
assert.match(dataSource, /syncedAt: unknownSync/);
assert.doesNotMatch(dataSource, /new Date\(\)\.toISOString/);
assert.doesNotMatch(dataSource, /Date\.now/);

assert.match(app, /formatSyncTime\(summary\.syncedAt\)/);
assert.match(app, /return "없음"/);
assert.match(app, /계정 만들기/);
assert.match(app, /signUpWithEmail/);
assert.doesNotMatch(app, /dashboard\.source\}<\/small>/);
assert.doesNotMatch(app, /health_get_dashboard/);

assert.doesNotMatch(syncStatus, /"planning"/);
assert.doesNotMatch(syncStatus, /"unconfigured"/);

assert.match(env, /rawSamplePreview === "true"/);
assert.doesNotMatch(env, /VITE_ENABLE_SAMPLE_PREVIEW.*\?\? "true"/);

console.log("Health web tests passed");
