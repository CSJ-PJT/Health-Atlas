import { samsungProvider } from "@/providers/samsung";
import { getStoredProviderId } from "@/providers/shared/services/providerStorage";
import type { HealthProvider, ProviderId } from "@/providers/shared/types/provider";

export const ACTIVE_HEALTH_PROVIDER: ProviderId = "samsung";

const providers: Record<typeof ACTIVE_HEALTH_PROVIDER, HealthProvider> = {
  samsung: samsungProvider,
};

export function getProvider(providerId: ProviderId): HealthProvider {
  if (providerId !== ACTIVE_HEALTH_PROVIDER) {
    throw new Error("UNSUPPORTED_HEALTH_PROVIDER");
  }
  return providers[ACTIVE_HEALTH_PROVIDER];
}

export function getAllProviders(): HealthProvider[] {
  return [providers[ACTIVE_HEALTH_PROVIDER]];
}

export function getActiveProvider(): HealthProvider {
  const providerId = getStoredProviderId();
  if (providerId !== ACTIVE_HEALTH_PROVIDER) {
    throw new Error("UNSUPPORTED_HEALTH_PROVIDER");
  }
  return providers[ACTIVE_HEALTH_PROVIDER];
}
