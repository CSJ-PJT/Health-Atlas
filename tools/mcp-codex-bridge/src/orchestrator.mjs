import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const queueDir = path.join(root, "queue");
const inboxDir = path.join(queueDir, "inbox");
const outboxDir = path.join(queueDir, "outbox");
const processingDir = path.join(queueDir, "processing");

const POLL_MS = Number(process.env.POLL_MS || 2000);
const CODEX_BIN = process.env.CODEX_BIN || (process.platform === "win32" ? path.join(process.env.APPDATA || "", "npm", "codex.cmd") : "codex");
const CODEX_MODEL = process.env.CODEX_MODEL || "";
const IMPLEMENTER_PID = Number(process.env.IMPLEMENTER_PID || process.env.TARGET_PID || 15528);

async function ensureDirs() {
  await fs.mkdir(inboxDir, { recursive: true });
  await fs.mkdir(outboxDir, { recursive: true });
  await fs.mkdir(processingDir, { recursive: true });
}

function runCommand(cmd, args, cwd, stdin = null) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(cmd, args, { cwd, shell: process.platform === "win32" });
    } catch (error) {
      resolve({ code: 1, stdout: "", stderr: formatSpawnError(error) });
      return;
    }
    let stdout = "", stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    if (stdin !== null) child.stdin.end(stdin);
    child.on("error", (error) => resolve({ code: 1, stdout, stderr: `${stderr}\n${formatSpawnError(error)}`.trim() }));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

function formatSpawnError(error) {
  return `spawn error: ${error?.code || ""} ${error?.message || String(error)}`.trim();
}

async function runCodexTask(task) {
  const instructionArg = typeof task.instruction === "string" ? task.instruction : JSON.stringify(task.instruction);
  const args = ["exec"];
  if (CODEX_MODEL) args.push("-m", CODEX_MODEL);
  args.push("-");
  return runCommand(CODEX_BIN, args, task.repo || root, instructionArg);
}

async function processTaskFile(fileName) {
  const src = path.join(inboxDir, fileName);
  const processing = path.join(processingDir, fileName);
  await fs.rename(src, processing);
  const task = JSON.parse(await fs.readFile(processing, "utf-8"));
  const taskId = task.task_id || fileName.replace(/\.json$/, "");

  const startedAt = new Date().toISOString();
  console.log(`[구현자] 시작 ${taskId}`);
  console.log(`[구현자] 지시: ${summarize(task.instruction, 180)}`);
  let result;
  try {
    result = await runCodexTask(task);
  } catch (error) {
    result = { code: 1, stdout: "", stderr: error instanceof Error ? error.stack || error.message : String(error) };
  }
  const finishedAt = new Date().toISOString();

  const output = {
    task_id: taskId,
    status: result.code === 0 ? "done" : "failed",
    started_at: startedAt,
    finished_at: finishedAt,
    repo: task.repo || root,
    branch: task.branch || null,
    instruction: task.instruction,
    constraints: task.constraints || [],
    role: task.role || "implementer",
    requested_by: task.requested_by || null,
    parent_task_id: task.parent_task_id || null,
    implementer: { pid: IMPLEMENTER_PID, bin: CODEX_BIN },
    codex: { bin: CODEX_BIN, exit_code: result.code, stdout: result.stdout, stderr: result.stderr }
  };

  await fs.writeFile(path.join(outboxDir, `${output.task_id}.result.json`), JSON.stringify(output, null, 2), "utf-8");
  await fs.unlink(processing);
  console.log(`[구현자] ${translateStatus(output.status)} ${output.task_id} 종료코드=${result.code} 소요=${formatDuration(startedAt, finishedAt)}`);
  const changedFiles = extractChangedFiles(result.stdout);
  if (changedFiles.length) console.log(`[구현자] 변경파일: ${changedFiles.join(", ")}`);
  console.log(`[구현자] 결과파일: queue/outbox/${output.task_id}.result.json`);
}

function summarize(value, maxLength) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

function formatDuration(startedAt, finishedAt) {
  const ms = Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt));
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

function extractChangedFiles(stdout) {
  const files = new Set();
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/-\s+\[([^\]]+)\]\(([^:)]+)(?::\d+)?\)/) || line.match(/Only tracked changed file is `([^`]+)`/);
    if (match) files.add(match[2] || match[1]);
  }
  return [...files].slice(0, 8);
}

async function tick() {
  const files = (await fs.readdir(inboxDir)).filter((n) => n.endsWith(".json")).sort();
  if (files.length) await processTaskFile(files[0]);
}

await ensureDirs();
console.log(`[오케스트레이터] 대기열 감시 중: ${inboxDir}`);
console.log(`[오케스트레이터] 폴링=${POLL_MS}ms 구현모델=${CODEX_MODEL || "codex 기본값"}`);
setInterval(async () => {
  try { await tick(); } catch (e) { console.error("[오케스트레이터] 처리 오류", e); }
}, POLL_MS);

function translateStatus(status) {
  if (status === "done") return "완료";
  if (status === "failed") return "실패";
  return status;
}
