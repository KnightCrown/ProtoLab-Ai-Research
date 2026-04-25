# Protocol Rulebook (ProtoLab v0.4)

These rules are **mandatory** for any generated laboratory protocol. Violations (vague steps, missing parameters) are not acceptable.

## 1) Structure

- Every protocol is an ordered list of **atomic steps** (one primary physical or analytical action per step, unless a pair is inseparable, e.g. "centrifuge" + "remove supernatant").
- Each step MUST declare: **action**, **inputs** (reagents, samples, equipment), **conditions** (time, temperature, atmosphere, agitation, concentration or range), and **output** (intermediate or final state).
- **No** steps like "perform standard analysis" or "as previously described" without full parameters.

## 2) Conditions (required when applicable)

- **Time:** explicit duration or timepoint (e.g. "5 min at RT", "incubate 16 h at 37 °C, 5% CO2").
- **Temperature:** in °C (or K if cryogenic) or "room temperature" with definition if not 20–25 °C.
- **Concentration / amount:** molarity, mg/mL, g/L, or % w/v, v/v, or number of replicates and volume per well/tube.
- If unknown, use **defensible research ranges** (e.g. "0.1–1.0 mM" or "5–10 % CO2") and label as **suggested default**, not a hidden assumption.

## 3) Safety & controls

- Include **positive/negative** controls when the experiment implies causality, unless the hypothesis is purely descriptive (then state why controls are N/A and what baseline is used).
- List **PPE, biosafety level, and waste** only when the materials imply risk (BSL, chemicals, radioactivity, sharps). Otherwise "standard lab PPE" is acceptable as one explicit line.

## 4) Replicability

- State **N** (biological/technical replicates) or plate layout when relevant.
- For instruments, name **key settings** (e.g. "microplate reader: endpoint absorbance, 450 nm" not just "read plate").

## 5) Outputs

- The **output** field must be measurable or observable: "lysed cells", "cDNA in tube", "fluorescence image stack", "normalized OD450", etc.
- If a step produces data files, name **file type** and key metadata (e.g. "FCS 3.0 or CSV with one row per well").

## 6) Forbidden

- "Optimize as needed" without a procedure.
- "According to the manufacturer" without listing critical manufacturer parameters you depend on.
- "Analyze statistically" without naming the comparison and primary test.

## 7) JSON shape (enforced in prompt)

The model must return steps as JSON objects with fields:

- `action` (string)
- `inputs` (array of strings)
- `conditions` (object, keys may include: `time`, `temperature`, `concentration`, `other` — all strings)
- `output` (string)

---

End of rulebook. All protocol generation must comply.
