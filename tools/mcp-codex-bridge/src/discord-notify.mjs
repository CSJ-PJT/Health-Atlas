import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const repoRoot = path.resolve(root, "../..");
const queueDir = path.join(root, "queue");
const inboxDir = path.join(queueDir, "inbox");
const outboxDir = path.join(queueDir, "outbox");
const processingDir = path.join(queueDir, "processing");
const reviewsDir = path.join(queueDir, "reviews");
const decisionsDir = path.join(queueDir, "pm-decisions");
const stateDir = path.join(queueDir, "state");
const notifyStatePath = path.join(stateDir, "discord-notify-state.json");
const sessionStatePath = path.join(stateDir, "gpt-session-state.json");

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
const botToken = process.env.DISCORD_BOT_TOKEN;
const configuredChannelId = process.env.DISCORD_CHANNEL_ID;

const args = new Set(process.argv.slice(2));
const once = args.has("--once");
const latest = args.has("--latest");
const dryRun = args.has("--dry-run");
const watchDecisions = args.has("--watch-decisions") || process.env.DISCORD_WATCH_DECISIONS === "1";
const pollMs = Number(process.env.DISCORD_NOTIFY_POLL_MS || 5000);
const maxScreenshots = Number(process.env.DISCORD_SCREENSHOT_LIMIT || 10);

