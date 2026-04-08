import type { ProviderId } from "@/providers/shared/types/provider";

const ACTIVE_PROVIDER_KEY = "active_health_provider";

const validProviders = new Set<ProviderId>(["samsung", "garmin", "apple-health", "strava"]);

export function getStoredProviderId(): ProviderId {
  const stored = localStorage.getItem(ACTIVE_PROVIDER_KEY) as ProviderId | null;
  if (stored && validProviders.has(stored)) {
    return stored;
  }
  return "samsung";
}

export function setStoredProviderId(providerId: ProviderId) {
  localStorage.setItem(ACTIVE_PROVIDER_KEY, providerId);
}
