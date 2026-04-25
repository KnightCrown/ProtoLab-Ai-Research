# Protocol rulebook (ProtoLab)

These rules apply to **every** generated protocol. `protocol_example.md` supplies **style and structure**; these rules supply **scientific quality and constraints**.

## Required high-level structure

Each protocol must contain: **title**, **objective**, **materials**, **procedure** (ordered steps), and optionally **notes_and_calculations** (e.g. formulas, logbook, QA, acceptance).

## Flexibility of steps

- Steps are **not** forced into a fixed set of sub-fields. Include only what helps replication: narrative `text` alone is valid; structured fields (action, inputs, quantities, conditions, output, observation) are welcome when they add precision.
- Support **sub_steps** to mirror real SOPs (e.g. 1a, pilot vs final, nested tasks).
- Step **kind** (optional) may label: calculation, preparation, execution, measurement, repetition, etc.

## Scientific bar

- Avoid vague “standard” or “as per kit” without stating the **parameters** you use (volumes, temperatures, timepoints, replicates, instrument mode).
- Where uncertainty exists, give a defensible default or range and state the assumption.
- List **replicates**, controls, and measurement endpoints when the design implies them.

## Replicability

- Material lines should be specific (grade, key catalog detail, or clear generic with critical spec e.g. “0.1 M carbonate-free NaOH”).
- For calculations, show what is computed and what is measured, so a peer can audit the logic.

## Forbidden

- Placeholder-only steps with no testable or observable content.
- Contradictory or dimensionally impossible quantities.

## JSON (pipeline)

- Top-level: `protocols[]`.
- Each item: `protocol_id`, `title`, `objective`, `materials[]`, `procedure[]` of flexible steps, optional `notes_and_calculations[]`.

---

Comply with this rulebook; emulate **example tone and structure** from `protocol_example.md` without copying its subject matter.
