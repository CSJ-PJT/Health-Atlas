import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const queueDir = path.join(root, "queue");
const dirs = ["inbox", "outbox", "processing", "reviews", "state"];

for (const dir of dirs) {
  const target = path.join(queueDir, dir);
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true });
}

console.log(`[queue:reset] cleared ${queueDir}`);
