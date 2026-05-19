import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const tasks = new Map();

const server = new Server(
  {
    name: "mcp-codex-bridge",
    version: "0.1.0",
  },
  {
    capabilities: { tools: {} },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "submit_task",
      description:
        "Register a Codex task for a local repository with constraints and return a task id.",
      inputSchema: {
        type: "object",
        properties: {
          instruction: { type: "string" },
          repo: { type: "string" },
          branch: { type: "string" },
          constraints: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["instruction", "repo", "branch"],
      },
    },
    {
      name: "task_status",
      description: "Read the current status of a submitted task.",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "string" },
        },
        required: ["task_id"],
      },
    },
    {
      name: "task_result",
      description: "Return full task details and output if available.",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "string" },
        },
        required: ["task_id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "submit_task") {
    const taskId = randomUUID();
    const task = {
      task_id: taskId,
      status: "queued",
      instruction: args.instruction,
      repo: args.repo,
      branch: args.branch,
      constraints: Array.isArray(args.constraints) ? args.constraints : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      result: null,
    };

    tasks.set(taskId, task);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ok: true,
              task_id: taskId,
              status: task.status,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  if (name === "task_status") {
    const task = tasks.get(args.task_id);
    if (!task) {
      return {
        isError: true,
        content: [{ type: "text", text: `Task not found: ${args.task_id}` }],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ok: true,
              task_id: task.task_id,
              status: task.status,
              updated_at: task.updated_at,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  if (name === "task_result") {
    const task = tasks.get(args.task_id);
    if (!task) {
      return {
        isError: true,
        content: [{ type: "text", text: `Task not found: ${args.task_id}` }],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ ok: true, task }, null, 2),
        },
      ],
    };
  }

  return {
    isError: true,
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
