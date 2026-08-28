import type { ProviderId } from "@/providers/shared/types/provider";

const SAMSUNG_PROVIDER_META = {
  label: "Samsung Health",
  subtitle: "삼성 헬스 동기화 GPT",
  shortLabel: "Samsung",
} as const;

export const PROVIDER_META: Partial<Record<ProviderId, typeof SAMSUNG_PROVIDER_META>> = {
  samsung: {
    label: "Samsung Health",
    subtitle: "삼성 헬스 동기화 GPT",
    shortLabel: "Samsung",
  },
};

export function getProviderMeta(providerId: ProviderId) {
  if (providerId !== "samsung") {
    throw new Error("UNSUPPORTED_HEALTH_PROVIDER");
  }
  return SAMSUNG_PROVIDER_META;
}
