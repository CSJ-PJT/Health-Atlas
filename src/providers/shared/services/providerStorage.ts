import type { ProviderId } from "@/providers/shared/types/provider";

const ACTIVE_PROVIDER_KEY = "active_health_provider";

export function getStoredProviderId(): ProviderId {
  const stored = localStorage.getItem(ACTIVE_PROVIDER_KEY);
  if (stored === "garmin") {
    return "garmin";
  }
  return "samsung";
}

export function setStoredProviderId(providerId: ProviderId) {
  localStorage.setItem(ACTIVE_PROVIDER_KEY, providerId);
}
