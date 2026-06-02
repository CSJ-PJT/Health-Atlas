import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const queueDir = path.join(root, "queue");
const inboxDir = path.join(queueDir, "inbox");
const outboxDir = path.join(queueDir, "outbox");
const reviewDir = path.join(queueDir, "reviews");
const stateDir = path.join(queueDir, "state");
const statePath = path.join(stateDir, "gpt-session-state.json");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-5";
const USE_OPENAI_REVIEWER = process.env.USE_OPENAI_REVIEWER === "1" || process.env.USE_OPENAI_REVIEWER === "true";
const SYSTEM_PROMPT = process.env.GPT_SYSTEM_PROMPT || [
  "You are the reviewer for Fifth Dawn / DeepStake game development.",
  "Codex running in the local implementer process does the implementation work.",
  "Your job is to review each Codex result, identify concrete issues, and return exactly one next implementation task when more work is needed.",
  "Prefer bugs, build failures, regressions, missing tests, and violations of repository rules over stylistic feedback.",
  "Keep implementation tasks small, buildable, and scoped to apps/fifth-dawn-game first unless shared contracts are required.",
  "Do not ask the game app to import or query raw health records.",
  "Do not make progression depend on health linkage.",
  "Return ONLY strict compact JSON with keys: verdict, review_summary, findings[], next_task.",
  "verdict must be one of request_changes, approve_next, or stop.",
  "next_task must be null only when verdict is stop; otherwise it must include task_id, repo, branch, instruction, constraints[]."
].join(" ");
const REPO_PATH = process.env.REPO_PATH || path.resolve(root, "../..");
const BRANCH = process.env.BRANCH || "mcp";
const POLL_MS = Number(process.env.GPT_BRIDGE_POLL_MS || 4000);
const MAX_AUTO_TASKS_RAW = process.env.MAX_AUTO_TASKS || "25";
const MAX_AUTO_TASKS = MAX_AUTO_TASKS_RAW === "0" || MAX_AUTO_TASKS_RAW === "unlimited"
  ? Number.POSITIVE_INFINITY
  : Number(MAX_AUTO_TASKS_RAW);
const REVIEWER_NAME = process.env.REVIEWER_NAME || "codex-reviewer";
const IMPLEMENTER_PID = Number(process.env.IMPLEMENTER_PID || process.env.TARGET_PID || 15528);
const CONTINUE_ON_SUCCESS = process.env.CONTINUE_ON_SUCCESS === "1" || process.env.CONTINUE_ON_SUCCESS === "true";
const FAST_MODE = process.env.FAST_MODE === "1" || process.env.FAST_MODE === "true";
const MILESTONE_MODE = process.env.MILESTONE_MODE || "";
const MAX_QUEUE_BACKLOG = Number(process.env.MAX_QUEUE_BACKLOG || 3);
const IS_MILESTONE_A = MILESTONE_MODE.toUpperCase() === "A";
const IS_MODULAR_MODE = MILESTONE_MODE.toUpperCase() === "MODULAR";

