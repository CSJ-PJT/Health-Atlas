# MCP Codex Bridge

Local MCP server scaffold for ChatGPT <-> Codex task exchange.

## Tools

- `submit_task`: register a task with instruction/repo/branch/constraints.
- `task_status`: check a task status by `task_id`.
- `task_result`: fetch full stored task payload.

## Run

```bash
cd tools/mcp-codex-bridge
npm install
npm start
```

This initial scaffold keeps tasks in-memory and is intended as the first step before attaching a real Codex worker, persistence layer, and policy checks.


## Local orchestrator

This package now includes a file-based local orchestrator for GPT <-> Codex relay:

- place task JSON files in `queue/inbox/`
- orchestrator executes `codex exec <instruction>`
- read results from `queue/outbox/*.result.json`

```bash
npm run orchestrator
```


Run both MCP server and orchestrator together:

```bash
npm run dev:bridge
```

## GPT DeepStake auto bridge

Run GPT<->Codex auto loop (requires OpenAI API key):

```bash
export OPENAI_API_KEY=...
export OPENAI_MODEL=gpt-5
export REPO_PATH=/absolute/path/to/health-sync-daily
export BRANCH=mcp
npm run gpt:bridge
```

Full stack (MCP + orchestrator + GPT bridge):

```bash
npm run dev:all
```

Flow:
- GPT bridge seeds/creates `queue/inbox/*.json` tasks
- orchestrator executes Codex and writes `queue/outbox/*.result.json`
- GPT bridge reads results and requests next task from GPT via Responses API