async function ensureDirs() {
  for (const dir of [reviewsDir, decisionsDir, stateDir, inboxDir, outboxDir, processingDir]) {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

async function readNotifyState() {
  const state = await readJson(notifyStatePath, {});
  return {
    sentReviews: state.sentReviews && typeof state.sentReviews === "object" && !Array.isArray(state.sentReviews)
      ? state.sentReviews
      : Object.fromEntries((Array.isArray(state.sentReviews) ? state.sentReviews : []).map((file) => [file, { status: "sent" }])),
    processedMessageIds: Array.isArray(state.processedMessageIds) ? state.processedMessageIds : [],
    updatedAt: state.updatedAt || null,
  };
}

async function writeNotifyState(state) {
  state.processedMessageIds = state.processedMessageIds.slice(-500);
  state.updatedAt = new Date().toISOString();
  await writeJson(notifyStatePath, state);
}

async function listReviewFiles() {
  const files = (await fs.readdir(reviewsDir).catch(() => []))
    .filter((file) => file.endsWith(".review.json"));
  const entries = await Promise.all(files.map(async (file) => ({
    file,
    mtimeMs: (await fs.stat(path.join(reviewsDir, file)).catch(() => ({ mtimeMs: 0 }))).mtimeMs,
  })));
  return entries.sort((a, b) => a.mtimeMs - b.mtimeMs).map((entry) => entry.file);
}

async function getPendingReviewFiles() {
  const files = await listReviewFiles();
  if (latest) return files.at(-1) ? [files.at(-1)] : [];

  const state = await readNotifyState();
  return files.filter((file) => !state.sentReviews[file]);
}

async function markSent(file, review, message = null) {
  const state = await readNotifyState();
  state.sentReviews[file] = {
    status: state.sentReviews[file]?.status || "pending",
    taskId: getReviewTaskId(review),
    messageId: message?.id || state.sentReviews[file]?.messageId || null,
    channelId: message?.channel_id || configuredChannelId || state.sentReviews[file]?.channelId || null,
    sentAt: state.sentReviews[file]?.sentAt || new Date().toISOString(),
  };
  await writeNotifyState(state);
}

async function updateDecision(taskId, status, reason, message) {
  const state = await readNotifyState();
  for (const [file, entry] of Object.entries(state.sentReviews)) {
    if (entry.taskId === taskId) {
      entry.status = status;
      entry.reason = reason || null;
      entry.decidedAt = new Date().toISOString();
      entry.decisionMessageId = message.id;
    }
  }
  if (!state.processedMessageIds.includes(message.id)) state.processedMessageIds.push(message.id);
  await writeNotifyState(state);
}

function getReviewTaskId(review) {
  return review.reviewed_task_id || review.next_task?.task_id || "initial";
}

function buildPmReviewMessage(review, result, screenshotPaths) {
  const taskId = getReviewTaskId(review);
  const findings = Array.isArray(review.findings) ? review.findings : [];
  const nextTask = review.next_task?.task_id || "None queued";
  const screenshotLine = screenshotPaths.length
    ? `최신 스크린샷 첨부: ${screenshotPaths.length}개`
    : "최신 스크린샷 없음: 마일스톤이 아직 진행 중이거나 결과 JSON에 screenshotPaths가 없습니다.";

  return [
    `## DeepStake PM 리뷰 보고`,
    `작업 ID: \`${taskId}\``,
    ``,
    `**변경 요약**`,
    summarizeVisualChange(review),
    ``,
    `**승인/반려 판단 기준**`,
    summarizeApprovalReason(review, findings),
    ``,
    `**첫 3초 플레이어 인상**`,
    summarizeFirstImpression(review),
    ``,
    `**스크린샷 증거**`,
    screenshotLine,
    ``,
    `**남은 리스크**`,
    summarizeRisk(findings, result, screenshotPaths),
    ``,
    `**다음 작업 후보**`,
    nextTask === "None queued" ? "다음 작업 없음. 계속 진행하려면 PM 판단이 필요합니다." : `후보 작업: \`${nextTask}\``,
    ``,
    `PM 응답 형식:`,
    `approve ${taskId}`,
    `reject ${taskId} <반려 사유>`,
  ].join("\n").slice(0, 1900);
}

function summarizeVisualChange(review) {
  const text = review.review_summary || "";
  if (/screenshot|visual|scene|boundary|route|authority|first/i.test(text)) return text;
  if (review.verdict === "request_changes") return "리뷰어가 blocking 이슈를 발견했으므로 최신 Builder 결과는 아직 승인 상태가 아닙니다.";
  return "최신 Builder 결과는 PM 검토 대기 상태입니다. 첨부된 스크린샷과 결과 요약을 먼저 확인하십시오.";
}

function summarizeApprovalReason(review, findings) {
  if (review.verdict === "request_changes") {
    const first = findings[0]?.issue || findings[0]?.evidence || "리뷰어가 수정을 요청했습니다.";
    return `다음 이슈가 허용 가능한 수준이 아니면 반려하십시오: ${first}`;
  }
  if (review.verdict === "stop") return "스크린샷과 결과가 마일스톤 완료를 증명할 때만 승인하십시오. 증거가 부족하면 이유를 적어 반려하십시오.";
  return "첨부 결과가 테스트맵이 아니라 실제 통제된 게임 공간으로 읽히면 승인하십시오.";
}

function summarizeFirstImpression(review) {
  const text = review.review_summary || "";
  if (/test map|first 3|3 seconds|controlled|authority|route|boundary/i.test(text)) return text;
  return "일반 플레이어가 즉시 통제된 복구 거점, 명확한 동선, 권위 압박, 의도적인 경계를 읽을 수 있는지 판단하십시오.";
}

function summarizeRisk(findings, result, screenshotPaths) {
  if (!screenshotPaths.length) return "현재 결과 JSON에서 명시적인 screenshotPaths를 찾지 못했습니다. 과거 스크린샷을 현재 증거로 간주하지 마십시오.";
  if (!findings.length) return "리뷰어 finding은 기록되지 않았습니다. PM은 첨부된 최신 스크린샷과 결과 요약 기준으로 판단하십시오.";
  return findings
    .slice(0, 3)
    .map((finding, index) => `${index + 1}. ${finding.issue || finding.evidence || JSON.stringify(finding)}`)
    .join("\n");
}

async function sendDiscord(reviewFile, review) {
  const result = await readResultForReview(review);
  const screenshots = await getExplicitScreenshotPaths(result);
  const content = buildPmReviewMessage(review, result, screenshots);

  if (dryRun) {
    console.log("[discord] dry-run");
    console.log(content);
    console.log(`[discord] screenshots=${screenshots.length}`);
    for (const file of screenshots) console.log(`- ${path.relative(repoRoot, file)}`);
    return null;
  }

  if (!webhookUrl) throw new Error("DISCORD_WEBHOOK_URL is required unless --dry-run is used.");

  const form = new FormData();
  form.append("payload_json", JSON.stringify({ content }));

  for (const [index, filePath] of screenshots.entries()) {
    const bytes = await fs.readFile(filePath);
    form.append(`files[${index}]`, new Blob([bytes]), path.basename(filePath));
  }

  const response = await fetch(`${webhookUrl}?wait=true`, { method: "POST", body: form });
  if (!response.ok) throw new Error(`Discord webhook failed ${response.status}: ${await response.text()}`);
  const message = await response.json().catch(() => null);
  console.log(`[discord] sent PM review ${reviewFile} screenshots=${screenshots.length}`);
  return message;
}

async function readResultForReview(review) {
  const taskId = review.reviewed_task_id;
  if (!taskId) return null;
  return readJson(path.join(outboxDir, `${taskId}.result.json`));
}

async function getExplicitScreenshotPaths(result) {
  if (!result) return [];
  const raw = [
    ...arrayOrEmpty(result.screenshotPaths),
    ...arrayOrEmpty(result.screenshot_paths),
    ...arrayOrEmpty(result.screenshots),
    ...arrayOrEmpty(result.artifacts?.screenshotPaths),
    ...arrayOrEmpty(result.artifacts?.screenshots),
  ];

  const resolved = [];
  for (const value of raw) {
    const candidate = typeof value === "string" ? value : value?.path || value?.file || value?.filePath;
    if (!candidate || !/\.(png|jpe?g|webp)$/i.test(candidate)) continue;
    const filePath = path.isAbsolute(candidate) ? candidate : path.resolve(repoRoot, candidate);
    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) resolved.push(filePath);
    } catch {
      console.log(`[discord] missing explicit screenshot: ${candidate}`);
    }
  }

  return [...new Set(resolved)].slice(0, maxScreenshots);
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

async function notifyTick() {
  const pending = await getPendingReviewFiles();
  for (const file of pending) {
    const review = await readJson(path.join(reviewsDir, file));
    if (!review) continue;
    const message = await sendDiscord(file, review);
    if (!dryRun) await markSent(file, review, message);
  }
}

async function decisionTick() {
  if (!watchDecisions) return;
  if (!botToken) {
    console.log("[discord] decision watch disabled: DISCORD_BOT_TOKEN is required.");
    return;
  }
  const readableChannelId = await resolveChannelId();
  if (!readableChannelId) return;

  const state = await readNotifyState();
  const processed = new Set(state.processedMessageIds);
  const response = await fetch(`https://discord.com/api/v10/channels/${readableChannelId}/messages?limit=50`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 403) {
      console.log(`[discord] decision watch disabled: bot cannot read channel ${readableChannelId}. Missing Access. Invite the bot to the server and grant View Channel + Read Message History.`);
      console.log(`[discord] detail: ${body}`);
      return;
    }
    if (response.status === 401) {
      console.log("[discord] decision watch disabled: invalid DISCORD_BOT_TOKEN.");
      return;
    }
    throw new Error(`Discord message fetch failed ${response.status}: ${body}`);
  }
  const messages = await response.json();

  for (const message of messages.reverse()) {
    if (processed.has(message.id)) continue;
    const decision = parseDecision(message.content || "");
    if (!decision) continue;
    await applyDecision(decision, message);
  }
}

