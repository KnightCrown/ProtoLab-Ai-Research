/**
 * Prompt for the materials extraction stage.
 *
 * Scientific proposals list only what affects reproducibility, cost, and
 * feasibility — not everything that happens to be in the lab.  The model is
 * given a three-category framework with explicit include / exclude guidance.
 */

const SCHEMA = `{ "materials": [ { "name": string, "specification": string } ] }`;

export const EXTRACT_MATERIALS_SYSTEM = `Extract a deduplicated list of materials required across all given laboratory procedures. ${SCHEMA}

## Three-category framework — follow strictly

### CATEGORY 1 — Consumables and reagents  →  ALWAYS INCLUDE
Everything that is purchased per-experiment and cannot be assumed present:
- Chemicals, reagents, antibodies, buffers, solutions, media, enzymes, kits
- Disposable labware: tubes, plates, membranes, filters, substrates (e.g. Whatman paper)
- Gases (e.g. nitrogen, argon) if specifically required
- Test samples or analytes (e.g. whole blood, serum, CRP standards)

### CATEGORY 2 — Standard lab equipment  →  EXCLUDE
Every well-equipped laboratory already has the following; do NOT list them:
Pipettes (any volume range), vortex mixer, magnetic stir plate / stir bars,
hot plate, basic analytical balance, pH meter, basic water bath (≤ 60 °C),
standard refrigerator (4 °C) and freezer (−20 °C), autoclave / steriliser,
biosafety cabinet (Class II), fume hood, basic optical / brightfield microscope,
standard benchtop / microcentrifuge (≤ 16 000 × g), standard CO₂ incubator (37 °C),
standard agarose / SDS-PAGE gel system, basic UV–Vis spectrophotometer (260/280 nm),
PPE (lab coat, standard gloves, safety goggles), timer, scissors, forceps, ruler,
lab tape, permanent markers, DI / ultrapure water, standard plastic consumable
(generic 1.5 mL tubes, standard pipette tips unless a specific non-standard type).

### CATEGORY 3 — Specialised / non-standard equipment  →  INCLUDE if required
List only when the procedure explicitly requires equipment NOT found in every lab:
Potentiostat / electrochemical workstation, impedance analyser, flow cytometer,
confocal / fluorescence / two-photon microscope, real-time PCR (qPCR) system,
next-generation or Sanger sequencer, mass spectrometer, HPLC / FPLC / ÄKTA,
ultracentrifuge (> 50 000 × g), lyophiliser / freeze dryer, cryostat, plate reader
(fluorescence / luminescence / absorbance at non-standard wavelengths),
atomic force microscope, scanning electron microscope, NMR or EPR spectrometer,
custom-fabricated or specialty electrodes (screen-printed, gold, carbon),
electrospray / MALDI source, liquid nitrogen dewar or cryogenic setup,
CO₂ laser or UV lamp (specific wavelength), thin-film deposition system, etc.

## Rules
- "name": short canonical label (e.g. "anti-CRP antibody" not a full sentence)
- "specification": grade, concentration, size, clone, catalog class, or model class
  (e.g. "1 mg/mL in PBS, clone C1", "47 mm PVDF, 0.45 µm pore", "5 cm × 5 cm")
- Deduplicate across all procedures — one entry per distinct material
- Aim for 6–18 items; omit anything covered by Category 2
- JSON only; no commentary outside the JSON object`;

export function buildExtractMaterialsUser(protocol: unknown): string {
  return `STRUCTURED_PROTOCOL_STEPS (JSON array):\n${JSON.stringify(protocol, null, 2)}`;
}
