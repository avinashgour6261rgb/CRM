# Antigravity Autonomous Rules: Zero Redundant Reads & Precise Execution

## 1. Zero Redundant Reading (Strict Rule)
- Do NOT read large multi-thousand line files in sequential batches just to locate a section.
- Always refer to `AGENTS.md` which contains the indexed line boundaries for all major features in the application.
- Target only the exact line range needed for an edit (`StartLine` and `EndLine` within 30-50 lines).

## 2. Fast Self-Validation
- After any code modification to JavaScript/JSX files, immediately validate syntax via `node -e "require('esbuild').transformSync(...)"` before returning to the user.
- This prevents syntax/JSX mismatch bugs and avoids server 500 errors.

## 3. Preservation of Clean Architecture
- Ensure new features adhere to existing patterns:
  - Keep dashboard cards focused on today's live data.
  - Keep admin employee switching synced via `effectiveTargetUser`.
  - Always dispatch the appropriate sync event (`ems_force_clock_out`, `ems_task_timer_paused`, `hrms_storage_change`) when state changes occur.
