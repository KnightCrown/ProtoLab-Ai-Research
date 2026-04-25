# Example: Titration of unknown acid with standardized NaOH (reference style only)

*This file illustrates realistic protocol layout, tone, and level of detail. Generated protocols should match this *class* of document—not this subject matter.*

## Protocol title
Determination of unknown weak acid concentration by NaOH titration with pH endpoint

## Objective
Determine the molarity of a weak acid solution to ±2% relative by potentiometric titration against carbonate-free NaOH of known normality, reporting equivalence volume and pKa from the first derivative curve.

## Materials
- Unknown acid stock (student unknown ID ______), ~50 mL
- 0.1000 M NaOH titrant, carbonate-free, standardized (certificate or fresh prep date ______)
- Deionized water, 18 MΩ·cm
- 100 mL beaker, 50 mL burette (Teflon stopcock preferred), 25 mL volumetric pipette, pipette bulb
- pH meter + glass electrode (calibration buffers pH 4, 7, 10 same day)
- Stir plate and small stir bar, weighing boat if solids involved
- Lab notebook, timer

## Procedure

1. **Meter QC.** Calibrate the pH meter with two-point calibration per manufacturer; record slope and offset. Rinse electrode with DI; blot—do not wipe the glass bulb aggressively.

1a. If slope is <95% of theoretical, repeat calibration; do not proceed until within lab acceptance (note threshold in your lab: e.g. >92% of theoretical for teaching lab).

2. **Burette prep.** Rinse the burette with ~5 mL titrant 3×; fill past zero; clear the tip; meniscus read to 0.02 mL precision; initial volume V₀ recorded.

3. **Sample aliquot.** Transfer 25.00 mL of unknown acid to a clean, dry (for acid) beaker; add ~30 mL DI and the stir bar. *Why wetting volume does not change moles in the sample*—sketch in notes if this is a teaching run.

4. **Pilot titration (coarse, optional for experienced operators).** Add titrant in ~1 mL steps until pH change accelerates, then 0.2–0.5 mL near the expected equivalence to locate the steepest region. *Do not use pilot data for final calculation unless full precision method was followed*—it locates the window only.

5. **High-precision run.** From a new aliquot (or the same, if you did not pass equivalence), add titrant in variable increments: ≥1.5 mL in flat regions, 0.10–0.20 mL within ±1.5 pH units of expected pKa/equivalence. Record V and pH after stable reading (e.g. ≤0.01 pH/30 s, operator-defined in noisy environments).

5a. *Observation:* near equivalence the slope dpH/dV is maximized; near half-equivalence, pH ≈ pKa for monoprotic weak acids if activity corrections ignored at this level.

6. **Calculations.**
   - Equivalence volume V_eq from first derivative: plot ΔpH/ΔV vs. average V; peak position is V_eq (use cubic spline or Savitzky–Golay if your course permits).
   - Molarity of acid: M_a = (M_NaOH · V_eq) / V_sample (adjust equations for diprotic or partial neutralization as appropriate; state assumptions: ideal dilute solution, 25 °C, activity γ≈1).

6a. **Back-of-envelope check:** if V_eq is wildly inconsistent with a rough predicted order of magnitude, stop and inspect burette leaks, wrong concentration label, or carbonated titrant.

7. **Replication.** Minimum *n* = 3 independent aliquots (new fills from stock); report mean ± 95% CI (specify: *t* on *n*−1 here for teaching lab).

8. **Shutdown.** Rinse electrode and store in storage solution; titrant burette cleaned per SOP; waste segregated (aqueous, pH <12 typically drain if local rules allow).

## Notes and calculations
- Logbook must show: all raw (V, pH) tables, derivative plot, V_eq, M_a, and uncertainty budget (at minimum: burette, pipette, and repeatability for this course).
- If CO₂ uptake in titrant is suspected, use fresh vial and minimize air contact; note drift test (blank with DI).

---

*End of example. Structure (title → objective → materials → procedure with nested substeps and mixed step types) is the target pattern.*
