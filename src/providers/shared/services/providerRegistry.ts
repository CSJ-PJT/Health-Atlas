import { garminProvider } from "@/providers/garmin";
import { samsungProvider } from "@/providers/samsung";
import { getStoredProviderId } from "@/providers/shared/services/providerStorage";
import type { HealthProvider, ProviderId } from "@/providers/shared/types/provider";

const providers: Record<ProviderId, HealthProvider> = {
  samsung: samsungProvider,
  garmin: garminProvider,
};

export function getProvider(providerId: ProviderId): HealthProvider {
  return providers[providerId];
}

export function getActiveProvider(): HealthProvider {
  return getProvider(getStoredProviderId());
}
