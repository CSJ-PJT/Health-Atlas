import { deepRepairLegacyValue, repairLegacyText } from "@/services/textRepair";

function getScopeId() {
  return localStorage.getItem("profile_id") || localStorage.getItem("user_id") || "guest";
}

function getScopedKey(key: string) {
  return `${key}::${getScopeId()}`;
}

export function readScopedJson<T>(key: string, fallback: T, legacyKeys: string[] = []) {
  const candidates = [getScopedKey(key), key, ...legacyKeys];
  for (const candidate of candidates) {
    const stored = localStorage.getItem(candidate);
    if (!stored) continue;
    try {
      const parsed = deepRepairLegacyValue(JSON.parse(stored) as T);
      if (candidate !== getScopedKey(key)) {
        localStorage.setItem(getScopedKey(key), JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      continue;
    }
  }
  return fallback;
}

export function writeScopedJson<T>(key: string, value: T) {
  localStorage.setItem(getScopedKey(key), JSON.stringify(value));
}

export function readScopedValue(key: string, fallback = "", legacyKeys: string[] = []) {
  const candidates = [getScopedKey(key), key, ...legacyKeys];
  for (const candidate of candidates) {
    const stored = localStorage.getItem(candidate);
    if (stored !== null) {
      const repaired = repairLegacyText(stored);
      if (candidate !== getScopedKey(key)) {
        localStorage.setItem(getScopedKey(key), repaired);
      }
      return repaired;
    }
  }
  return fallback;
}

export function writeScopedValue(key: string, value: string) {
  localStorage.setItem(getScopedKey(key), value);
}
