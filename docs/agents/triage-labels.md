# Triage Labels

The skills speak in five canonical triage roles. In Linear we express the lifecycle
through workflow states and use labels only for the distinctions states can't carry.

| Canonical role    | Linear representation                       | Meaning                                  |
| ----------------- | ------------------------------------------- | ---------------------------------------- |
| `needs-triage`    | state **Backlog**                           | Maintainer needs to evaluate this issue  |
| `needs-info`      | label **needs-info** (state unchanged)      | Waiting on reporter for more information |
| `ready-for-agent` | state **Todo** + label **ready-for-agent**  | Fully specified, ready for an AFK agent  |
| `ready-for-human` | state **Todo** + label **ready-for-human**  | Requires human implementation            |
| `wontfix`         | state **Canceled**                          | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), set the
corresponding Linear state and/or label via `save_issue`.

The three labels (`needs-info`, `ready-for-agent`, `ready-for-human`) live on the
Auzum197 team. The states (Backlog, Todo, Canceled, Done) are Linear's built-in
workflow states.
