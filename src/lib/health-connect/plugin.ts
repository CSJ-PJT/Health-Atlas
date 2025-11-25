import { registerPlugin } from '@capacitor/core';
import type {
  HealthConnectStatus,
  HealthConnectPermissionStatus,
  TodaySnapshot,
  SnapshotRangeOptions,
} from './types';

/**
 * Health Connect Plugin Interface
 * Capacitor 플러그인 메서드 정의
 */
export interface HealthConnectPlugin {
  /**
   * Health Connect SDK 사용 가능 여부 확인
   * @returns status 코드 및 상태 텍스트
   * - status: SDK_AVAILABLE(3), SDK_UNAVAILABLE(1), SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED(2)
   * - statusText: "AVAILABLE" | "UNAVAILABLE" | "PROVIDER_UPDATE_REQUIRED" | "UNKNOWN"
   */
  getStatus(): Promise<HealthConnectStatus>;

  /**
   * 현재 부여된 Health Connect 권한 상태 확인
   * @returns 권한 부여 상태 및 목록
   */
  getPermissionStatus(): Promise<HealthConnectPermissionStatus>;

  /**
   * 오늘 하루(0시 ~ 현재) 전체 건강 데이터 스냅샷 가져오기
   * @returns 오늘의 모든 건강 데이터
   * - aggregate: 집계 데이터 (걸음수, 거리, 칼로리, 운동시간, 수면시간)
   * - heartRate: 심박수 샘플 배열
   * - exerciseSessions: 운동 세션 배열 (세션별 칼로리 포함)
   * - sleepSessions: 수면 세션 배열 (제목, 시작/종료 시각, 메모)
   * - weight: 체중 기록 배열
   * - bodyFat: 체지방 기록 배열
   * - vo2max: VO2Max 기록 배열
   * - hydration: 수분 섭취 기록 배열
   * - nutrition: 영양 기록 배열
   */
  getTodaySnapshot(): Promise<TodaySnapshot>;

  /**
   * 임의 기간의 건강 데이터 스냅샷 가져오기 (향후 구현)
   * @param options 시작/종료 시각 (ISO 8601 형식)
   * @returns 해당 기간의 건강 데이터
   */
  getSnapshotForRange(options: SnapshotRangeOptions): Promise<TodaySnapshot>;
}

/**
 * Health Connect Plugin 등록
 */
const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect', {
  web: () => import('./web').then((m) => new m.HealthConnectWeb()),
});

export default HealthConnect;