async function resolveChannelId() {
  if (isSnowflake(configuredChannelId)) return configuredChannelId;

  if (configuredChannelId) {
    console.log(`[discord] DISCORD_CHANNEL_ID must be a numeric Discord channel ID, not "${configuredChannelId}".`);
  }

  const fromWebhook = await getWebhookChannelId();
  if (fromWebhook) return fromWebhook;

  console.log("[discord] decision watch disabled: set DISCORD_CHANNEL_ID to the numeric channel ID.");
  return null;
}

function isSnowflake(value) {
  return typeof value === "string" && /^\d{15,25}$/.test(value);
}

async function getWebhookChannelId() {
  if (!webhookUrl) return null;
  try {
    const response = await fetch(webhookUrl);
    if (!response.ok) return null;
    const webhook = await response.json();
    if (isSnowflake(webhook.channel_id)) {
      console.log(`[discord] using channel id from webhook: ${webhook.channel_id}`);
      return webhook.channel_id;
    }
  } catch {
    return null;
  }
  return null;
}

function parseDecision(content) {
  const match = content.trim().match(/^(approve|reject)\s+([^\s]+)(?:\s+([\s\S]+))?$/i);
  if (!match) return null;
  return {
    action: match[1].toLowerCase(),
    taskId: match[2].replace(/^`|`$/g, ""),
    reason: (match[3] || "").trim(),
  };
}

