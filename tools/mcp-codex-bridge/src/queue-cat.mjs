import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const queueDir = path.join(root, "queue");
const target = process.argv[2] || "latest";

async function readText(filePath) {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (error) {
    console.error(`[queue:cat] cannot read ${filePath}: ${error.message}`);
    process.exitCode = 1;
    return null;
  }
}

async function latestFile(dir, suffix) {
  try {
    const files = (await fs.readdir(path.join(queueDir, dir)))
      .filter((file) => file.endsWith(suffix))
      .sort();
    const latest = files.at(-1);
    return latest ? path.join(queueDir, dir, latest) : null;
  } catch {
    return null;
  }
}

const aliases = {
  state: path.join(queueDir, "state", "gpt-session-state.json"),
  result: await latestFile("outbox", ".result.json"),
  review: await latestFile("reviews", ".review.json"),
  processing: await latestFile("processing", ".json"),
  inbox: await latestFile("inbox", ".json"),
};

if (target === "latest") {
  for (const key of ["state", "processing", "result", "review"]) {
    const filePath = aliases[key];
    if (!filePath) {
      console.log(`\n===== ${key}: none =====`);
      continue;
    }
    console.log(`\n===== ${key}: ${path.relative(root, filePath)} =====`);
    const text = await readText(filePath);
    if (text) console.log(text.trimEnd());
  }
} else {
  const filePath = aliases[target] || path.resolve(root, target);
  const text = await readText(filePath);
  if (text) console.log(text.trimEnd());
}
