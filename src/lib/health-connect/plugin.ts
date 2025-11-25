import { registerPlugin } from '@capacitor/core';
import type {
  HealthConnectStatus,
  PermissionStatus,
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
   * @returns status 코드 (1: 사용 가능, 0: 사용 불가)
   */
  getStatus(): Promise<HealthConnectStatus>;

  /**
   * 현재 부여된 Health Connect 권한 상태 확인
   * @returns 권한 부여 상태 및 목록
   */
  getPermissionStatus(): Promise<PermissionStatus>;

  /**
   * 오늘 하루(0시 ~ 현재) 전체 건강 데이터 스냅샷 가져오기
   * @returns 오늘의 모든 건강 데이터 (집계, 심박, 운동, 수면, 체성분, 수분, 영양)
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