async function ensureDirs() {
  await fs.mkdir(inboxDir, { recursive: true });
  await fs.mkdir(outboxDir, { recursive: true });
  await fs.mkdir(reviewDir, { recursive: true });
  await fs.mkdir(stateDir, { recursive: true });
}
async function readState() {
  try {
    const state = JSON.parse(await fs.readFile(statePath, "utf-8"));
    return {
      processedOutbox: Array.isArray(state.processedOutbox) ? state.processedOutbox : [],
      lastResponseId: state.lastResponseId || null,
      generatedCount: Number(state.generatedCount || 0),
      consecutiveFailures: Number(state.consecutiveFailures || 0),
      lastFailureSignature: state.lastFailureSignature || null,
      stopped: Boolean(state.stopped),
    };
  } catch {
    return { processedOutbox: [], lastResponseId: null, generatedCount: 0, consecutiveFailures: 0, lastFailureSignature: null, stopped: false };
  }
}
async function writeState(s) { await fs.writeFile(statePath, JSON.stringify(s, null, 2), "utf-8"); }
async function writeJsonAtomic(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(payload, null, 2), "utf-8");
  await fs.rename(tmpPath, filePath);
}
function extractText(r) {
  const chunks = [];
  for (const item of (r.output || [])) for (const c of (item.content || [])) if (c.type === "output_text" && c.text) chunks.push(c.text);
  return chunks.join("\n").trim();
}
async function callResponsesAPI(input, previousResponseId = null) {
  const payload = { model: MODEL, input, text: { format: { type: "text" } } };
  if (previousResponseId) payload.previous_response_id = previousResponseId;
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Responses API error ${res.status}: ${await res.text()}`);
  return res.json();
}

function makeLocalReviewDecision(outboxPayload = null) {
  if (!outboxPayload) {
    return normalizeDecision({
      verdict: "approve_next",
      review_summary: "Initial reviewer handoff created locally without OpenAI.",
      findings: [],
      next_task: {
        task_id: makeInitialTaskId(),
        repo: REPO_PATH,
        branch: BRANCH,
        instruction: IS_MODULAR_MODE ? makeModularConstructionInstruction() : IS_MILESTONE_A ? makeMilestoneAInstruction() : [
          "DeepStake3D PASS 4 Boundary Control only.",
          "Inspect the PM source-of-truth docs before changing files:",
          "unity/DeepStake3D/docs/product/FIRST_SCREEN_PM_BRIEF.md",
          "unity/DeepStake3D/docs/product/FIRST_SCREEN_PRODUCTION_SPEC_V1.md",
          "unity/DeepStake3D/docs/product/FIRST_SCREEN_CONCEPT_PROMPTS.md",
          "Strengthen the controlled settlement feeling through minimal top/right boundary control edits.",
          "Preserve the authority landmark, current path flow, social pressure, and mobile readability.",
          "Do not redesign the village, add random props, touch screenshot automation, UPM/licensing, gameplay systems, or DeepStakeUnity.",
          "Report exact files changed and why each change serves first 5-second readability."
        ].join(" "),
        constraints: [
          ...(IS_MODULAR_MODE ? makeModularConstructionConstraints() : IS_MILESTONE_A ? [
            "MILESTONE A: First 3 Seconds Impression Proof",
            "Do not stop for micro approvals",
            "Output 5 to 10 screenshots",
            "Short reviewer summary required",
            "One commit-worthy milestone result",
            "Avoid unnecessary system expansion"
          ] : [
            "PASS 4 Boundary Control only",
            "No screenshot automation work",
            "No Unity execution unless explicitly required",
            "No gameplay system changes",
            "Minimal commit-worthy file scope"
          ])
        ],
      },
    }, outboxPayload);
  }

  if (outboxPayload.status === "failed" || outboxPayload.codex?.exit_code !== 0) {
    return normalizeDecision({
      verdict: "request_changes",
      review_summary: "Implementer task failed; next task is limited to diagnosing and fixing that failure.",
      findings: [
        {
          severity: "blocking",
          issue: "Builder result failed, so production review cannot approve the pass.",
          evidence: outboxPayload.codex?.stderr || outboxPayload.codex?.stdout || "No implementer output captured."
        }
      ],
      next_task: {
        task_id: `fix-${outboxPayload.task_id || Date.now()}`,
        repo: outboxPayload.repo || REPO_PATH,
        branch: outboxPayload.branch || BRANCH,
        instruction: [
          "Fix only the failure from the previous implementer task.",
          "Do not add new PASS 4 scope while fixing.",
          "Keep the change minimal and report the exact validation command/result."
        ].join(" "),
        constraints: [
          "Failure fix only",
          "No new design work",
          "No screenshot automation work",
          "No Unity execution unless explicitly required"
        ],
      },
    }, outboxPayload);
  }

  if (!CONTINUE_ON_SUCCESS) {
    return normalizeDecision({
      verdict: "stop",
      review_summary: "Local reviewer recorded the completed builder result and stopped to avoid an automation loop. PM should decide next.",
      findings: [],
      next_task: null,
    }, outboxPayload);
  }

  return normalizeDecision({
    verdict: "approve_next",
    review_summary: IS_MODULAR_MODE
      ? "Modular construction mode is enabled. Previous builder result completed, so the reviewer queued one more foundation-focused continuation task."
      : IS_MILESTONE_A
      ? "Milestone mode is enabled. Previous builder result completed, so the reviewer queued one more milestone-focused continuation task."
      : "Experimental loop mode is enabled. Previous builder result completed, so the reviewer queued one more constrained continuation task.",
    findings: [],
    next_task: {
      task_id: makeContinuationTaskId(),
      repo: outboxPayload.repo || REPO_PATH,
      branch: outboxPayload.branch || BRANCH,
      instruction: IS_MODULAR_MODE
        ? makeModularConstructionContinuationInstruction(outboxPayload)
        : IS_MILESTONE_A
        ? makeMilestoneAContinuationInstruction(outboxPayload)
        : (FAST_MODE ? makeFastContinuationInstruction(outboxPayload) : makeFullContinuationInstruction()),
      constraints: [
        ...(IS_MODULAR_MODE ? makeModularConstructionConstraints() : IS_MILESTONE_A ? [
          "Milestone mode",
          "First 3 seconds impression proof",
          "5 to 10 screenshots required before final stop",
          "No micro approvals",
          "No unnecessary system expansion"
        ] : [
          "Experimental loop mode",
          "One minimal PM-compliant improvement per turn",
          ...(FAST_MODE ? ["Fast mode: inspect current diff first, open PM docs only if needed"] : []),
          "No screenshot automation work",
          "No gameplay system changes",
          "No DeepStakeUnity changes",
          "No broad redesign"
        ])
      ],
    },
  }, outboxPayload);
}

function makeMilestoneAInstruction() {
  return [
    "MILESTONE A: First 3 Seconds Impression Proof.",
    "Stop pass-by-pass iteration. Work toward one commit-worthy milestone result.",
    "Highest priority: the scene must not feel like a test map; it must feel like a real game space to normal players.",
    "Optimize for immediate emotional readability, not technical cleverness.",
    "Requirements: remove visual absurdity, reduce primitive test-map feeling, preserve controlled discomfort, improve authority / route / boundary readability, avoid uncanny AI-generated weirdness, and avoid unnecessary system expansion.",
    "Actively use approved existing generated/Meshy models and textures when they improve first-3-second readability.",
    "Do not randomly add models. Every asset must have a clear visual role.",
    "Priority asset roles: authority/notice landmark detail; controlled boundary using fence, barrier, or low wall; building readability using doors, windows, awnings, or porch modules; lived-in scarcity using barrels, sacks, crates, or benches; route readability using lamp posts, sign posts, or small edge markers.",
    "Use 6 to 12 existing approved assets maximum for the next milestone continuation. Do not place more than 12.",
    "Each reused/added asset must have one screen role: boundary, authority, route, building readability, or scarcity/lived-in detail.",
    "Do not use models that feel random or comedic, cat assets, modern cafe/house assets that break the setting, unreadable AI-text props, assets with broken scale/materials, or anything that makes the scene look like a random asset dump.",
    "Inspect the PM source-of-truth docs and current scene/diff before editing.",
    "Do not stop for micro approvals.",
    "Prepare milestone output: 5 to 10 screenshots, short reviewer summary, and one commit-worthy milestone result.",
    "Output must include screenshots, list of added/reused model names, role of each asset, and whether the scene feels less like a test map.",
    "Screenshots are required because judgement is screenshot-first.",
    "Keep scope focused on DeepStake3D first-screen presentation. Do not touch unrelated health/game app systems, UPM/licensing, or DeepStakeUnity unless directly required for screenshot proof."
  ].join(" ");
}

function makeMilestoneAContinuationInstruction(outboxPayload) {
  const previousTask = outboxPayload?.task_id ? `Previous task: ${outboxPayload.task_id}.` : "";
  return [
    "Continue MILESTONE A: First 3 Seconds Impression Proof.",
    previousTask,
    "Review current git diff, latest result, and available screenshots/proof artifacts first.",
    "Do not do pass-by-pass micro iteration; push toward the milestone output.",
    "If the scene still reads as a test map, make focused visual edits that improve real-game-space readability.",
    "Preserve controlled discomfort and improve authority / route / boundary readability.",
    "Use approved existing generated/Meshy assets more actively when they have clear roles and improve first-3-second readability.",
    "Prefer role-based asset use: authority/notice landmark detail, controlled boundary fences/barriers/low walls, readable doors/windows/awnings/porches, scarcity props like barrels/sacks/crates/benches, and route aids like lamps/signs/edge markers.",
    "For this continuation, apply 6 to 12 existing approved assets maximum. Do not place more than 12.",
    "Each reused/added asset must list its screen role: boundary, authority, route, building readability, or scarcity/lived-in detail.",
    "Do not randomly add models, and do not use comedic/random models, cat assets, modern cafe/house assets, unreadable AI-text props, broken scale/material assets, or anything that makes the scene look like a random asset dump.",
    "Avoid uncanny AI-generated weirdness and unnecessary system expansion.",
    "Reviewer must reject if added assets look random. Approve only if the scene becomes more readable to a normal player in the first 3 seconds.",
    "Before stopping, ensure the milestone output has 5 to 10 screenshots, a short reviewer summary, and a commit-worthy result.",
    "Output must include screenshots, list of added/reused model names, role of each asset, and whether the scene feels less like a test map.",
    "If screenshots already exist and prove the milestone, do not add low-value work; summarize commit-worthy files.",
    "Do not touch unrelated systems, UPM/licensing, or DeepStakeUnity unless directly required for screenshot proof."
  ].filter(Boolean).join(" ");
}

function makeInitialTaskId() {
  if (IS_MODULAR_MODE) return `modular-construction-v1-${Date.now()}`;
  if (IS_MILESTONE_A) return `milestone-a-first-3s-${Date.now()}`;
  return `pass4-boundary-control-${Date.now()}`;
}

function makeContinuationTaskId() {
  if (IS_MODULAR_MODE) return `modular-construction-v1-continue-${Date.now()}`;
  if (IS_MILESTONE_A) return `milestone-a-continue-${Date.now()}`;
  return `loop-pass-${Date.now()}`;
}

function makeModularConstructionConstraints() {
  return [
    "REAL GAME FOUNDATION: ModularConstructionPrototype V1 only",
    "Review target is not visual polish and not sample-image matching",
    "Do not decorate WorldPrototype3D",
    "Do not use Screenshot, Discord, UPM, approval tooling, or PID/Stop-Process work",
    "Do not make Meshy props placement the main task",
    "Do not expand into inventory, crafting, combat, NPC, or full-house systems",
    "Required: isolated ModularConstructionPrototype scene or equivalent",
    "Required: 1 Unity unit = 1 meter real-world scale",
    "Required: floor, wall, door, window, fence, and gate modular pieces",
    "Required: grid snapping, 90-degree rotation, place/remove",
    "Required: tile/chunk data structure for future large world",
    "Report changed files and commit recommendation"
  ];
}

function makeModularConstructionInstruction() {
  return [
    "DeepStake3D REAL GAME FOUNDATION: ModularConstructionPrototype V1.",
    "This is not a visual quality pass and not a sample-image matching task.",
    "Build or complete the narrow modular construction foundation only.",
    "Success requires: a new isolated ModularConstructionPrototype scene or equivalent; 1 Unity unit = 1 meter scale; believable character/building scale; modular floor, wall, door, window, fence, and gate pieces; grid snapping; 90-degree rotation snap; basic place/remove; and a tile/chunk data structure that can grow into a future large world.",
    "Use modular pieces as the core construction method, not full house models.",
    "Use Unity scene objects only as runtime presentation; do not make scene objects the only source of truth.",
    "Stop and report blocker if you cannot implement place/rotate/remove and tile/chunk data.",
    "Immediate stop conditions: decorating WorldPrototype3D, copying Korean countryside sample images, Screenshot/Discord/UPM discussion, Meshy props as the main task, pretty-only work without place/rotate/remove, missing tile/chunk data, or PID kill/Stop-Process attempts.",
    "Do not expand into inventory, crafting, combat, NPC systems, save/load repository, multiplayer, or screenshot automation.",
    "Output must include: exact changed files, whether ModularConstructionPrototype.unity exists, scale rule, implemented modular piece list, grid snapping status, 90-degree rotation status, place/remove status, tile/chunk data structure, validation performed, and commit recommendation."
  ].join(" ");
}

function makeModularConstructionContinuationInstruction(outboxPayload) {
  const previousTask = outboxPayload?.task_id ? `Previous task: ${outboxPayload.task_id}.` : "";
  return [
    "Continue DeepStake3D REAL GAME FOUNDATION: ModularConstructionPrototype V1.",
    previousTask,
    "First review current git status/diff and the latest builder result.",
    "Do not continue generic visual loops. Do not touch WorldPrototype3D unless only reading it for context.",
    "If the current result already satisfies V1, make no extra changes and report commit-worthy files.",
    "If V1 is incomplete, make the smallest concrete foundation fix needed for one of: isolated scene, real-world scale, modular pieces, grid snapping, 90-degree rotation, place/remove, or tile/chunk data.",
    "Immediate stop conditions: WorldPrototype3D decoration, Korean countryside sample-image copying, Screenshot/Discord/UPM work, Meshy prop placement as main task, pretty-only work without place/rotate/remove, no tile/chunk data, or PID kill/Stop-Process attempts.",
    "Do not expand into inventory, crafting, combat, NPC systems, save/load repository, multiplayer, or approval tooling.",
    "Output must include changed files, commit recommendation, and explicit status for ModularConstructionPrototype.unity, scale, floor/wall/door/window/fence/gate, grid snapping, 90-degree rotation, place/remove, and tile/chunk data."
  ].filter(Boolean).join(" ");
}

function makeFullContinuationInstruction() {
  return [
    "Experimental continuation from the current commit/worktree point.",
    "Inspect the DeepStake3D PM source-of-truth docs and the current git diff before changing anything.",
    "If the latest PASS already satisfies the PM target, make no scene/design edits and report that no commit-worthy change is needed.",
    "Otherwise make exactly one minimal PM-compliant improvement to the current DeepStake3D first-screen pass.",
    "Stay within Controlled Recovery Outpost direction.",
    "Do not touch screenshot automation, UPM/licensing, gameplay systems, or unity/DeepStakeUnity.",
    "Report exact files changed, validation performed, and whether the change is commit-worthy."
  ].join(" ");
}

function makeFastContinuationInstruction(outboxPayload) {
  const previousTask = outboxPayload?.task_id ? `Previous task: ${outboxPayload.task_id}.` : "";
  return [
    "FAST DeepStake3D loop continuation.",
    previousTask,
    "First inspect git diff/status and the latest changed scene area.",
    "Make at most one small commit-worthy improvement to first-screen Controlled Recovery Outpost readability, or make no edits if the current diff is already sufficient.",
    "Keep PM rules: controlled settlement, authority/readability, no pretty-town drift.",
    "Do not touch screenshot automation, UPM/licensing, gameplay systems, or unity/DeepStakeUnity.",
    "Open the PM docs only if the diff does not give enough context.",
    "Report changed files, validation, and commit-worthiness."
  ].filter(Boolean).join(" ");
}

function getFailureSignature(outboxPayload) {
  const stderr = outboxPayload?.codex?.stderr || "";
  const stdout = outboxPayload?.codex?.stdout || "";
  const combined = `${stderr}\n${stdout}`;
  if (/usage limit|hit your usage limit|try again/i.test(combined)) return "usage-limit";
  if (/path too long|filename too long|name too long/i.test(combined)) return "path-too-long";
  if (/unexpected argument/i.test(combined)) return "codex-argument-error";
  return combined.replace(/\d{4}-\d{2}-\d{2}T[^\s]+/g, "<timestamp>").slice(0, 240) || "unknown-failure";
}

function makeStopDecision(summary, outboxPayload = null, findings = []) {
  return normalizeDecision({
    verdict: "stop",
    review_summary: summary,
    findings,
    next_task: null,
  }, outboxPayload);
}

function normalizeDecision(rawDecision, outboxPayload = null) {
  const decision = rawDecision && typeof rawDecision === "object" ? rawDecision : {};
  const verdict = ["request_changes", "approve_next", "stop"].includes(decision.verdict) ? decision.verdict : "request_changes";
  const findings = Array.isArray(decision.findings) ? decision.findings : [];
  const nextTask = decision.next_task && typeof decision.next_task === "object" ? decision.next_task : null;

  if (verdict === "stop") {
    return {
      verdict,
      review_summary: decision.review_summary || "Reviewer stopped the automatic loop.",
      findings,
      next_task: null,
    };
  }

  const fallbackId = `${verdict === "request_changes" ? "fix" : "fifth-dawn"}-${Date.now()}`;
  const fallbackInstruction = outboxPayload?.status === "failed"
    ? "Diagnose and fix the previous Codex task failure. Run the relevant build or typecheck command and report the result."
    : "Make the next small Fifth Dawn game improvement. Keep the change scoped and verify it with the relevant build or typecheck command.";

  return {
    verdict,
    review_summary: decision.review_summary || "Reviewer generated the next implementation task.",
    findings,
    next_task: {
      task_id: nextTask?.task_id || fallbackId,
      repo: nextTask?.repo || REPO_PATH,
      branch: nextTask?.branch || BRANCH,
      instruction: nextTask?.instruction || fallbackInstruction,
      constraints: Array.isArray(nextTask?.constraints) ? nextTask.constraints : [],
      role: "implementer",
      requested_by: REVIEWER_NAME,
      parent_task_id: outboxPayload?.task_id || null,
      created_at: new Date().toISOString(),
    },
  };
}

async function requestReviewAndNextTask(state, outboxPayload = null) {
  if (state.stopped || state.generatedCount >= MAX_AUTO_TASKS) {
    state.stopped = true;
    console.log(`[리뷰어] 중지됨: 생성작업=${state.generatedCount}, 최대=${formatMaxTasks()}`);
    return;
  }
  const backlog = await getQueueBacklog();
  if (backlog >= MAX_QUEUE_BACKLOG) {
    console.log(`[리뷰어] 대기열 과다: backlog=${backlog}, max=${MAX_QUEUE_BACKLOG}. 새 작업을 만들지 않습니다.`);
    return;
  }
  const prompt = outboxPayload
    ? [
      `Latest implementer result from pid ${IMPLEMENTER_PID}:\n${JSON.stringify(outboxPayload)}`,
      "Review the result first.",
      "If it failed or has concrete issues, use verdict=request_changes and make next_task fix the issue.",
      "If it is acceptable and the game should continue evolving, use verdict=approve_next and make next_task the next small implementation step.",
      "If the loop should stop, use verdict=stop and next_task=null."
    ].join("\n")
    : [
      `Initialize the reviewer/implementer ping-pong session. The implementer process pid is ${IMPLEMENTER_PID}.`,
      `Use repo=${REPO_PATH} branch=${BRANCH}.`,
      "Create the first small implementation task for Codex. Use verdict=approve_next because there is no previous result to review."
    ].join("\n");
  let response = null;
  let decision;
  if (USE_OPENAI_REVIEWER && OPENAI_API_KEY) {
    response = await callResponsesAPI([{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }], state.lastResponseId);
    decision = normalizeDecision(JSON.parse(extractText(response)), outboxPayload);
  } else {
    if (outboxPayload?.status === "failed" || outboxPayload?.codex?.exit_code !== 0) {
      const signature = getFailureSignature(outboxPayload);
      const nextConsecutiveFailures = state.lastFailureSignature === signature
        ? state.consecutiveFailures + 1
        : 1;
      state.consecutiveFailures = nextConsecutiveFailures;
      state.lastFailureSignature = signature;

      if (signature === "usage-limit") {
        decision = makeStopDecision(
          "Stopped loop because Codex reported a usage limit. Wait for the reported reset time, then restart with a fresh PM-approved task.",
          outboxPayload,
          [{
            severity: "blocking",
            issue: "Codex usage limit reached; retrying immediately would only burn loop turns.",
            evidence: signature,
          }],
        );
      } else if (nextConsecutiveFailures >= 3) {
        decision = makeStopDecision(
          `Stopped experimental loop after ${nextConsecutiveFailures} consecutive implementer failures with signature: ${signature}.`,
          outboxPayload,
          [{
            severity: "blocking",
            issue: "Consecutive failure guard tripped; reviewer will not enqueue another fix task.",
            evidence: signature,
          }],
        );
      }
    } else if (outboxPayload) {
      state.consecutiveFailures = 0;
      state.lastFailureSignature = null;
    }

    if (!decision) {
      decision = makeLocalReviewDecision(outboxPayload);
    }
  }
  const reviewId = outboxPayload?.task_id || `initial-${Date.now()}`;
  await writeJsonAtomic(path.join(reviewDir, `${reviewId}.review.json`), {
    reviewer: REVIEWER_NAME,
    implementer_pid: IMPLEMENTER_PID,
    reviewed_task_id: outboxPayload?.task_id || null,
    reviewed_at: new Date().toISOString(),
    ...decision,
  });
  console.log(`[리뷰어] 검토완료 ${reviewId}: 판정=${translateVerdict(decision.verdict)}`);
  console.log(`[리뷰어] 요약: ${summarize(decision.review_summary, 180)}`);
  console.log(`[리뷰어] 지적사항=${decision.findings.length}`);
  if (state.consecutiveFailures) console.log(`[리뷰어] 연속실패=${state.consecutiveFailures}/3 실패유형=${state.lastFailureSignature}`);

  if (decision.next_task) {
    const task = decision.next_task;
    await writeJsonAtomic(path.join(inboxDir, `${task.task_id}.json`), task);
    state.generatedCount += 1;
    console.log(`[리뷰어] 다음작업 등록 ${task.task_id} (${state.generatedCount}/${formatMaxTasks()})`);
    console.log(`[리뷰어] 다음지시: ${summarize(task.instruction, 180)}`);
  }

  if (decision.verdict === "stop") {
    state.stopped = true;
    console.log("[리뷰어] 완료: 다음 작업 없음. PM 판단이 필요합니다.");
  }
  state.lastResponseId = response?.id || state.lastResponseId;
}

async function getQueueBacklog() {
  const inboxFiles = await fs.readdir(inboxDir).catch(() => []);
  const processingDir = path.join(queueDir, "processing");
  const processingFiles = await fs.readdir(processingDir).catch(() => []);
  return inboxFiles.filter((file) => file.endsWith(".json")).length
    + processingFiles.filter((file) => file.endsWith(".json")).length;
}

function summarize(value, maxLength) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

function formatMaxTasks() {
  return Number.isFinite(MAX_AUTO_TASKS) ? String(MAX_AUTO_TASKS) : "unlimited";
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

async function pollLoop() {
  await ensureDirs();
  const state = await readState();
  if (state.stopped) return;
  const outboxFiles = await listFilesByMtime(outboxDir, ".result.json", "asc");
  const pending = outboxFiles.filter((f) => !state.processedOutbox.includes(f));
  if (pending.length === 0) {
    const inboxFiles = (await fs.readdir(inboxDir)).filter((f) => f.endsWith(".json"));
    const processingDir = path.join(queueDir, "processing");
    const processingFiles = (await fs.readdir(processingDir).catch(() => [])).filter((f) => f.endsWith(".json"));
    if (inboxFiles.length === 0 && processingFiles.length === 0 && !state.lastResponseId) { await requestReviewAndNextTask(state, null); await writeState(state); }
    return;
  }
  for (const file of pending) {
    const payload = JSON.parse(await fs.readFile(path.join(outboxDir, file), "utf-8"));
    await requestReviewAndNextTask(state, payload);
    state.processedOutbox.push(file);
    state.processedOutbox = state.processedOutbox.slice(-500);
    await writeState(state);
  }
}
await ensureDirs();
console.log(`[리뷰브리지] 실행 중: 리뷰어=${USE_OPENAI_REVIEWER && OPENAI_API_KEY ? `openai:${MODEL}` : "local"}`);
setInterval(async () => { try { await pollLoop(); } catch (e) { console.error("[리뷰브리지] 폴링 오류", e.message); } }, POLL_MS);

function translateVerdict(verdict) {
  if (verdict === "approve_next") return "다음작업승인";
  if (verdict === "request_changes") return "수정요청";
  if (verdict === "stop") return "중지";
  return verdict;
}
