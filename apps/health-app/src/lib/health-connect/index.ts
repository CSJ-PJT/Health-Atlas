/**
 * Health Connect Service
 * Kotlin ?ㅼ씠?곕툕 ?뚮윭洹몄씤怨??곕룞?섎뒗 TypeScript ?섑띁
 */

import HealthConnect from './plugin';

export * from './types';
export { HealthConnect };

/**
 * Health Connect ?ъ슜 媛???щ? ?뺤씤
 */
export async function checkHealthConnectAvailability(): Promise<boolean> {
  try {
    const result = await HealthConnect.getStatus();
    return result.isAvailable ?? result.statusText === 'AVAILABLE';
  } catch (error) {
    console.error('Health Connect availability check failed:', error);
    return false;
  }
}

/**
 * 沅뚰븳 ?붿껌
 */
export async function requestPermissions(): Promise<boolean> {
  try {
    const result = await HealthConnect.requestPermissions();
    return result.granted;
  } catch (error) {
    console.error('Failed to request permissions:', error);
    return false;
  }
}

/**
 * 沅뚰븳 ?곹깭 ?뺤씤
 */
export async function checkPermissions() {
  try {
    if (typeof HealthConnect.getPermissionStatus === 'function') {
      return await HealthConnect.getPermissionStatus();
    }
    return await HealthConnect.checkPermissions();
  } catch (error) {
    console.error('Failed to check permissions:', error);
    throw error;
  }
}

/**
 * ?ㅻ뒛??嫄닿컯 ?곗씠???ㅻ깄??媛?몄삤湲?
 */
export async function getTodayHealthData(options?: { dataOriginPackage?: string; dataOriginPackages?: string[] }) {
  try {
    return await HealthConnect.getTodaySnapshot(options);
  } catch (error) {
    console.error('Failed to get today health data:', error);
    throw error;
  }
}

/**
 * ?뱀젙 湲곌컙??嫄닿컯 ?곗씠??媛?몄삤湲?
 * @param startISO ISO 8601 ?뺤떇 ?쒖옉 ?쒓컖 (?? "2025-11-21T00:00:00Z")
 * @param endISO ISO 8601 ?뺤떇 醫낅즺 ?쒓컖 (?? "2025-11-21T23:59:59Z")
 */
export async function getHealthDataForRange(startISO: string, endISO: string, options?: { dataOriginPackage?: string; dataOriginPackages?: string[] }) {
  try {
    return await HealthConnect.getSnapshotForRange({
      start: startISO,
      end: endISO,
      ...options,
    });
  } catch (error) {
    console.error('Failed to get health data for range:', error);
    throw error;
  }
}
