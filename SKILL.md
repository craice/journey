---
name: journey-artifacts
description: Use when asked to create or update a Service Blueprint or User Journey Map from a codebase — produces a single self-contained HTML file with every implementation claim backed by a verified file:line and every hole marked as a gap.
---

# Journey artifacts

You are producing a visual artifact — a Service Blueprint or a User Journey Map — that
tells the truth about a codebase. The artifact is a single HTML file: `template.html`
with its JSON data block replaced. Nothing else about the file changes.

The reason this document exists: a diagram only draws what you give it. If you fill a
cell with a guess, the artifact renders that guess with exactly as much confidence as a
verified fact — the reader cannot tell the difference. The whole value of this tool is
that they don't have to. **The single rule that protects that: never mark a cell
claiming the code does something as confirmed without a real `ref` (file:line) that you
have actually re-opened and verified, not merely cited. If you didn't find the code,
it's a gap, not a guess; and a `ref` pointing at the wrong line is worse than no `ref`
at all, because it carries a citation's authority while quietly contradicting the claim
next to it.** (Cells describing what a person does or sees, rather than what the code
does, are held to a related but looser standard — see "Extraction pass" below.)
Everything below exists in service of that rule.

## Quick start

Fetch the two files you need — the HTML shell you fill in, and the field reference for
its JSON:

```bash
curl -sL --fail https://raw.githubusercontent.com/craice/journey/main/template.html -o /tmp/journey-template.html
curl -sL --fail https://raw.githubusercontent.com/craice/journey/main/SCHEMA.md -o /tmp/journey-schema.md
```

`SCHEMA.md` is the field reference for every type, cell shape, and validation error.
This document tells you the process; consult `SCHEMA.md` whenever you're unsure of a
field's name, type, or constraint rather than guessing or re-deriving it here.

## Pick the artifact type

Two shapes exist in v1: `blueprint` and `journey`. Flow (branching, non-linear
processes) is deferred to v2 — if the request is for a flow or the flow doesn't fit a
straight line of steps, say so and produce the closest linear reading you honestly can,
or ask which of the two v1 shapes fits best. Do not improvise a third shape or bend the
schema to fake branching.

- **`blueprint`** — the question is *how the service delivers this*: frontstage,
  backstage, support processes, where the seams are. Typical lanes: Evidence, User
  actions, Frontstage, Backstage, Support processes.
- **`journey`** — the question is *what this feels like*: actions, emotion, quotes,
  opportunities. Requires exactly one lane with `kind: "emotion"`. Typical lanes:
  Actions, Emotion, Saying, Opportunities.

Both share the same `steps` spine — a short ordered list of the stages a user or
request passes through (5–8 is typical; more than that usually means the steps are cut
too fine).

## Extraction pass

Read the codebase and fill lanes from what you find, following this mapping. It's
written for the common case of a web or mobile app; adapt the same idea to whatever
you're actually looking at (a CLI, an agent workflow, a backend service with no UI) —
map `steps` to the natural stages the request or user passes through, and match each
lane to whatever in that system plays the analogous role. A concern that genuinely has
no counterpart in the system you're mapping (no background jobs at all, no async layer)
is a real finding, not a table cell you're obligated to fill — see "Gap rules" below on
when that's a gap versus when it's simply out of scope.

| Source in the code | Feeds |
|---|---|
| Routes and pages | `steps` |
| Forms, buttons, links | User actions lane |
| Components rendered per route | Frontstage lane |
| API handlers, server actions, database writes | Backstage lane |
| Jobs, queues, webhooks, crons | Support processes lane |
| Emails, push, SMS templates | Evidence lane |
| Error, empty, and loading states | Wherever the journey breaks — often a gap |

Two kinds of lane make different claims, and that changes what counts as "confirmed"
in each. **Implementation lanes** — Frontstage, Backstage, Support processes, and any
lane you add that plays the same role — assert that code does something; every
non-gap cell in one of these needs a `ref`, per the rule below. **Experience lanes** —
Evidence, User actions, Emotion, Quotes, Opportunities — describe what a person
encounters or does, which usually isn't one line of code to point at. A `ref` there is
welcome when one naturally exists (a copy string, an email template) but its absence
doesn't make the cell a guess the way it would in an implementation lane. `SCHEMA.md`'s
own worked examples follow this split: look at how `blueprint-onboarding.json`'s
Evidence and User actions cells carry no `ref` while its Backstage and Frontstage
cells do.

