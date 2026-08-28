export const SAMSUNG_HEALTH_PROVIDER_ID = "samsung" as const;
export const SAMSUNG_HEALTH_DATA_ORIGIN = "com.sec.android.app.shealth";
export const SAMSUNG_HEALTH_CONNECT_LABEL = "Samsung Health · Health Connect";

export function getSamsungHealthDataOrigin() {
  const configuredOrigin = import.meta.env.VITE_SAMSUNG_HEALTH_DATA_ORIGIN?.trim();
  if (configuredOrigin && configuredOrigin !== SAMSUNG_HEALTH_DATA_ORIGIN) {
    throw new Error("SAMSUNG_HEALTH_DATA_ORIGIN_UNVERIFIED");
  }
  return SAMSUNG_HEALTH_DATA_ORIGIN;
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
