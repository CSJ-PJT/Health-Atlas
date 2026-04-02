export type DisplaySection = "home" | "history" | "comparison";

export interface DisplaySettings {
  home: string[];
  history: string[];
  comparison: string[];
}

const KEY = "display_settings_v1";

const defaults: DisplaySettings = {
  home: ["steps", "sleep", "calories", "highlights", "body-balance", "heart", "body", "nutrition", "running"],
  history: ["distanceKm", "durationMinutes", "avgPace", "bestPace", "averageSpeed", "maxSpeed", "avgHeartRate", "cadence"],
  comparison: ["distanceKm", "durationMinutes", "avgPace", "bestPace", "averageSpeed", "maxSpeed", "avgHeartRate", "cadence", "vo2max", "elevationGain"],
};

export function getDisplaySettings() {
  const stored = localStorage.getItem(KEY);
  if (!stored) {
    return defaults;
  }

  try {
    return {
      ...defaults,
      ...(JSON.parse(stored) as Partial<DisplaySettings>),
    };
  } catch {
    return defaults;
  }
}

export function saveDisplaySettings(next: DisplaySettings) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function isDisplayMetricEnabled(section: DisplaySection, key: string) {
  return getDisplaySettings()[section].includes(key);
}