When it's unclear which kind a lane is — a lane you invented that doesn't map cleanly
onto either list — treat it as an implementation lane and require the `ref`. The
ambiguity is not a reason to relax the rule; it's a reason to hold the higher bar,
since the whole point of the split is to keep the ref requirement from being dodged by
relabeling.

Record the `path:line` of what you find **as you go, while the file is open** — not
afterwards from memory. Memory drifts; a line number you copy while reading the file
does not. If your tool access lets you grep or open files, do the extraction pass
before you write a single cell — build a working list of (step, lane, ref) triples,
then turn that list into JSON. Don't write prose cell text first and backfill refs
second; that order is exactly how confident fiction gets in.

Precision is far easier to preserve at the moment you have the file open than to
reconstruct afterward, so protect it: write down the line number when you're looking
straight at it and the cell's claim is fresh, never from a recollection of roughly
where something was. And treat any file you cite as live, not frozen — if you (or the
extraction pass itself) edit a file after citing a line in it, including this document
or `template.html` while you're assembling the artifact, everything below your edit
shifts. Re-open the cited file and re-check the line before you finish, rather than
trusting a number you recorded before the file changed underneath it.

If the codebase is large, scope the pass to the flow you were asked about (e.g. "the
signup flow") rather than trying to map the whole application into one artifact.

## Gap rules

This is the section that matters most. Two flags exist, and they mean different
things:

- **`flag: "gap"`** — the journey clearly needs this step and no corresponding code
  exists. A failure path with no screen. A confirmation nothing sends. A state nothing
  reports. There is nothing to point a `ref` at, so a gap cell never carries one.
- **`flag: "risk"`** — code exists but is fragile: an empty `catch`, a `TODO` or
  `FIXME` sitting on the path, a network call with no timeout or retry, an error the UI
  swallows or ignores. A risk cell *does* carry a `ref` — you found the code, you're
  flagging its quality, not its absence.

### Routes belong to screens

A `route` is the address of a screen in the running product: `/signup`, `/orders/:id`.
Put one on every Frontstage cell that names a screen, because that is what a reader
scanning the whole journey wants to follow — the path a person walks, not the file
tree. Leave `route` off Backstage and Support processes: an endpoint or a queued job
is not a screen, and stretching the field to cover them makes artifacts from different
projects stop meaning the same thing. Those lanes keep their `ref`, which is what the
artifact shows for them in either mode.

The rule that governs both, on implementation lanes (see "Extraction pass" above for
the implementation/experience split): **never mark a cell as confirmed without a real
address — a verified `route` or a verified `ref`.** If you searched the system you're mapping and found nothing, the cell is a
gap — write `flag: "gap"` and explain what's missing in `note`, don't leave the cell
out of the artifact and don't write text that reads as if the step is handled. If you
didn't search at all (out of scope, too large, ran out of time), say so in your report
rather than filling the cell with a plausible-sounding guess — an unexamined area is
not the same as a confirmed gap, and neither is the same as a confirmed cell.

A gap is a claim about the system you're mapping: *this should exist here and doesn't*.
It is not the right flag for something that was never this system's job in the first
place — a concern that properly belongs to a different, surrounding system (the chat
client the request arrived through, the reader's OS opening the file) isn't a hole in
the codebase you're blueprinting. For a step where a lane has nothing in-scope to show,
leave that cell out entirely — an omitted cell renders as an empty column per
`SCHEMA.md`, and an empty column reads honestly as "not this system's concern," where a
gap would wrongly read as "this system is missing something it owns."

Do not invent steps or cells to make the journey look complete. A five-step journey
with two honest gaps is worth more than an eight-step artifact that reads clean because
weak spots were smoothed over or skipped. The sparse, honest version is the product;
the complete-looking one is the failure mode this tool exists to prevent.

## Write the file

1. Build the JSON object per `SCHEMA.md` — `type`, `title`, optional `subtitle` and
   `meta`, `steps`, `lanes`, optional `dividers`.
2. Take the fetched `template.html` and replace the contents of
   `<script type="application/json" id="artifact">...</script>` with your JSON,
   serialized with normal indentation.
3. **Escape `</script`.** A literal `</script` sequence anywhere inside the JSON text —
   most likely inside a `text`, `note`, or `ref` string that quotes real code — closes
   the surrounding `<script type="application/json">` tag at HTML *parse* time, before
   any JavaScript runs. This silently truncates the JSON and dumps whatever follows
   into the page as raw HTML: a broken artifact at best, an injection risk at worst if
   the quoted text came from somewhere untrusted. Before writing the file, replace
   every occurrence of `</script` (case-insensitive) in the serialized JSON with
   `<\/script`. This is exactly the kind of thing real code contains — a branch name,
   a path, a snippet showing a closing tag — so treat it as a routine step, not an edge
   case.
4. Write the result to `docs/artifacts/<name>.<type>.html`, e.g.
   `docs/artifacts/onboarding.blueprint.html` or
   `docs/artifacts/checkout.journey.html`. Create the `docs/artifacts/` directory if it
   doesn't exist. Choose `<name>` from the flow you mapped (kebab-case), not from the
   artifact type.
5. Report the path you wrote and the gap count (see self-check below).

## Update an existing artifact

When the request is to refresh an artifact that already exists at that path:

1. Read the file and extract the JSON out of its
   `<script type="application/json" id="artifact">` block.
2. Re-run the extraction pass against the current code, and diff the result against
   the existing JSON: which cells still hold, which refs moved (line numbers shift),
   which gaps got closed, which risks got worse or better, which steps or lanes no
   longer apply.
3. **Never touch a cell carrying `"pinned": true`**, in text, ref, note, or flag — not
   even to fix a stale line number. `pinned` marks a manual correction the user made on
   top of your extraction; overwriting it defeats the reason it exists. If the code
   backing a pinned cell has clearly changed underneath it, leave the cell alone and
   mention the discrepancy in your report instead of resolving it yourself.
4. Rewrite the file the same way as a fresh write (full JSON, `</script` escaped,
   same path).
5. Report what changed: cells added, cells removed, cells re-referenced (ref updated,
   text unchanged), and flags cleared or newly raised. Note any pinned cells you left
   alone despite a suspected drift.

## Self-check before delivering

The renderer validates on load and fails loudly on a malformed artifact — but check
these yourself before calling the work done, so the failure never reaches the reader:

- [ ] The JSON parses.
- [ ] Every `cell.step` in every lane names a real id in `steps`.
- [ ] Every `divider.after` names a real id in `lanes`.
- [ ] A `journey` artifact has exactly one lane with `kind: "emotion"`; a `blueprint`
      has zero or one.
- [ ] Every non-gap cell in an implementation lane (Frontstage, Backstage, Support
      processes, or your equivalents) carries a non-empty `route` or `ref`. Screen
      cells may rely on the `route` alone; a lane with no screens has only `ref`.
- [ ] **Every `route` was read, not guessed.** A route is the one field a framework's
      conventions let you invent without opening anything — `/signup` is the obvious
      guess in any file-routed app, and it is wrong often enough to matter. Take each
      route from the routing configuration itself (the route file, the router table,
      the path decorator) and name in your report where you read it. A route you
      inferred from a folder name is a guess wearing a citation.
- [ ] **Every `ref` is right, not just present.** For each cell that carries one,
      re-open that exact file at that exact line — right now, not from memory of
      having checked it earlier — and confirm the line actually holds, or is squarely
      inside, the thing the cell's text claims. A `ref` that merely exists but points
      at the wrong line, the wrong function, or a stale location after an edit is
      worse than no `ref` at all: it reads as a verified fact while quietly pointing
      the reader somewhere that contradicts it. If a line doesn't hold up, fix the
      number; if you can't relocate the real one, drop the `ref` and downgrade the
      cell to `flag: "gap"` rather than leave a citation you haven't actually checked.
- [ ] No literal `</script` survives unescaped anywhere in the serialized JSON.
- [ ] The gap/risk count you report matches the actual flags in the data — recount
      from the JSON, don't recall the number from memory while writing the report.

If you have access to Node, the fastest way to check the structural rules (not the
`</script` one) is to lift `validateModel` out of `template.html`'s
`<script id="core">` block and run it against your JSON directly — see
`tests/helpers/load-core.mjs` in the journey repository for the extraction pattern if
you're working inside a checkout of it. Outside a checkout, do the checklist by eye
against `SCHEMA.md`'s validation error list.

## What this is not

- No libraries, no framework, no build step. The artifact is one `.html` file that
  opens offline by double-click — nothing in it may fetch, import, or load anything at
  runtime.
- No splitting the artifact across multiple files. One file, one `<script
  type="application/json">` block, full stop.
- No third artifact type. If Flow would fit better, say so in your report; don't bend
  `blueprint` or `journey` to fake it.
