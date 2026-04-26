import type { ProcedureStep, ProtocolConditions } from "@/lib/pipeline/types";

/** Normalize "5 cm x 5 cm" style dimensions to use × in display. */
export function normalizeDimensions(s: string): string {
  return s
    .replace(/\b(\d+(?:\.\d+)?)\s*cm\s*x\s*(\d+(?:\.\d+)?)\s*cm/gi, "$1 cm × $2 cm")
    .replace(/\b(\d+(?:\.\d+)?)\s*mm\s*x\s*(\d+(?:\.\d+)?)\s*mm/gi, "$1 mm × $2 mm")
    .replace(/\b(\d+(?:\.\d+)?)\s*µm\s*x\s*(\d+(?:\.\d+)?)\s*µm/gi, "$1 µm × $2 µm");
}

function joinAnd(items: string[]): string {
  const t = items.map((x) => x.trim()).filter(Boolean);
  if (t.length === 0) return "";
  if (t.length === 1) return t[0]!;
  if (t.length === 2) return `${t[0]} and ${t[1]}`;
  return `${t.slice(0, -1).join(", ")}, and ${t[t.length - 1]!}`;
}

function cap(s: string): string {
  const x = s.trim();
  if (!x) return x;
  return x.charAt(0).toUpperCase() + x.slice(1);
}

function decap(s: string): string {
  const x = s.trim();
  if (!x) return x;
  return x.charAt(0).toLowerCase() + x.slice(1);
}

const NUM_WORD: Record<number, string> = {
  1: "one",
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
  7: "seven",
  8: "eight",
  9: "nine",
  10: "ten",
};

function leadCountWord(qty: string): { word: string; rest: string } | null {
  const m = qty.trim().match(/^(\d{1,2})\s+(\S.*)$/);
  if (!m) return null;
  const n = parseInt(m[1]!, 10);
  const rest = m[2]!.trim();
  return { word: n >= 1 && n <= 10 ? NUM_WORD[n]! : m[1]!, rest };
}

function roomTemp(c: ProtocolConditions | undefined): string {
  if (!c?.temperature?.trim()) return "";
  const t = c.temperature.trim();
  if (/room\s*temp|room temperature|^rt$/i.test(t)) return "at room temperature";
  return "";
}

function incubationPhrase(c: ProtocolConditions | undefined): string {
  if (!c) return "";
  const tp = roomTemp(c);
  const time = c.time?.trim();
  const conc = c.concentration?.trim();
  const bits: string[] = [];
  if (c.temperature?.trim() && !tp) bits.push(`at ${c.temperature.trim()}`);
  if (time) bits.push(`for ${time}`);
  if (conc) bits.push(`(${conc})`);
  if (c.other?.trim() && !time) bits.push(c.other.trim());
  return [tp || bits[0], ...bits.slice(tp ? 0 : 1)].filter(Boolean).join(" ").replace(/\s+/g, " ");
}

/**
 * Prefer model-written `text` (publication-style sentence). Otherwise compose from fields.
 */
