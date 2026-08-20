import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const repoSource = await readFile(new URL("../apps/health-web/src/services/supabaseHealthRepository.ts", import.meta.url), "utf8");
const appSource = await readFile(new URL("../apps/health-web/src/App.tsx", import.meta.url), "utf8");
const androidRepo = await readFile(new URL("../apps/health-app/src/providers/shared/services/healthDataRepository.ts", import.meta.url), "utf8");
const androidClient = await readFile(new URL("../apps/health-app/src/integrations/supabase/client.ts", import.meta.url), "utf8");
const androidVite = await readFile(new URL("../apps/health-app/vite.config.ts", import.meta.url), "utf8");

assert.match(repoSource, /auth:\s*\{[\s\S]*persistSession: true/);
assert.match(repoSource, /storage: window\.sessionStorage/);
assert.match(repoSource, /autoRefreshToken: true/);
assert.match(repoSource, /detectSessionInUrl: true/);
assert.match(repoSource, /client\.auth\.getSession\(\)/);
assert.match(repoSource, /client\.auth\.onAuthStateChange/);
assert.match(repoSource, /client\.auth\.signInWithPassword/);
assert.match(repoSource, /client\.auth\.signUp/);
assert.match(repoSource, /options: \{ emailRedirectTo \}/);
assert.match(repoSource, /const emailRedirectTo = "https:\/\/161\.33\.17\.84\/health\/"/);
assert.doesNotMatch(repoSource, /window\.location\.origin|localhost/);
assert.match(repoSource, /client\.auth\.signOut\(\{ scope: "local" \}\)/);
assert.match(repoSource, /needsEmailConfirmation/);
assert.match(repoSource, /health_rpc:AUTH_REQUIRED/);
assert.match(repoSource, /SESSION_EXPIRED/);
assert.doesNotMatch(repoSource, /localStorage/);

assert.match(appSource, /signUpWithEmail/);
assert.match(appSource, /비밀번호 확인/);
assert.match(appSource, /계정 만들기/);
assert.match(appSource, /확인 이메일/);
assert.match(appSource, /EMAIL_PATTERN/);
assert.match(appSource, /MIN_PASSWORD_LENGTH = 6/);
assert.match(appSource, /비밀번호와 비밀번호 확인이 일치하지 않습니다/);
assert.match(appSource, /type="email"/);
assert.match(appSource, /noValidate/);
assert.match(appSource, /role="alert"/);
assert.match(appSource, /role="status"/);
assert.match(appSource, /loadMode === "signed_out"[\s\S]*className="auth-shell"/);
assert.match(appSource, /className="auth-trust-list"/);
assert.doesNotMatch(appSource, /loadMode === "signed_out" \? <LoginPanel/);
assert.match(appSource, /requestPermissions/);
assert.match(appSource, /aria-expanded=\{guideOpen\}/);
assert.match(appSource, /로그인 정보를 확인해 주세요/);
assert.match(appSource, /계정 생성 정보를 확인해 주세요/);
assert.doesNotMatch(appSource, /setEnvError\(error instanceof Error \? error\.message/);
assert.doesNotMatch(appSource, /beforeunload|pagehide/);

assert.match(androidVite, /envDir/);
assert.match(androidClient, /import\.meta\.env\.VITE_SUPABASE_URL/);
assert.match(androidClient, /import\.meta\.env\.VITE_SUPABASE_PUBLISHABLE_KEY/);
assert.match(androidRepo, /supabase\.auth\.getSession\(\)/);
assert.match(androidRepo, /throw new Error\("AUTH_REQUIRED"\)/);
assert.match(androidRepo, /supabase\.functions\.invoke\("send-health-data"/);
assert.doesNotMatch(androidRepo, /user_id/);
assert.doesNotMatch(androidRepo, /userId/);

console.log("Health auth tests passed");
