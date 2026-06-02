function getFailureSignature(outboxPayload) {
  const stderr = outboxPayload?.codex?.stderr || "";
  const stdout = outboxPayload?.codex?.stdout || "";
  const combined = `${stderr}\n${stdout}`;
  if (/usage limit|hit your usage limit|try again/i.test(combined)) return "usage-limit";
  if (/path too long|filename too long|name too long/i.test(combined)) return "path-too-long";
  if (/unexpected argument/i.test(combined)) return "codex-argument-error";
  return combined.replace(/\d{4}-\d{2}-\d{2}T[^\s]+/g, "<timestamp>").slice(0, 240) || "unknown-failure";
}

function applyFailureGuard(state, outboxPayload) {
  const signature = getFailureSignature(outboxPayload);
  const nextConsecutiveFailures = state.lastFailureSignature === signature
    ? state.consecutiveFailures + 1
    : 1;
  state.consecutiveFailures = nextConsecutiveFailures;
  state.lastFailureSignature = signature;

  if (nextConsecutiveFailures >= 3) {
    state.stopped = true;
    return {
      verdict: "stop",
      review_summary: `Stopped experimental loop after ${nextConsecutiveFailures} consecutive implementer failures with signature: ${signature}.`,
      findings: [{
        severity: "blocking",
        issue: "Consecutive failure guard tripped; reviewer will not enqueue another fix task.",
        evidence: signature,
      }],
      next_task: null,
    };
  }

  return {
    verdict: "request_changes",
    review_summary: "Implementer task failed; next task is limited to diagnosing and fixing that failure.",
    findings: [{ severity: "blocking", issue: "Builder result failed.", evidence: signature }],
    next_task: { task_id: `fix-simulated-${nextConsecutiveFailures}` },
  };
}

const state = { consecutiveFailures: 0, lastFailureSignature: null, stopped: false };
const usageLimitFailure = {
  status: "failed",
  codex: {
    exit_code: 1,
    stdout: "",
    stderr: "ERROR: You've hit your usage limit. Try again later.",
  },
};

const decisions = [
  applyFailureGuard(state, usageLimitFailure),
  applyFailureGuard(state, usageLimitFailure),
  applyFailureGuard(state, usageLimitFailure),
];

if (decisions[0].verdict !== "request_changes" || !decisions[0].next_task) {
  throw new Error("First failure should request changes and queue a fix task.");
}

if (decisions[1].verdict !== "request_changes" || !decisions[1].next_task) {
  throw new Error("Second failure should request changes and queue one last fix task.");
}

if (decisions[2].verdict !== "stop" || decisions[2].next_task !== null) {
  throw new Error("Third consecutive failure should stop and not queue a fix task.");
}

if (state.consecutiveFailures !== 3 || state.lastFailureSignature !== "usage-limit" || state.stopped !== true) {
  throw new Error(`Unexpected final guard state: ${JSON.stringify(state)}`);
}

console.log("[test] failure guard stops after 3 consecutive usage-limit failures");