export function procedureStepToNarrative(step: ProcedureStep): string {
  const direct = step.text?.trim();
  if (direct) {
    return normalizeDimensions(direct);
  }

  const action = step.action?.trim().toLowerCase() ?? "";
  const inputs = step.inputs?.map((x) => x.trim()).filter(Boolean) ?? [];
  const qty = step.quantities?.trim() ? normalizeDimensions(step.quantities.trim()) : "";
  const out = step.output?.trim() ?? "";
  const obs = step.observation?.trim() ?? "";
  const c = step.conditions;
  const rt = roomTemp(c);
  const inc = incubationPhrase(c);
  const timeOnly = c?.time?.trim() ?? "";
  const tempOnly = c?.temperature?.trim() ?? "";

  /* ---- Template: cut / slice paper or film into dimensions ---- */
  if ((/cut|slice|trim|section|punch/.test(action) || /^cut\b/i.test(step.action?.trim() ?? "")) && inputs.length && (/\d/.test(qty) || /×|cm|mm|µm/.test(qty))) {
    const mat = joinAnd(inputs);
    const into = /into|×|cm|mm/.test(qty) ? qty : `${qty} square pieces`;
    const shape = /square|disc|strip|piece/i.test(into) ? into : `${into} square pieces`;
    let purpose = "";
    if (/substrate|biosensor|sensor|assay/i.test(out)) {
      purpose = /biosensor/i.test(out)
        ? "to serve as the substrate for the biosensor"
        : `to serve as ${decap(out).replace(/^the\s+/i, "")}`;
    } else if (out) {
      purpose = `to ${decap(out)}`;
    } else {
      purpose = "for use in the next step";
    }
    return normalizeDimensions(`Cut ${mat} into ${shape.replace(/^into\s+/i, "")} ${purpose}.`.replace(/\s+/g, " ").replace(/\s+\./g, "."));
  }

  /* ---- Template: place / position (electrodes, etc.) ---- */
  if (/place|position|mount|lay|set/.test(action) && (inputs.length || qty)) {
    const mc = leadCountWord(qty);
    let line = "";
    if (mc && /electrode|well|tip|drop|ml|µl|μl|µL|antibod|sample|reagent/i.test(qty)) {
      line = `Place ${mc.word} ${mc.rest} ${inputs.length && !qty.toLowerCase().includes(inputs[0]!.toLowerCase().slice(0, 4)) ? `of ${joinAnd(inputs)}` : ""}`.replace(/\s+/g, " ");
    } else {
      const head = cap(step.action?.trim() ?? "Place");
      line = inputs.length
        ? `${head} ${joinAnd(inputs)}${qty ? (qty.toLowerCase().startsWith("per") ? ` ${qty}` : ` ${qty}`) : ""}`.replace(/\s+/g, " ")
        : `${head} ${qty}`.replace(/\s+/g, " ");
    }
    if (rt && !/room|rt\b/i.test(line)) line += ` ${rt}`;
    else if (tempOnly && !/°|room|rt/i.test(line)) line += ` at ${tempOnly}`;

    const ensure = obs
      ? (/\bensur/i.test(obs) ? decap(obs) : `ensuring ${decap(obs)}`)
      : "ensuring firm, stable contact with the substrate";
    if (!/ensur|contact|adhere|attach|stable/i.test(line)) {
      line += `, ${ensure}`;
    } else if (obs) {
      line += `, ${ensure}`;
    }
    if (!/[.!?]$/.test(line)) line += ".";
    return normalizeDimensions(line);
  }

  /* ---- Template: add / pipette / dispense with incubation ---- */
  if (/add|pipette|dispense|transfer|aliquot|apply|spike|inoculate/.test(action) && (qty || inputs.length)) {
    const sol = [qty, joinAnd(inputs)].filter(Boolean).join(" of ").replace(/^of /, "");
    const target = /electrode|well|vessel|tube|flow cell|membrane|spot/i.test(out) ? out : "each well";
    let line = `${cap(action)} ${sol} to ${/each|per|all/i.test(target) ? target : `each ${decap(target)}`}`.replace(/\s+/g, " ");
    if (c?.time && (tempOnly || rt)) {
      const tpart = rt || (tempOnly ? `at ${tempOnly}` : "");
      line = line.replace(/\.$/, "");
      line += ` and incubate ${tpart}${timeOnly ? ` for ${timeOnly}` : ""}`.replace(/\s+/g, " ");
    } else if (inc) {
      line += ` and incubate ${inc}`;
    }
    if (out && !/each|per/i.test(out)) {
      if (/immobil|bind|conjug|coat|label|absorb|adsorb|attach|hybrid|react|equilibrat|develop/i.test(out)) {
        line += ` to allow ${decap(out)}`;
      } else {
        line += ` to ${decap(out)}`;
      }
    }
    if (!/[.!?]$/.test(line)) line += ".";
    return normalizeDimensions(line);
  }

  /* ---- Generic / fallback ---- */
  let main = "";
  if (step.action?.trim()) {
    let head = cap(step.action.trim());
    if (inputs.length) head += ` ${joinAnd(inputs)}`;
    if (qty) {
      if (/^(\d+|\d+\.\d+)\b/.test(qty) && /place|add|load/i.test(action)) {
        const lw = leadCountWord(qty);
        if (lw) head = `${cap(head.split(" ")[0] ?? "Place")} ${lw.word} ${lw.rest}`.replace(/\s+/g, " ");
        else head += ` ${qty}`;
      } else if (/cm|mm|m\b|μ|×|#|x\s/i.test(qty)) {
        head += ` into ${qty.replace(/^(into|in)\s+/i, "")}`;
      } else {
        head += ` ${qty}`;
      }
    }
    main = head;
  } else if (inputs.length) {
    main = joinAnd(inputs) + (qty ? ` (${qty})` : "");
  } else if (qty) {
    main = cap(qty);
  } else {
    return "—";
  }

  if (rt && !main.toLowerCase().includes("room")) main += ` ${rt}`;
  else if (timeOnly && tempOnly) main += ` at ${tempOnly} for ${timeOnly}`;

  if (out && !/\bto\s/.test(main.slice(-40))) {
    const tail = decap(out);
    main += (main && !main.endsWith(".") ? " " : "") + ` to ${tail}`;
  }
  if (obs) {
    if (main && !main.endsWith(".")) main += ".";
    main += ` ${/ensur|verify|check|confirm|note that/i.test(obs) ? decap(obs) : cap(obs)}.`;
  }
  main = main.replace(/\s+/g, " ").trim();
  if (!main) return "—";
  if (!/[.!?]$/.test(main)) main += ".";
  return normalizeDimensions(main);
}
