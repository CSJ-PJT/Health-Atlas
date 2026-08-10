import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const admin = await read("apps/health-app/src/pages/Admin.tsx");
const app = await read("apps/health-web/src/App.tsx");
const syncStatus = await read("apps/health-web/src/services/syncStatus.ts");
const dataSource = await read("apps/health-web/src/services/healthDataSource.ts");

assert.match(admin, /const providers: ProviderId\[\] = \["samsung"\]/);
assert.match(admin, /Samsung Health 연결/);
assert.doesNotMatch(admin, /Apple Health API 설정|Strava API 설정|Samsung Health API 설정|Bridge Access Token|Team ID|Samsung Client ID|samsungClientId\}\s+onChange|samsungApiKey\}\s+onChange/);

assert.match(app, /샘플 데이터/);
assert.match(app, /회원가입|계정 만들기/);
assert.match(app, /Android 앱에서 Samsung Health 연결|Android 앱에서 동기화/);
assert.match(app, /Apple Health로 대체하지 않습니다/);
assert.match(syncStatus, /Samsung Health/);
assert.doesNotMatch(syncStatus, /source: "Supabase"/);
assert.match(dataSource, /syncStatuses: \[/);

console.log("Health UX policy tests passed");
