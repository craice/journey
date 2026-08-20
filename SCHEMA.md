# Artifact schema

Field reference for the JSON that `template.html` renders as a Service Blueprint or
User Journey Map. This is the authority a coding agent should consult when unsure of a
field, and what a human reads to hand-write an artifact. Where this document and the
code in `template.html` disagree, the code wins — this file documents `validateModel`,
`buildLayout`, and `collectFlags` as written.

## Where the data lives

The artifact is a single JSON object inside:

```html
<script type="application/json" id="artifact">
{ ... }
</script>
```

**Warning — `</script` inside the JSON breaks the page.** A literal `</script` sequence
anywhere in the JSON text (for example inside a `"text"` or `"note"` string) closes the
`<script type="application/json">` tag at HTML *parse* time, before any JavaScript runs.
This produces a file that is both broken and — if the surrounding text is attacker-
controlled — dangerous, since whatever follows is parsed as HTML. Anyone writing or
generating this block, by hand or by tool, must escape any occurrence as `<\/script`.

## Top level

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | `"blueprint" \| "journey"` | yes | Must be one of these two values. |
| `title` | string | yes | Must be non-empty (after trimming). Used as the page `<h1>` and browser tab title. |
| `theme` | string | no | `blocks` (default), `paper` or `bands`. Sets which layout the artifact opens in; the reader can switch with the toolbar's select, and that choice is not saved back to the file. |
| `subtitle` | string | no | Shown next to the title in the masthead; falls back to "Journey" in the tab title if absent. |
| `meta.version` | string | no | Shown in the masthead if present. Not validated. |
| `meta.date` | string | no | Shown in the masthead if present. Not validated. |
| `meta.source` | string | no | Shown in the masthead if present. Not validated. |
| `steps` | array of Step | yes | Must contain at least one step. |
| `lanes` | array of Lane | yes | Must contain at least one lane. |
| `dividers` | array of Divider | no | May be omitted or empty. |

## Step

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Non-empty, unique across all steps. Referenced by cells and never by position — a lane lists only the cells it has, and any step it omits renders as an empty column. |
| `label` | string | yes | Non-empty. Column heading text. |

## Lane

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Non-empty, unique across all lanes. Referenced by dividers. |
| `label` | string | yes | Non-empty. Row heading text. |
| `kind` | `"cards" \| "emotion"` | yes | Must be one of these two values. |
| `cells` | array of Cell | no | Cards lane cells use the Cards cell shape; emotion lane cells use the Emotion cell shape. An artifact may hold at most one `emotion` lane; a `journey` artifact requires exactly one. |

## Cards cell

Used when the containing lane's `kind` is `"cards"`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `step` | string | yes | Must name an existing step id. |
| `text` | string | yes | Non-empty. Required only on cards cells, not on emotion cells. |
| `ref` | string | no | Free-form `path:line` pointer into the source. Not validated. |
| `route` | string | no | The address of the screen in the running product (`/signup`). Shown in place of `ref` while the artifact is in route mode. Not validated. |
| `note` | string | no | Free-form annotation, rendered under the text/ref. Not validated. |
| `flag` | `"gap" \| "risk"` | no | If present, must be one of these two values. `gap`: no corresponding code exists. `risk`: code exists but is fragile. |
| `span` | integer | no | Defaults to `1`. Must be an integer of 1 or more. May not run past the last step, and may not overlap another cell in the same lane. |
| `pinned` | boolean | no | Not validated by `validateModel`; the renderer only checks `=== true`, so any other value is treated as unpinned. Tells an updating agent not to overwrite this cell — a contract with the agent, not something the renderer draws. |

## Emotion cell

Used when the containing lane's `kind` is `"emotion"`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `step` | string | yes | Must name an existing step id. |
| `score` | integer | yes | Must be an integer from −3 to +3 inclusive. |
| `label` | string | no | Caption shown near the plotted point. If a flagged emotion cell has no `label`, the gap/risk summary falls back to a signed score string (e.g. `+2`, `-1`) — `label` is optional in practice. |
| `flag` | `"gap" \| "risk"` | no | Same values and meaning as on a cards cell. |
| `pinned` | boolean | no | Same meaning as on a cards cell. |

