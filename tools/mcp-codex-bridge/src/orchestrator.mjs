import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const queueDir = path.join(root, "queue");
const inboxDir = path.join(queueDir, "inbox");
const outboxDir = path.join(queueDir, "outbox");
const processingDir = path.join(queueDir, "processing");

const POLL_MS = Number(process.env.POLL_MS || 2000);
const CODEX_BIN = process.env.CODEX_BIN || "codex";

async function ensureDirs() {
  await fs.mkdir(inboxDir, { recursive: true });
  await fs.mkdir(outboxDir, { recursive: true });
  await fs.mkdir(processingDir, { recursive: true });
}

function runCommand(cmd, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => (stdout += data.toString()));
    child.stderr.on("data", (data) => (stderr += data.toString()));

    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

async function runCodexTask(task) {
  const instructionArg = typeof task.instruction === "string" ? task.instruction : JSON.stringify(task.instruction);
  const args = ["exec", instructionArg];
  const repoDir = task.repo || root;

  return runCommand(CODEX_BIN, args, repoDir);
}

async function processTaskFile(fileName) {
  const srcPath = path.join(inboxDir, fileName);
  const processingPath = path.join(processingDir, fileName);

  await fs.rename(srcPath, processingPath);
  const raw = await fs.readFile(processingPath, "utf-8");
  const task = JSON.parse(raw);

  const startedAt = new Date().toISOString();
  const result = await runCodexTask(task);
  const finishedAt = new Date().toISOString();

  const output = {
    task_id: task.task_id || fileName.replace(/\.json$/, ""),
    status: result.code === 0 ? "done" : "failed",
    started_at: startedAt,
    finished_at: finishedAt,
    repo: task.repo || root,
    branch: task.branch || null,
    instruction: task.instruction,
    constraints: task.constraints || [],
    codex: {
      bin: CODEX_BIN,
      exit_code: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
    },
  };

  const outputPath = path.join(outboxDir, `${output.task_id}.result.json`);
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf-8");
  await fs.unlink(processingPath);
}

async function tick() {
  const files = (await fs.readdir(inboxDir)).filter((name) => name.endsWith(".json"));
  if (files.length === 0) return;

  files.sort();
  await processTaskFile(files[0]);
}

async function main() {
  await ensureDirs();
  console.log(`[orchestrator] watching ${inboxDir}`);
  console.log(`[orchestrator] writing results to ${outboxDir}`);

  setInterval(async () => {
    try {
      await tick();
    } catch (error) {
      console.error("[orchestrator] tick error", error);
    }
  }, POLL_MS);
}

main().catch((error) => {
  console.error("[orchestrator] fatal error", error);
  process.exit(1);
});
