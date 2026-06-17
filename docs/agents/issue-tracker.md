# Issue tracker: Linear

Issues and PRDs for this repo live in Linear, not GitHub. Use the Linear MCP tools
(`mcp__claude_ai_Linear__*`) for all operations. The relevant MCP tool schemas are
deferred — load them with ToolSearch (`select:mcp__claude_ai_Linear__save_issue,...`)
before calling.

## Target project and team

- **Team**: Auzum197 (key `AUZ`)
- **Project**: Pendrake Watch-only (`6ca678bf-15d3-4116-81da-c9f370695977`)

Create every issue in that team and project unless the user says otherwise.

## Conventions

- **Create an issue**: `save_issue` with `team: "Auzum197"`, `project: "Pendrake Watch-only"`,
  a `title`, and a markdown `description`.
- **Read an issue**: `get_issue` by identifier (e.g. `AUZ-123`). Use `list_comments` for its thread.
- **List issues**: `list_issues` filtered by `team`, `project`, `state`, or `label`.
- **Comment**: `save_comment` with the issue id and markdown `body`.
- **Apply labels / change state**: `save_issue` with the existing issue id, setting `labels`
  and/or `state`.
- **Close**: `save_issue` setting `state` to `Done` (resolved) or `Canceled` (wontfix).

## When a skill says "publish to the issue tracker"

Create a Linear issue in the Pendrake Watch-only project.

## When a skill says "fetch the relevant ticket"

Call `get_issue` with the Linear identifier (e.g. `AUZ-123`).
