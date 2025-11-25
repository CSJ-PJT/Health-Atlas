import { WebPlugin } from '@capacitor/core';
import type { HealthConnectPlugin } from './plugin';
import type {
  HealthConnectStatus,
  HealthConnectPermissionStatus,
  TodaySnapshot,
  SnapshotRangeOptions,
} from './types';

/**
 * Web implementation of Health Connect Plugin
 * (웹 환경에서는 실제 데이터 반환 불가, 테스트용 mock 데이터)
 */
export class HealthConnectWeb extends WebPlugin implements HealthConnectPlugin {
  async getStatus(): Promise<HealthConnectStatus> {
    console.warn('Health Connect is not available on web platform');
    return { 
      status: 0,
      statusText: 'UNAVAILABLE'
    };
  }

  async getPermissionStatus(): Promise<HealthConnectPermissionStatus> {
    console.warn('Health Connect permissions not available on web');
    return {
      hasAll: false,
      granted: [],
      requiredCount: 0,
      grantedCount: 0,
    };
  }

  async requestPermissions(): Promise<{ granted: boolean }> {
    console.warn('Health Connect permission request not available on web');
    return { granted: false };
  }

  async getTodaySnapshot(): Promise<TodaySnapshot> {
    console.warn('Health Connect data not available on web platform');
    return {
      aggregate: {
        steps: 0,
        distanceMeter: 0,
        activeCaloriesKcal: 0,
        exerciseDurationMinutes: 0,
        sleepDurationMinutes: 0,
      },
      heartRate: [],
      exerciseSessions: [],
      sleepSessions: [],
      sleepStageSummary: {
        deepMinutes: 0,
        lightMinutes: 0,
        remMinutes: 0,
        awakeMinutes: 0,
      },
      weight: [],
      bodyFat: [],
      vo2max: [],
      hydration: [],
      nutrition: [],
    };
  }

  async getSnapshotForRange(options: SnapshotRangeOptions): Promise<TodaySnapshot> {
    console.warn('Health Connect range query not available on web platform', options);
    return this.getTodaySnapshot();
  }
}
