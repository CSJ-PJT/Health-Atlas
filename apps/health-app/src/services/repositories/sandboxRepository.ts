import type { SandboxWorldState } from "@/components/entertainment/sandbox/sandboxTypes";

export function buildSandboxSnapshot(state: SandboxWorldState) {
  return {
    version: state.version,
    state,
    savedAt: new Date().toISOString(),
  };
}
