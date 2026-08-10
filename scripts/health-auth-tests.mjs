import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const repoSource = await readFile(new URL("../apps/health-web/src/services/supabaseHealthRepository.ts", import.meta.url), "utf8");
const appSource = await readFile(new URL("../apps/health-web/src/App.tsx", import.meta.url), "utf8");
const androidRepo = await readFile(new URL("../apps/health-app/src/providers/shared/services/healthDataRepository.ts", import.meta.url), "utf8");

assert.match(repoSource, /auth:\s*\{[\s\S]*persistSession: true/);
assert.match(repoSource, /client\.auth\.getSession\(\)/);
assert.match(repoSource, /client\.auth\.onAuthStateChange/);
assert.match(repoSource, /client\.auth\.signInWithPassword/);
assert.match(repoSource, /client\.auth\.signOut\(\)/);
assert.match(repoSource, /health_rpc:AUTH_REQUIRED/);
assert.match(repoSource, /SESSION_EXPIRED/);

assert.match(appSource, /setEnvError\("로그인 정보를 확인해 주세요\."\)/);
assert.doesNotMatch(appSource, /catch \(error\) \{[\s\S]{0,120}setEnvError\(error instanceof Error \? error\.message/);

assert.match(androidRepo, /supabase\.auth\.getSession\(\)/);
assert.match(androidRepo, /throw new Error\("AUTH_REQUIRED"\)/);
assert.match(androidRepo, /supabase\.functions\.invoke\("send-health-data"/);
assert.doesNotMatch(androidRepo, /user_id/);
assert.doesNotMatch(androidRepo, /userId/);

console.log("Health auth tests passed");
