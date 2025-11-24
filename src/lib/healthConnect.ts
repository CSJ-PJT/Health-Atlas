import { registerPlugin } from '@capacitor/core';

const HealthConnect = registerPlugin<HealthConnectPluginInterface>('HealthConnect');

export interface HealthConnectPluginInterface {
  readTodaySnapshot(): Promise<TodaySnapshot>;
  ensurePermissions(): Promise<{ granted: boolean }>;
}

export interface TodaySnapshot {
  startTime: string;
  endTime: string;
  steps: number;
  distance: number;
  calories: number;
  heartRate: number;
  sleep: number;
  exercises: number;
  bodyweight: number;
  bodyfat: number;
}

export async function readTodaySnapshot(): Promise<TodaySnapshot> {
  const result = await HealthConnect.readTodaySnapshot();
  return result as TodaySnapshot;
}

export async function ensurePermissions(): Promise<boolean> {
  try {
    const result = await HealthConnect.ensurePermissions();
    return result.granted;
  } catch (error) {
    console.error('Failed to ensure permissions:', error);
    return false;
  }
}
