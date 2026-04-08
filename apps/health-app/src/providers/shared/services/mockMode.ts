const MOCK_HEALTH_DATA_KEY = "mock_health_data_enabled";

export function isMockHealthDataEnabled() {
  const stored = localStorage.getItem(MOCK_HEALTH_DATA_KEY);
  if (stored === null) {
    return true;
  }
  return stored === "true";
}

export function setMockHealthDataEnabled(enabled: boolean) {
  localStorage.setItem(MOCK_HEALTH_DATA_KEY, enabled ? "true" : "false");
}
