/**
 * Health Connect Service
 * Kotlin 네이티브 플러그인과 연동하는 TypeScript 래퍼
 */

import HealthConnect from './plugin';

export * from './types';
export { HealthConnect };

/**
 * Health Connect 사용 가능 여부 확인
 */
export async function checkHealthConnectAvailability(): Promise<boolean> {
  try {
    const result = await HealthConnect.getStatus();
    return result.status === 1;
  } catch (error) {
    console.error('Health Connect availability check failed:', error);
    return false;
  }
}

/**
 * 권한 상태 확인
 */
export async function checkPermissions() {
  try {
    return await HealthConnect.getPermissionStatus();
  } catch (error) {
    console.error('Failed to check permissions:', error);
    throw error;
  }
}

/**
 * 오늘의 건강 데이터 스냅샷 가져오기
 */
export async function getTodayHealthData() {
  try {
    return await HealthConnect.getTodaySnapshot();
  } catch (error) {
    console.error('Failed to get today health data:', error);
    throw error;
  }
}

/**
 * 특정 기간의 건강 데이터 가져오기
 * @param startISO ISO 8601 형식 시작 시각 (예: "2025-11-21T00:00:00Z")
 * @param endISO ISO 8601 형식 종료 시각 (예: "2025-11-21T23:59:59Z")
 */
export async function getHealthDataForRange(startISO: string, endISO: string) {
  try {
    return await HealthConnect.getSnapshotForRange({
      start: startISO,
      end: endISO,
    });
  } catch (error) {
    console.error('Failed to get health data for range:', error);
    throw error;
  }
}
