import type { HealthViewMode } from "@/providers/shared/types/provider";
import { getDefaultRangeForMode } from "@/providers/shared/services/mockData";

export function buildRangeFromMode(mode: HealthViewMode, anchorDate = new Date()) {
  return getDefaultRangeForMode(mode, anchorDate);
}

export function getModeLabel(mode: HealthViewMode) {
  if (mode === "day") {
    return "일별";
  }
  if (mode === "week") {
    return "주별";
  }
  if (mode === "month") {
    return "월별";
  }
  return "연도별";
}
