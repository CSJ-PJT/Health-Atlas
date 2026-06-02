import { spawn } from "node:child_process";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  }),
);

const root = process.cwd();
const repoPath = path.resolve(root, "../..");
const maxAutoTasks = args.get("max-auto-tasks") || process.env.MAX_AUTO_TASKS || "2";
const continueOnSuccess = args.has("continue-on-success") ? "1" : (process.env.CONTINUE_ON_SUCCESS || "0");
const fastMode = args.has("fast") ? "1" : (process.env.FAST_MODE || "0");
const pollMs = args.has("fast") ? "500" : (process.env.POLL_MS || "");
const reviewerPollMs = args.has("fast") ? "500" : (process.env.GPT_BRIDGE_POLL_MS || "");
const codexModel = args.get("model") || process.env.CODEX_MODEL || "";
const milestoneMode = args.get("milestone") || process.env.MILESTONE_MODE || "";

const env = {
  ...process.env,
  TARGET_PID: process.env.TARGET_PID || "15528",
  IMPLEMENTER_PID: process.env.IMPLEMENTER_PID || "15528",
  REVIEWER_NAME: process.env.REVIEWER_NAME || "codex-reviewer",
  USE_OPENAI_REVIEWER: process.env.USE_OPENAI_REVIEWER || "0",
  REPO_PATH: process.env.REPO_PATH || repoPath,
  BRANCH: process.env.BRANCH || "mcp",
  MAX_AUTO_TASKS: maxAutoTasks,
  CONTINUE_ON_SUCCESS: continueOnSuccess,
  FAST_MODE: fastMode,
  ...(pollMs ? { POLL_MS: pollMs } : {}),
  ...(reviewerPollMs ? { GPT_BRIDGE_POLL_MS: reviewerPollMs } : {}),
  ...(codexModel ? { CODEX_MODEL: codexModel } : {}),
  ...(milestoneMode ? { MILESTONE_MODE: milestoneMode } : {}),
};

console.log(`[review-loop] implementer pid=${env.IMPLEMENTER_PID}`);
console.log(`[review-loop] repo=${env.REPO_PATH}`);
console.log(`[review-loop] max auto tasks=${env.MAX_AUTO_TASKS}`);
console.log(`[review-loop] continue on success=${env.CONTINUE_ON_SUCCESS}`);
console.log(`[review-loop] fast mode=${env.FAST_MODE}`);
console.log(`[review-loop] polls: orchestrator=${env.POLL_MS || "default"} reviewer=${env.GPT_BRIDGE_POLL_MS || "default"}`);
console.log(`[review-loop] codex model=${env.CODEX_MODEL || "codex default"}`);
console.log(`[review-loop] milestone=${env.MILESTONE_MODE || "none"}`);

const child = spawn("npm", ["run", "dev:all"], {
  cwd: root,
  env,
  shell: true,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