Emotion cells share `span` and overlap rules with cards cells (span defaults to 1, must
not run past the last step, must not overlap another cell in the lane) since those
checks apply to every cell regardless of lane kind.

## Divider

| Field | Type | Required | Notes |
|---|---|---|---|
| `after` | string | yes | Must name an existing lane id. The divider is drawn after that lane's row. |
| `label` | string | no | Caption shown under the divider rule. Defaults to none. |

## Worked example: Service Blueprint

Copied verbatim from `examples/src/blueprint-onboarding.json`.

```json
{
  "type": "blueprint",
  "title": "Onboarding",
  "subtitle": "Service Blueprint",
  "meta": { "version": "v1", "date": "2026-08-19", "source": "acme/app@a1b2c3d" },
  "steps": [
    { "id": "discover", "label": "Discovers" },
    { "id": "signup", "label": "Signs up" },
    { "id": "pay", "label": "Pays" },
    { "id": "wait", "label": "Waits" },
    { "id": "activate", "label": "Activates" }
  ],
  "lanes": [
    {
      "id": "evidence", "label": "Evidence", "kind": "cards",
      "cells": [
        { "step": "discover", "text": "Invite email" },
        { "step": "signup", "text": "Signup form" },
        { "step": "pay", "text": "Payment QR code" },
        { "step": "activate", "text": "Empty dashboard" }
      ]
    },
    {
      "id": "actions", "label": "User actions", "kind": "cards",
      "cells": [
        { "step": "discover", "text": "Opens the invite link" },
        { "step": "signup", "text": "Fills in name and document" },
        { "step": "pay", "text": "Scans the code and pays" },
        { "step": "wait", "text": "Waits for confirmation" },
        { "step": "activate", "text": "Creates the first project" }
      ]
    },
    {
      "id": "frontstage", "label": "Frontstage", "kind": "cards",
      "cells": [
        { "step": "discover", "text": "Landing page", "ref": "app/page.tsx" },
        { "step": "signup", "text": "Signup form", "ref": "app/signup/form.tsx:41" },
        { "step": "pay", "text": "Payment screen", "ref": "app/pay/page.tsx:23" },
        {
          "step": "wait", "text": "No pending state", "flag": "gap",
          "note": "The screen shows nothing between paying and confirmation"
        },
        { "step": "activate", "text": "Empty state", "ref": "app/dashboard/empty.tsx" }
      ]
    },
    {
      "id": "backstage", "label": "Backstage", "kind": "cards",
      "cells": [
        { "step": "signup", "text": "Validates the document", "ref": "api/users.ts:88" },
        { "step": "pay", "text": "Creates the charge", "ref": "api/payments.ts:12" },
        {
          "step": "wait", "text": "Webhook handler swallows errors", "flag": "risk",
          "ref": "api/webhooks/payment.ts:34", "note": "Empty catch: a failed charge stays pending forever"
        },
        { "step": "activate", "text": "Seeds the first project", "ref": "api/projects.ts:7" }
      ]
    },
    {
      "id": "support", "label": "Support processes", "kind": "cards",
      "cells": [
        { "step": "discover", "text": "Invite delivery", "ref": "jobs/invites.ts:19", "span": 2 },
        {
          "step": "pay", "text": "No receipt email", "flag": "gap", "span": 2,
          "note": "Nothing sends a confirmation once the charge clears"
        }
      ]
    }
  ],
  "dividers": [
    { "after": "actions", "label": "Line of interaction" },
    { "after": "frontstage", "label": "Line of visibility" }
  ]
}
```

Rendered: `examples/blueprint-onboarding.html`.

## Worked example: User Journey Map

Copied verbatim from `examples/src/journey-onboarding.json`.

