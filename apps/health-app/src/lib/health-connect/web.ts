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
  async ping(): Promise<{ value: string }> {
    return { value: "web" };
  }

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
      hasAllPermissions: false,
      hasAll: false,
      granted: [],
      missing: [],
      requiredCount: 0,
      grantedCount: 0,
    };
  }

  async checkPermissions(): Promise<HealthConnectPermissionStatus> {
    return this.getPermissionStatus();
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

  async openHealthConnectSettings(): Promise<{ opened: boolean }> {
    console.warn("Health Connect settings are not available on web");
    return { opened: false };
  }

  async readSummary(): Promise<unknown> {
    const snapshot = await this.getTodaySnapshot();
    return {
      steps: [{ count: snapshot.aggregate.steps, startTime: "", endTime: "" }],
      totalSteps: snapshot.aggregate.steps,
      distanceMeter: snapshot.aggregate.distanceMeter,
      activeCaloriesKcal: snapshot.aggregate.activeCaloriesKcal,
      heartRate: snapshot.heartRate,
      exercises: snapshot.exerciseSessions.map((session) => ({
        title: session.title,
        exerciseType: Number(session.exerciseType || 0),
        startTime: session.startTime,
        endTime: session.endTime,
        durationMinutes: Number(session.durationMinutes || 0),
        distanceMeter: Number(session.distanceMeter || 0),
        caloriesKcal: Number(session.caloriesKcal || 0),
      })),
      sleepSessions: snapshot.sleepSessions.map((session) => ({
        title: session.title,
        startTime: session.startTime,
        endTime: session.endTime,
        durationMinutes: Number(session.durationMinutes || 0),
      })),
      nutrition: snapshot.nutrition.map((item) => ({
        time: item.startTime,
        energyKcal: item.energyKcal,
        proteinGrams: item.proteinGrams,
        fatGrams: item.fatGrams,
        carbsGrams: item.carbsGrams,
      })),
      body: {
        weight: snapshot.weight.map((entry) => ({ kg: entry.weightKg, time: entry.time })),
        bodyFat: snapshot.bodyFat.map((entry) => ({ percentage: entry.percentage, time: entry.time })),
      },
      sleepMinutes: snapshot.aggregate.sleepDurationMinutes,
      exerciseMinutes: snapshot.aggregate.exerciseDurationMinutes,
    };
  }
}
