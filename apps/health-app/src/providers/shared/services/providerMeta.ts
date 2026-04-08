import type { ProviderId } from "@/providers/shared/types/provider";

export const PROVIDER_META: Record<
  ProviderId,
  {
    label: string;
    subtitle: string;
    shortLabel: string;
  }
> = {
  samsung: {
    label: "Samsung Health",
    subtitle: "Samsung Health Sync GPT",
    shortLabel: "Samsung",
  },
  garmin: {
    label: "Garmin",
    subtitle: "Garmin Sync GPT",
    shortLabel: "Garmin",
  },
  "apple-health": {
    label: "Apple Health",
    subtitle: "Apple Health Sync GPT",
    shortLabel: "Apple Health",
  },
  strava: {
    label: "Strava",
    subtitle: "Strava Sync GPT",
    shortLabel: "Strava",
  },
};

export function getProviderMeta(providerId: ProviderId) {
  return PROVIDER_META[providerId];
}
