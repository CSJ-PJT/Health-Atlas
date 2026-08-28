import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const registry = await read("apps/health-app/src/providers/shared/services/providerRegistry.ts");
const storage = await read("apps/health-app/src/providers/shared/services/providerStorage.ts");
const mockMode = await read("apps/health-app/src/providers/shared/services/mockMode.ts");
const hook = await read("apps/health-app/src/hooks/useHealthData.ts");
const samsungClient = await read("apps/health-app/src/providers/samsung/services/healthConnectClient.ts");
const samsungOrigin = await read("apps/health-app/src/providers/samsung/services/samsungHealthOrigin.ts");
const repository = await read("apps/health-app/src/providers/shared/services/healthDataRepository.ts");
const native = await read("android/app/src/main/java/com/danchon/healthsync/HealthConnectPlugin.kt");
const androidManifest = await read("android/app/src/main/AndroidManifest.xml");
const admin = await read("apps/health-app/src/pages/Admin.tsx");
const accountSettings = await read("apps/health-app/src/pages/AccountSettings.tsx");
const webSync = await read("apps/health-web/src/services/syncStatus.ts");
const webApp = await read("apps/health-web/src/App.tsx");
const envExample = await read(".env.example");

assert.match(registry, /ACTIVE_HEALTH_PROVIDER: ProviderId = "samsung"/);
assert.match(registry, /return \[providers\[ACTIVE_HEALTH_PROVIDER\]\]/);
assert.match(registry, /UNSUPPORTED_HEALTH_PROVIDER/);
assert.doesNotMatch(registry, /garminProvider|appleHealthProvider|stravaProvider/);

assert.match(storage, /validProviders = new Set<ProviderId>\(\[ACTIVE_HEALTH_PROVIDER\]\)/);
assert.match(storage, /UNSUPPORTED_HEALTH_PROVIDER/);
assert.match(mockMode, /return false/);
assert.doesNotMatch(hook, /Falling back to mock today data|getMockNormalizedHealthData|isMockHealthDataEnabled/);

assert.match(samsungOrigin, /VITE_SAMSUNG_HEALTH_DATA_ORIGIN/);
assert.match(samsungOrigin, /com\.sec\.android\.app\.shealth/);
assert.match(samsungOrigin, /SAMSUNG_HEALTH_DATA_ORIGIN_UNVERIFIED/);
assert.match(samsungOrigin, /buildSamsungOriginFilter/);
assert.match(samsungOrigin, /isSamsungHealthOrigin/);
assert.match(samsungClient, /getTodayHealthData\(buildSamsungOriginFilter\(\)\)/);
assert.match(samsungClient, /HealthConnect\.readSummary\(buildSamsungOriginFilter\(\)\)/);
assert.doesNotMatch(samsungClient, /getMockSamsungTodaySnapshot|isMockHealthDataEnabled/);

assert.match(native, /SAMSUNG_HEALTH_DATA_ORIGIN_REQUIRED/);
assert.match(native, /dataOriginFilter = originFilter/);
assert.doesNotMatch(native, /buildTodaySnapshot\(start, end, null\)/);
assert.doesNotMatch(native, /AggregateRequest\(\s*metrics = metrics,\s*timeRangeFilter = range\s*\)/);
assert.match(androidManifest, /<package android:name="com\.google\.android\.apps\.healthdata" \/>/);

assert.match(repository, /providerId !== "samsung"/);
assert.match(repository, /provider: "samsung_health_connect"/);
assert.match(admin, /const providers: ProviderId\[\] = \["samsung"\]/);
assert.match(admin, /UNSUPPORTED_HEALTH_PROVIDER/);
assert.doesNotMatch(admin, /providers\/garmin|Garmin 설정|garmin_access_token/);
assert.doesNotMatch(accountSettings, /Garmin|garmin_permissions/);

assert.match(webSync, /source: "Samsung Health"/);
assert.match(webSync, /Samsung Health/);
assert.match(webApp, /Samsung Health/);
assert.doesNotMatch(webApp, /health_get_dashboard/);
assert.match(envExample, /VITE_SAMSUNG_HEALTH_DATA_ORIGIN/);
assert.match(envExample, /VITE_SAMSUNG_HEALTH_DATA_ORIGIN=com\.sec\.android\.app\.shealth/);
assert.doesNotMatch(envExample, /com\.example\.samsung\.health\.package/);

console.log("Health Samsung-only tests passed");
