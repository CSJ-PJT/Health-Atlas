import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const rootDir = process.cwd();

async function loadTranspiledModule(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  const source = await readFile(fullPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: fullPath,
  }).outputText;

  const encoded = Buffer.from(transpiled, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

async function loadTranspiledModuleWithoutImports(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  const source = await readFile(fullPath, "utf8");
  const stripped = source.replace(/^import .*;$/gm, "");
  const transpiled = ts.transpileModule(stripped, {
    compilerOptions: {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: fullPath,
  }).outputText;

  const encoded = Buffer.from(transpiled, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

async function run() {
  let passed = 0;

  const qualityModule = await loadTranspiledModule("src/services/healthDataQuality.ts");
  const localAiModule = await loadTranspiledModule("src/services/localAiEngine.ts");
  const verifiedRecordModule = await loadTranspiledModuleWithoutImports("src/services/verifiedRecordStore.ts");

  const qualityFlags = qualityModule.analyzeRecordQuality({
    running_data: {
      summary: {
        distanceKm: 130,
        durationMinutes: 950,
        avgHeartRate: 0,
        averageSpeed: 28,
        maxSpeed: 45,
        avgPace: 2,
      },
    },
    sleep_data: { totalMinutes: 980 },
    nutrition_data: { calories: 0, protein: 0 },
    steps_data: { count: 71000 },
  });

  assert.ok(Array.isArray(qualityFlags), "quality flags should be an array");
  assert.ok(qualityFlags.length >= 5, "quality flags should detect multiple anomalies");
  assert.ok(qualityFlags.some((flag) => flag.key === "distance_outlier"), "distance outlier should be detected");
  assert.ok(qualityFlags.some((flag) => flag.key === "heart_rate_missing"), "missing heart rate should be detected");
  assert.ok(qualityFlags.some((flag) => flag.key === "steps_outlier"), "step outlier should be detected");
  passed += 1;

  const qualitySummary = qualityModule.summarizeQualityFlags(qualityFlags);
  assert.equal(typeof qualitySummary, "string");
  assert.ok(qualitySummary.length > 0, "quality summary should not be empty");
  passed += 1;

  const greetingReply = localAiModule.generateLocalAiReply("hello coach");
  assert.equal(typeof greetingReply, "string");
  assert.ok(greetingReply.length > 0, "greeting reply should not be empty");
  passed += 1;

  const groupReply = localAiModule.generateLocalAiReply("오늘 같이 해볼까?", {
    roomName: "러닝 모임",
    roomType: "group",
    participantNames: ["민서", "서연"],
  });
  assert.equal(typeof groupReply, "string");
  assert.ok(groupReply.length > 0, "group reply should not be empty");
  passed += 1;

  const blueprint = localAiModule.buildLocalAiBlueprint();
  assert.equal(blueprint.name, "RH Local AI");
  assert.ok(Array.isArray(blueprint.modules), "blueprint modules should be an array");
  assert.ok(blueprint.modules.includes("chat-reply"), "blueprint should include chat-reply");
  passed += 1;

  assert.equal(
    verifiedRecordModule.buildRecordTag({ type: "full", officialTime: "2:59:59" }),
    "Sub3",
    "full marathon under 3 hours should map to Sub3",
  );
  assert.equal(
    verifiedRecordModule.buildRecordTag({ type: "full", officialTime: "3:50:22" }),
    "Sub4",
    "full marathon under 4 hours should map to Sub4",
  );
  assert.equal(
    verifiedRecordModule.buildRecordTag({ type: "half", officialTime: "1:45:00" }),
    "Half 1:45:00",
    "half marathon should use Half prefix",
  );
  assert.equal(
    verifiedRecordModule.buildRecordTag({ type: "10k", officialTime: "0:48:10" }),
    "10K 0:48:10",
    "10k should use 10K prefix",
  );
  passed += 1;

  console.log(`Service tests passed: ${passed}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
