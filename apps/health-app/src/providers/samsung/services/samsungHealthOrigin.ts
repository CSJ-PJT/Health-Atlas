export const SAMSUNG_HEALTH_PROVIDER_ID = "samsung" as const;
export const SAMSUNG_HEALTH_DATA_ORIGIN = import.meta.env.VITE_SAMSUNG_HEALTH_DATA_ORIGIN ?? "";
export const SAMSUNG_HEALTH_CONNECT_LABEL = "Samsung Health · Health Connect";

export function getSamsungHealthDataOrigin() {
  return SAMSUNG_HEALTH_DATA_ORIGIN.trim();
}

export function buildSamsungOriginFilter() {
  const origin = getSamsungHealthDataOrigin();
  if (!origin) {
    throw new Error("SAMSUNG_HEALTH_DATA_ORIGIN_UNVERIFIED");
  }
  return {
    dataOriginPackage: origin,
    dataOriginPackages: [origin],
  };
}

export function isSamsungHealthOrigin(record: { metadata?: { dataOrigin?: { packageName?: string } } }) {
  const origin = getSamsungHealthDataOrigin();
  return Boolean(origin && record.metadata?.dataOrigin?.packageName === origin);
}
