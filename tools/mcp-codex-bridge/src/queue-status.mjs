import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const queueDir = path.join(root, "queue");

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

async function listJson(dir, suffix) {
  try {
    const directory = path.join(queueDir, dir);
    const files = (await fs.readdir(directory)).filter((file) => file.endsWith(suffix));
    const entries = await Promise.all(files.map(async (file) => {
      const fileStat = await fs.stat(path.join(directory, file)).catch(() => ({ mtimeMs: 0 }));
      return { file, mtimeMs: fileStat.mtimeMs };
    }));

    return entries
      .sort((left, right) => left.mtimeMs - right.mtimeMs || left.file.localeCompare(right.file))
      .map((entry) => entry.file);
  } catch {
    return [];
  }
}

const [inbox, processing, outbox, reviews] = await Promise.all([
  listJson("inbox", ".json"),
  listJson("processing", ".json"),
  listJson("outbox", ".result.json"),
  listJson("reviews", ".review.json"),
]);
const state = await readJson(path.join(queueDir, "state", "gpt-session-state.json"), {});
const outboxStats = await countOutboxStatuses(outbox);
const activeFailureSignature = state.lastFailureSignature && String(state.lastFailureSignature).trim()
  ? state.lastFailureSignature
  : null;
const consecutiveFailures = activeFailureSignature ? Number(state.consecutiveFailures || 0) : 0;

console.log(`[큐] 대기=${inbox.length} 진행중=${processing.length} 결과=${outbox.length} 리뷰=${reviews.length}`);
console.log(`[큐] 생성작업=${state.generatedCount ?? 0} 중지됨=${Boolean(state.stopped) ? "예" : "아니오"}`);
console.log(`[큐] 성공=${outboxStats.done} 실패=${outboxStats.failed} 기타=${outboxStats.other}`);
console.log(`[실패가드] 연속실패=${consecutiveFailures}/3 최근실패=${activeFailureSignature || "없음"}`);
console.log(`[판단] ${recommendAction({ inbox, processing, state, outboxStats, consecutiveFailures })}`);

if (processing.length) {
  const task = await readJson(path.join(queueDir, "processing", processing.at(-1)), {});
  console.log(`[진행중] ${task.task_id || processing.at(-1)}`);
  console.log(`[진행중] ${summarize(task.instruction || "", 180)}`);
}

if (outbox.length) {
  const result = await readJson(path.join(queueDir, "outbox", outbox.at(-1)), {});
  console.log(`[최신결과] ${result.task_id} 상태=${translateStatus(result.status)} 종료코드=${result.codex?.exit_code}`);
  const changedFiles = extractChangedFiles(result.codex?.stdout || "");
  if (changedFiles.length) console.log(`[최신결과] 변경파일=${changedFiles.join(", ")}`);
}

if (reviews.length) {
  const review = await readJson(path.join(queueDir, "reviews", reviews.at(-1)), {});
  console.log(`[최신리뷰] ${review.reviewed_task_id || reviews.at(-1)} 판정=${translateVerdict(review.verdict)}`);
  console.log(`[최신리뷰] ${summarize(review.review_summary || "", 180)}`);
}

function summarize(value, maxLength) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

function extractChangedFiles(stdout) {
  const files = new Set();
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/-\s+\[([^\]]+)\]\(([^:)]+)(?::\d+)?\)/) || line.match(/Only tracked changed file is `([^`]+)`/);
    if (match) files.add(match[2] || match[1]);
  }
  return [...files].slice(0, 8);
}

async function countOutboxStatuses(files) {
  const stats = { done: 0, failed: 0, other: 0 };
  for (const file of files) {
    const result = await readJson(path.join(queueDir, "outbox", file), {});
    if (result.status === "done") stats.done += 1;
    else if (result.status === "failed") stats.failed += 1;
    else stats.other += 1;
  }
  return stats;
}

function translateStatus(status) {
  if (status === "done") return "완료";
  if (status === "failed") return "실패";
  return status || "알수없음";
}

function translateVerdict(verdict) {
  if (verdict === "approve_next") return "다음작업승인";
  if (verdict === "request_changes") return "수정요청";
  if (verdict === "stop") return "중지";
  return verdict || "알수없음";
}

function recommendAction({ inbox, processing, state, outboxStats, consecutiveFailures }) {
  if (processing.length) return "구현자가 작업 중입니다. 기다리거나 queue:cat -- processing으로 내용을 확인하세요.";
  if (state.stopped) return "루프가 중지됐습니다. 결과를 검토한 뒤 필요하면 queue:reset 후 다시 실행하세요.";
  if (consecutiveFailures >= 2) return "연속 실패가 2회 이상입니다. 다음 실패 시 자동 중지됩니다. 최신 실패 로그를 확인하세요.";
  if (inbox.length) return "대기 작업이 있습니다. orchestrator가 곧 처리해야 합니다.";
  if (outboxStats.failed > outboxStats.done && outboxStats.failed > 0) return "실패가 성공보다 많습니다. 제한 모드(dev:review2/3)를 권장합니다.";
  return "현재 대기/진행 작업은 없습니다. 루프 프로세스가 켜져 있으면 다음 이벤트를 기다리는 상태입니다.";
}
