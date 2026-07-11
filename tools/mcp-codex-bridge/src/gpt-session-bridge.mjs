import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const queueDir = path.join(root, "queue");
const inboxDir = path.join(queueDir, "inbox");
const outboxDir = path.join(queueDir, "outbox");
const stateDir = path.join(queueDir, "state");
const statePath = path.join(stateDir, "gpt-session-state.json");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-5";
const SYSTEM_PROMPT = process.env.GPT_SYSTEM_PROMPT || "You are DeepStake task planner. Return ONLY compact JSON with keys: task_id, repo, branch, instruction, constraints[].";
const REPO_PATH = process.env.REPO_PATH || path.resolve(root, "../..");
const BRANCH = process.env.BRANCH || "mcp";
const POLL_MS = Number(process.env.GPT_BRIDGE_POLL_MS || 4000);

async function ensureDirs() {
  await fs.mkdir(inboxDir, { recursive: true });
  await fs.mkdir(outboxDir, { recursive: true });
  await fs.mkdir(stateDir, { recursive: true });
}

async function readState() {
  try {
    return JSON.parse(await fs.readFile(statePath, "utf-8"));
  } catch {
    return { processedOutbox: [], lastResponseId: null };
  }
}

async function writeState(state) {
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");
}

function extractText(responseJson) {
  const out = responseJson.output || [];
  const chunks = [];
  for (const item of out) {
    if (!item.content) continue;
    for (const c of item.content) {
      if (c.type === "output_text" && c.text) chunks.push(c.text);
    }
  }
  return chunks.join("\n").trim();
}

async function callResponsesAPI(input, previousResponseId = null) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required");

  const payload = {
    model: MODEL,
    input,
    text: { format: { type: "text" } },
  };
  if (previousResponseId) payload.previous_response_id = previousResponseId;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Responses API error ${response.status}: ${err}`);
  }

  return response.json();
}

async function requestNextTask(state, outboxPayload = null) {
  const prompt = outboxPayload
    ? `Latest Codex result:\n${JSON.stringify(outboxPayload)}\nGenerate the next DeepStake coding task as strict JSON.`
    : `Initialize DeepStake session and generate the first coding task as strict JSON. Use repo=${REPO_PATH} branch=${BRANCH}.`;

  const response = await callResponsesAPI([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ], state.lastResponseId);

  const text = extractText(response);
  const task = JSON.parse(text);

  task.repo = task.repo || REPO_PATH;
  task.branch = task.branch || BRANCH;
  task.task_id = task.task_id || `deepstake-${Date.now()}`;
  task.constraints = Array.isArray(task.constraints) ? task.constraints : [];

  const inboxPath = path.join(inboxDir, `${task.task_id}.json`);
  await fs.writeFile(inboxPath, JSON.stringify(task, null, 2), "utf-8");

  state.lastResponseId = response.id || state.lastResponseId;
}

async function pollLoop() {
  await ensureDirs();
  const state = await readState();

  const outboxFiles = (await fs.readdir(outboxDir))
    .filter((f) => f.endsWith(".result.json"))
    .sort();

  const pending = outboxFiles.filter((f) => !state.processedOutbox.includes(f));

  if (pending.length === 0) {
    const inboxFiles = (await fs.readdir(inboxDir)).filter((f) => f.endsWith(".json"));
    if (inboxFiles.length === 0 && !state.lastResponseId) {
      await requestNextTask(state, null);
      await writeState(state);
      console.log("[gpt-bridge] seeded first task");
    }
    return;
  }

  for (const file of pending) {
    const payload = JSON.parse(await fs.readFile(path.join(outboxDir, file), "utf-8"));
    await requestNextTask(state, payload);
    state.processedOutbox.push(file);
    state.processedOutbox = state.processedOutbox.slice(-500);
    await writeState(state);
    console.log(`[gpt-bridge] processed ${file}`);
  }
}

async function main() {
  await ensureDirs();
  console.log(`[gpt-bridge] running with model=${MODEL}`);

  setInterval(async () => {
    try {
      await pollLoop();
    } catch (error) {
      console.error("[gpt-bridge] poll error", error.message);
    }
  }, POLL_MS);
}

main().catch((err) => {
  console.error("[gpt-bridge] fatal", err);
  process.exit(1);
});
