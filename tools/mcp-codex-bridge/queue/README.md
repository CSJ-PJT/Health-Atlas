# Queue Format

The local orchestrator uses file-based queues:

- `queue/inbox/*.json`: tasks to execute
- `queue/processing/*.json`: task currently running
- `queue/outbox/*.result.json`: completed task results

## Task schema

```json
{
  "task_id": "deep-stake-001",
  "repo": "/path/to/repo",
  "branch": "mcp",
  "instruction": "Implement feature X and run tests",
  "constraints": ["Do not edit root src legacy tree"]
}
```

Run orchestrator:

```bash
npm run orchestrator
```

Optional env vars:

- `CODEX_BIN` (default: `codex`)
- `POLL_MS` (default: `2000`)
