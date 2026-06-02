const intervalSeconds = Number(process.argv[2] || process.env.QUEUE_WATCH_SECONDS || 5);

function clearScreen() {
  process.stdout.write("\x1Bc");
}

async function runStatus() {
  clearScreen();
  console.log(`[감시] ${intervalSeconds}초마다 새로고침합니다. 중지하려면 Ctrl+C`);
  console.log(`[감시] ${new Date().toLocaleString()}\n`);

  try {
    await import(`./queue-status.mjs?ts=${Date.now()}`);
  } catch (error) {
    console.error("[감시] 상태 확인 실패:", error.message);
  }

  setTimeout(runStatus, Math.max(1, intervalSeconds) * 1000);
}

runStatus();
