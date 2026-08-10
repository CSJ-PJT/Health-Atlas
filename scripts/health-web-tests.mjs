import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const repo = process.cwd();
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const app = await read("apps/health-web/src/App.tsx");
const repoSource = await read("apps/health-web/src/services/supabaseHealthRepository.ts");
const dataSource = await read("apps/health-web/src/services/healthDataSource.ts");
const env = await read("apps/health-web/src/services/env.ts");

assert.match(app, /로그인 필요/);
assert.match(app, /건강 데이터는 로그인한 본인 계정의 기록만 표시됩니다/);
assert.match(app, /return "—"/);
assert.match(app, /마지막 동기화: \{summary \? formatSyncTime\(summary\.syncedAt\) : "없음"\}/);

assert.match(repoSource, /client\.rpc\("health_get_dashboard", \{ p_limit: 30 \}\)/);
assert.doesNotMatch(repoSource, /from\("health_data"\)/);
assert.doesNotMatch(repoSource, /syncedAt: new Date\(\)\.toISOString\(\)/);
assert.doesNotMatch(repoSource, /date: new Date\(\)\.toISOString\(\)\.slice/);

assert.match(dataSource, /if \(!import\.meta\.env\.DEV\)/);
assert.match(dataSource, /throw new Error\("SAMPLE_NOT_ALLOWED"\)/);
assert.match(env, /rawSamplePreview === "true"/);
assert.doesNotMatch(env, /VITE_ENABLE_SAMPLE_PREVIEW.*\?\? "true"/);

console.log(`Health web tests passed in ${repo}`);
