import { appleHealthProvider } from "@/providers/apple";
import { garminProvider } from "@/providers/garmin";
import { samsungProvider } from "@/providers/samsung";
import { stravaProvider } from "@/providers/strava";
import { getStoredProviderId } from "@/providers/shared/services/providerStorage";
import type { HealthProvider, ProviderId } from "@/providers/shared/types/provider";

const providers: Record<ProviderId, HealthProvider> = {
  samsung: samsungProvider,
  garmin: garminProvider,
  "apple-health": appleHealthProvider,
  strava: stravaProvider,
};

export function getProvider(providerId: ProviderId): HealthProvider {
  return providers[providerId];
}

export function getAllProviders(): HealthProvider[] {
  return Object.values(providers);
}

export function getActiveProvider(): HealthProvider {
  return getProvider(getStoredProviderId());
}
