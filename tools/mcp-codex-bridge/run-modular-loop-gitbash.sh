#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: ./run-modular-loop-gitbash.sh <implementer-pid> [codex-model]" >&2
  exit 2
fi

implementer_pid="$1"
codex_model="${2:-${CODEX_MODEL:-}}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_path="$(cd -- "$script_dir/../.." && pwd)"

if command -v cygpath >/dev/null 2>&1; then
  script_win="$(cygpath -w "$script_dir/Run-ModularLoop.ps1")"
  repo_win="$(cygpath -w "$repo_path")"
  codex_home_win="$(cygpath -w "$script_dir/.codex-loop")"
else
  script_win="$script_dir/Run-ModularLoop.ps1"
  repo_win="$repo_path"
  codex_home_win="$script_dir/.codex-loop"
fi

export MSYS2_ARG_CONV_EXCL='*'

exec powershell.exe \
  -NoProfile \
  -ExecutionPolicy Bypass \
  -File "$script_win" \
  -RepoPath "$repo_win" \
  -Branch "plan" \
  -TargetPid "$implementer_pid" \
  -ImplementerPid "$implementer_pid" \
  -ReviewerName "codex-reviewer" \
  -MaxAutoTasks "unlimited" \
  -MaxQueueBacklog 1 \
  -PollMilliseconds 500 \
  -CodexHome "$codex_home_win" \
  ${codex_model:+-CodexModel "$codex_model"}
