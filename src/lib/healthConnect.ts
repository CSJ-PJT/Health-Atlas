import { registerPlugin } from '@capacitor/core';

export interface HealthSummary {
  timeRangeStart: string;
  timeRangeEnd: string;
  steps: any[];
  heartRate: any[];
  exercises: any[];
  sleepSessions: any[];
  body: {
    weight: any[];
    bodyFat: any[];
  };
  nutrition: any[];
}

export interface CheckPermissionsResult {
  hasAllPermissions: boolean;
  granted: string[];
  missing: string[];
}

export interface HealthConnectPlugin {
  ping(): Promise<{ value: string }>;
  checkPermissions(): Promise<CheckPermissionsResult>;
  requestPermissions(): Promise<CheckPermissionsResult>;
  openHealthConnectSettings(): Promise<{ opened: boolean }>;
  readSummary(): Promise<HealthSummary>;
}

export const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect');
