import { totalStepCount } from "@/lib/pipeline/protocolFlatten";
import type { LaboratoryProtocol, PipelineLogFn, StaffingPlan, TimelinePlan } from "@/lib/pipeline/types";

/** Rough hours-equivalent for the project span (order of magnitude) */
function projectEffortHours(totalDurationStr: string, stepCount: number): number {
  const t = totalDurationStr.toLowerCase();
  let base = 120;
  const month = t.match(/(\d+)\s*[-–]?\s*(\d+)?\s*month/);
  const week = t.match(/(\d+)\s*[-–]?\s*(\d+)?\s*week/);
  const day = t.match(/(\d+)\s*[-–]?\s*(\d+)?\s*day/);
  if (month) {
    const a = parseInt(month[1]!, 10);
    const b = month[2] ? parseInt(month[2], 10) : a;
    base = ((a + b) / 2) * 160;
  } else if (week) {
    const a = parseInt(week[1]!, 10);
    const b = week[2] ? parseInt(week[2], 10) : a;
    base = ((a + b) / 2) * 40;
  } else if (day) {
    const a = parseInt(day[1]!, 10);
    const b = day[2] ? parseInt(day[2], 10) : a;
    base = ((a + b) / 2) * 8;
  }
  return Math.round(base + stepCount * 1.5);
}

export function estimateStaffing(
  protocols: LaboratoryProtocol[],
  timeline: TimelinePlan,
  log: PipelineLogFn
): StaffingPlan {
  log("estimate_staffing", "start", { procedures: protocols.length });
  const nSteps = totalStepCount(protocols);
  const nProc = Math.max(1, protocols.length);
  const analysisCount = (timeline.steps_timeline || []).filter((s) => s.type === "analysis").length;
  const effort = projectEffortHours(timeline.total_duration, nSteps);

  const roles: string[] = ["Lab Technician", "Research Scientist"];
  if (analysisCount > 0 || nSteps > 14 || nProc >= 2 || effort > 500) {
    roles.push("Data Analyst");
  }

  const uniqueRoles = [...new Set(roles)];
  const peopleFromProcedures = nProc >= 3 ? 3 : 2;
  const total_people = Math.min(4, Math.max(peopleFromProcedures, uniqueRoles.length));

  const hours_per_role: Record<string, number> = {
    "Lab Technician": Math.round(effort * 0.35),
    "Research Scientist": Math.round(effort * 0.3),
  };
  if (uniqueRoles.includes("Data Analyst")) {
    hours_per_role["Data Analyst"] = Math.round(effort * 0.2);
  }
  for (const r of Object.keys(hours_per_role)) {
    if (hours_per_role[r]! < 16) hours_per_role[r] = 16;
  }

  const out: StaffingPlan = {
    roles: uniqueRoles,
    total_people,
    hours_per_role,
  };
  log("estimate_staffing", "complete", { people: out.total_people, roleCount: out.roles.length });
  return out;
}
