# Protocol rulebook (ProtoLab)

These rules apply to **every** generated protocol. `protocol_example.md` supplies **structure reference**; this file sets **quality**. The goal is **not** longer protocols—it is **precision, lack of ambiguity, and executability**.

## Core principle

- Prefer **short, complete** steps over long explanations.
- A **clean lab manual**, not a textbook: no filler, no repeated context, no pedantic restatement of earlier lines.

## Precision (non-negotiable)

Each step must include **everything required** for a trained technician to run it **without asking questions**, when those details are knowable from the design:

- Exact **values** where they matter (volumes, masses, counts, replicates).
- **Units** on every numeric quantity.
- **Timing** (duration, schedule, or readout moment) when time governs the step.
- **Conditions** when they change the outcome (temperature, atmosphere, agitation, instrument mode).

Do **not** add narrative “because” or background if the step is already executable as written.

## Anti-verbosity

- If a step is already **clear, specific, and actionable**—**stop**. Do not pad.
- Do **not** repeat instructions already given in a prior step unless a new action truly depends on recalling a number (then reference briefly, e.g. “use the aliquot from step 3”).

## When to expand (only as needed)

Expand or split a step **only** when it would otherwise be:

- **Vague** (e.g. “add buffer”, “prepare solution”, “measure signal”) **→** add missing numbers, units, instrument, or timing.
- **Implicit** (hidden concentration, undefined endpoint) **→** make explicit.
- **Assumptive** (kit step without critical parameters) **→** state the parameters you rely on.

Do **not** expand a step that already states the needed numbers, units, conditions, and outcome in minimal form.

## Step quality test (mandatory)

For **each** step, ask: *Can a trained lab technician execute this without questions?*

- **Yes** → keep it; trim only redundancy.
- **No** → add the **minimum** missing facts (not a paragraph).

## No redundancy

Forbidden: repeating obvious actions, restating the entire prior step, “as described above” without a pointer, or explanatory filler that does not change what to do.

## Flexibility of shape

- Use `text` and/or structured fields (`action`, `inputs`, `quantities`, `conditions`, `output`, etc.)—whichever yields the **shortest** clear step.
- Use `sub_steps` only when nesting reduces ambiguity or matches a natural sub-procedure; do not nest to inflate length.

## Scientific bar

- No “standard procedure” without the parameters you actually use.
- Where the literature allows a range, give a **numeric range** and label it (e.g. suggested default), not a vague “optimize”.

## Required high-level structure

Each protocol: **title**, **objective**, **materials**, **procedure**, and optionally **notes** (formulas, acceptance, logbook—**concise** bullets only).

## JSON (pipeline)

- Planning stage: `protocol_plan[]` with `id`, `name`, `description`.
- Generation stage: `protocols[]`, each with `id`, `title`, `objective`, `materials[]`, `procedure[]`, optional `notes[]`.

---

Emulate **brevity and structure** from `protocol_example.md` without copying its domain. **Optimize for clarity and completeness, not word count.**