```json
{
  "type": "journey",
  "title": "Onboarding",
  "subtitle": "User Journey Map",
  "meta": { "version": "v1", "date": "2026-08-19", "source": "acme/app@a1b2c3d" },
  "steps": [
    { "id": "discover", "label": "Discovers" },
    { "id": "signup", "label": "Signs up" },
    { "id": "pay", "label": "Pays" },
    { "id": "wait", "label": "Waits" },
    { "id": "activate", "label": "Activates" }
  ],
  "lanes": [
    {
      "id": "actions", "label": "Actions", "kind": "cards",
      "cells": [
        { "step": "discover", "text": "Opens the invite link" },
        { "step": "signup", "text": "Fills in name and document" },
        { "step": "pay", "text": "Scans the code and pays" },
        { "step": "wait", "text": "Refreshes the page" },
        { "step": "activate", "text": "Creates the first project" }
      ]
    },
    {
      "id": "emotion", "label": "Emotion", "kind": "emotion",
      "cells": [
        { "step": "discover", "score": 2, "label": "Curious" },
        { "step": "signup", "score": 0, "label": "Hesitant" },
        { "step": "pay", "score": -1, "label": "Cautious" },
        { "step": "wait", "score": -3, "label": "Anxious", "flag": "gap" },
        { "step": "activate", "score": 3, "label": "Relieved" }
      ]
    },
    {
      "id": "quotes", "label": "Saying", "kind": "cards",
      "cells": [
        { "step": "discover", "text": "\"A teammate sent me this\"" },
        { "step": "signup", "text": "\"Why do you need my document?\"" },
        { "step": "pay", "text": "\"Fine, this part is quick\"" },
        { "step": "wait", "text": "\"Did it go through? I can't tell\"" },
        { "step": "activate", "text": "\"There we go\"" }
      ]
    },
    {
      "id": "opportunities", "label": "Opportunities", "kind": "cards",
      "cells": [
        { "step": "signup", "text": "Explain why the document is needed", "ref": "app/signup/form.tsx:41" },
        {
          "step": "wait", "text": "No pending or confirmation state", "flag": "gap",
          "note": "Nothing in the UI or by email tells the user the charge cleared"
        }
      ]
    }
  ],
  "dividers": [{ "after": "emotion", "label": "Line of experience" }]
}
```

Rendered: `examples/journey-onboarding.html`.

## Validation errors you might see

Exact message text from `validateModel` in `template.html`, for the four most common
mistakes. `{where}` is `cell #N in lane "laneId"`; `{laneId}` and other placeholders are
filled in from the offending value.

- **Unknown step**: `Unknown step "checkout" in lane "backstage".`
- **Missing `text`**: `The cell #1 in lane "backstage" needs "text".`
- **Span past the last step**: `The span of cell #1 in lane "backstage" runs past the last step (starts at step 2, spans 3, 3 steps exist).`
- **Overlapping cells**: `Cells overlap in lane "backstage" at step "signup".`

Other errors `validateModel` can emit, worded the same way in the code:

- `The artifact data must be an object.`
- `Unknown type "flow". Supported types: blueprint, journey.`
- `The artifact needs a non-empty "title".`
- `The artifact needs at least one step.`
- `The artifact needs at least one lane.`
- `Step #1 needs an "id".`
- `Duplicate step id "discover".`
- `Step "discover" needs a "label".`
- `Lane #1 needs an "id".`
- `Duplicate lane id "actions".`
- `Lane "actions" needs a "label".`
- `Lane "actions" has kind "chart". Supported kinds: cards, emotion.`
- `The span of cell #1 in lane "actions" must be an integer of 1 or more.`
- `The flag "todo" on cell #1 in lane "actions" must be "gap" or "risk".`
- `The score of cell #1 in lane "emotion" must be an integer from -3 to 3.`
- `An artifact may hold at most one emotion lane. Found 2: "e1", "e2".`
- `A journey needs exactly one emotion lane.`
- `Unknown lane "frontstage" in divider #1.`
