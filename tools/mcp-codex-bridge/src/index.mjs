import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const root = process.cwd();
const queueDir = path.join(root, "queue");
const inboxDir = path.join(queueDir, "inbox");
const outboxDir = path.join(queueDir, "outbox");
const processingDir = path.join(queueDir, "processing");
const reviewDir = path.join(queueDir, "reviews");
const stateDir = path.join(queueDir, "state");
const taskIndexPath = path.join(stateDir, "mcp-task-index.json");
const targetPid = Number(process.env.TARGET_PID || process.env.CODEX_TARGET_PID || 15528);

async function ensureDirs() {
  await fs.mkdir(inboxDir, { recursive: true });
  await fs.mkdir(outboxDir, { recursive: true });
  await fs.mkdir(processingDir, { recursive: true });
  await fs.mkdir(reviewDir, { recursive: true });
  await fs.mkdir(stateDir, { recursive: true });
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(payload, null, 2), "utf-8");
  await fs.rename(tmpPath, filePath);
}

async function listFilesByMtime(directory, suffix, order = "asc") {
  const files = (await fs.readdir(directory).catch(() => [])).filter((file) => file.endsWith(suffix));
  const entries = await Promise.all(files.map(async (file) => {
    const fileStat = await fs.stat(path.join(directory, file)).catch(() => ({ mtimeMs: 0 }));
    return { file, mtimeMs: fileStat.mtimeMs };
  }));

  return entries
    .sort((left, right) => {
      const diff = order === "desc" ? right.mtimeMs - left.mtimeMs : left.mtimeMs - right.mtimeMs;
      return diff || left.file.localeCompare(right.file);
    })
    .map((entry) => entry.file);
}

async function readTaskIndex() {
  const index = await readJson(taskIndexPath, { tasks: {} });
  return index && typeof index === "object" && index.tasks ? index : { tasks: {} };
}

async function upsertTaskIndex(task) {
  const index = await readTaskIndex();
  index.tasks[task.task_id] = {
    task_id: task.task_id,
    repo: task.repo,
    branch: task.branch,
    instruction: task.instruction,
    constraints: task.constraints || [],
    created_at: task.created_at,
    updated_at: task.updated_at,
  };
  await writeJsonAtomic(taskIndexPath, index);
}

async function findTask(taskId) {
  const candidates = [
    { status: "queued", file: path.join(inboxDir, `${taskId}.json`) },
    { status: "running", file: path.join(processingDir, `${taskId}.json`) },
    { status: "finished", file: path.join(outboxDir, `${taskId}.result.json`) },
  ];

  for (const candidate of candidates) {
    const payload = await readJson(candidate.file);
    if (payload) return { status: payload.status || candidate.status, payload, file: candidate.file };
  }

  const index = await readTaskIndex();
  const indexed = index.tasks[taskId];
  return indexed ? { status: "unknown", payload: indexed, file: null } : null;
}

function processAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const server = new Server(
  { name: "mcp-codex-bridge", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "submit_task",
      description: "Queue a Codex implementation task for the local orchestrator and return a task id.",
      inputSchema: {
        type: "object",
        properties: {
          instruction: { type: "string" },
          repo: { type: "string" },
          branch: { type: "string" },
          task_id: { type: "string" },
          constraints: { type: "array", items: { type: "string" } }
        },
        required: ["instruction", "repo", "branch"]
      }
    },
    {
      name: "bridge_status",
      description: "Return queue counts, review counts, and the configured implementer process status.",
      inputSchema: {
        type: "object",
        properties: {
          target_pid: { type: "number" }
        }
      }
    },
    {
      name: "latest_review",
      description: "Return the newest reviewer decision written by the automatic reviewer loop.",
      inputSchema: {
        type: "object",
        properties: {}
      }
    },
    {
      name: "task_status",
      description: "Read the current status of a submitted task.",
      inputSchema: {
        type: "object",
        properties: { task_id: { type: "string" } },
        required: ["task_id"]
      }
    },
    {
      name: "task_result",
      description: "Return full task details and output if available.",
      inputSchema: {
        type: "object",
        properties: { task_id: { type: "string" } },
        required: ["task_id"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  await ensureDirs();

  if (name === "submit_task") {
    const taskId = args.task_id || randomUUID();
    const task = {
      task_id: taskId,
      status: "queued",
      instruction: args.instruction,
      repo: args.repo,
      branch: args.branch,
      constraints: Array.isArray(args.constraints) ? args.constraints : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      result: null
    };
    await writeJsonAtomic(path.join(inboxDir, `${taskId}.json`), task);
    await upsertTaskIndex(task);
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, task_id: taskId, status: task.status }, null, 2) }] };
  }

  if (name === "bridge_status") {
    const pid = Number(args?.target_pid || targetPid);
    const [inbox, processing, outbox, reviews] = await Promise.all([
      fs.readdir(inboxDir).catch(() => []),
      fs.readdir(processingDir).catch(() => []),
      fs.readdir(outboxDir).catch(() => []),
      fs.readdir(reviewDir).catch(() => []),
    ]);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ok: true,
          queue: {
            inbox: inbox.filter((f) => f.endsWith(".json")).length,
            processing: processing.filter((f) => f.endsWith(".json")).length,
            outbox: outbox.filter((f) => f.endsWith(".result.json")).length,
            reviews: reviews.filter((f) => f.endsWith(".review.json")).length,
          },
          implementer_process: { pid, alive: processAlive(pid), role: "implementer" },
          reviewer: { role: "reviewer", queue: reviewDir },
          queue_dir: queueDir,
        }, null, 2)
      }]
    };
  }

  if (name === "latest_review") {
    const reviews = await listFilesByMtime(reviewDir, ".review.json", "desc");
    const latest = reviews[0];
    if (!latest) return { content: [{ type: "text", text: JSON.stringify({ ok: true, review: null }, null, 2) }] };
    const review = await readJson(path.join(reviewDir, latest));
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, file: latest, review }, null, 2) }] };
  }

  if (name === "task_status") {
    const task = await findTask(args.task_id);
    if (!task) return { isError: true, content: [{ type: "text", text: `Task not found: ${args.task_id}` }] };
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, task_id: args.task_id, status: task.status, updated_at: task.payload.updated_at || task.payload.finished_at || null }, null, 2) }] };
  }

  if (name === "task_result") {
    const task = await findTask(args.task_id);
    if (!task) return { isError: true, content: [{ type: "text", text: `Task not found: ${args.task_id}` }] };
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, task: task.payload, status: task.status }, null, 2) }] };
  }

  return { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] };
});

await ensureDirs();
const transport = new StdioServerTransport();
await server.connect(transport);