async function applyDecision(decision, message) {
  const reviewEntry = await findReviewForTask(decision.taskId);
  if (!reviewEntry) {
    console.log(`[discord] ignored decision for unknown task ${decision.taskId}`);
    return;
  }

  if (decision.action === "approve") {
    await writeJson(path.join(decisionsDir, `${decision.taskId}.approved.json`), {
      taskId: decision.taskId,
      action: "approve",
      decidedAt: new Date().toISOString(),
      discordMessageId: message.id,
      reviewFile: reviewEntry.file,
    });
    await enqueueNextTaskIfNeeded(reviewEntry.review);
    await updateDecision(decision.taskId, "approved", null, message);
    console.log(`[discord] PM approved ${decision.taskId}`);
    return;
  }

  await writeJson(path.join(decisionsDir, `${decision.taskId}.rejected.json`), {
    taskId: decision.taskId,
    action: "reject",
    reason: decision.reason || "No reason provided.",
    decidedAt: new Date().toISOString(),
    discordMessageId: message.id,
    reviewFile: reviewEntry.file,
  });
  await removeQueuedNextTask(reviewEntry.review);
  await stopSession(`PM rejected ${decision.taskId}: ${decision.reason || "No reason provided."}`);
  await updateDecision(decision.taskId, "rejected", decision.reason || "No reason provided.", message);
  console.log(`[discord] PM rejected ${decision.taskId}: ${decision.reason || "No reason provided."}`);
}

async function findReviewForTask(taskId) {
  const files = await listReviewFiles();
  for (const file of files.reverse()) {
    const review = await readJson(path.join(reviewsDir, file));
    if (!review) continue;
    if (getReviewTaskId(review) === taskId || review.next_task?.task_id === taskId) return { file, review };
  }
  return null;
}

async function enqueueNextTaskIfNeeded(review) {
  const task = review.next_task;
  if (!task?.task_id) return;

  const paths = [
    path.join(inboxDir, `${task.task_id}.json`),
    path.join(processingDir, `${task.task_id}.json`),
    path.join(outboxDir, `${task.task_id}.result.json`),
  ];
  for (const filePath of paths) {
    try {
      await fs.access(filePath);
      return;
    } catch {
      // Continue looking.
    }
  }
  await writeJson(path.join(inboxDir, `${task.task_id}.json`), task);
}

async function removeQueuedNextTask(review) {
  const taskId = review.next_task?.task_id;
  if (!taskId) return;
  await fs.rm(path.join(inboxDir, `${taskId}.json`), { force: true });
}

async function stopSession(reason) {
  const state = await readJson(sessionStatePath, {});
  await writeJson(sessionStatePath, {
    ...state,
    stopped: true,
    stopReason: reason,
    stoppedAt: new Date().toISOString(),
  });
}

async function tick() {
  await notifyTick();
  await decisionTick();
}

await ensureDirs();
console.log(`[discord] PM review bridge watching ${reviewsDir}`);
console.log(`[discord] notify=${dryRun ? "dry-run" : "send"} decisions=${watchDecisions ? "on" : "off"} once=${once} latest=${latest}`);

await tick();
if (!once) {
  setInterval(async () => {
    try {
      await tick();
    } catch (error) {
      console.error("[discord] error", error.message);
    }
  }, pollMs);
}
