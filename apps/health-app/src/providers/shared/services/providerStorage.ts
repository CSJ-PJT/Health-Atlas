import type { ProviderId } from "@/providers/shared/types/provider";

const ACTIVE_PROVIDER_KEY = "active_health_provider";

const ACTIVE_HEALTH_PROVIDER: ProviderId = "samsung";
const validProviders = new Set<ProviderId>([ACTIVE_HEALTH_PROVIDER]);

export function getStoredProviderId(): ProviderId {
  const stored = localStorage.getItem(ACTIVE_PROVIDER_KEY) as ProviderId | null;
  if (stored && validProviders.has(stored)) {
    return stored;
  }
  return ACTIVE_HEALTH_PROVIDER;
}

export function setStoredProviderId(providerId: ProviderId) {
  if (providerId !== ACTIVE_HEALTH_PROVIDER) {
    throw new Error("UNSUPPORTED_HEALTH_PROVIDER");
  }
  localStorage.setItem(ACTIVE_PROVIDER_KEY, providerId);
}
