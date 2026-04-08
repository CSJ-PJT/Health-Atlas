import { registerPlugin } from '@capacitor/core';

export interface HealthConnectPermission {
  READ_STEPS: string;
  READ_HEART_RATE: string;
  READ_SLEEP: string;
  READ_EXERCISE: string;
  READ_NUTRITION: string;
  READ_BODY_COMPOSITION: string;
  READ_BLOOD_PRESSURE: string;
  WRITE_STEPS: string;
  WRITE_HEART_RATE: string;
  WRITE_SLEEP: string;
  WRITE_EXERCISE: string;
  WRITE_NUTRITION: string;
  WRITE_BODY_COMPOSITION: string;
  WRITE_BLOOD_PRESSURE: string;
}

export interface HealthData {
  steps?: number;
  distance?: number;
  calories?: number;
  heartRate?: number;
  sleepHours?: number;
  exerciseMinutes?: number;
  weight?: number;
  bodyFat?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  water?: number;
}

export interface HealthConnectPlugin {
  /**
   * Check if Health Connect is available on the device
   */
  isAvailable(): Promise<{ available: boolean }>;
  
  /**
   * Request permissions for Health Connect
   */
  requestPermissions(options: { permissions: string[] }): Promise<{ granted: boolean }>;
  
  /**
   * Check if specific permissions are granted
   */
  checkPermissions(options: { permissions: string[] }): Promise<{ granted: { [key: string]: boolean } }>;
  
  /**
   * Read health data for a specific time period
   */
  readHealthData(options: { 
    startTime: string; 
    endTime: string;
    dataTypes: string[];
  }): Promise<{ data: HealthData }>;
  
  /**
   * Write health data
   */
  writeHealthData(options: { data: HealthData }): Promise<{ success: boolean }>;
  
  /**
   * Get aggregated health data
   */
  getAggregatedData(options: {
    startTime: string;
    endTime: string;
    aggregationType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  }): Promise<{ data: HealthData }>;
}

const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect', {
  web: () => import('./HealthConnectPluginWeb').then(m => new m.HealthConnectPluginWeb()),
});

export default HealthConnect;

export const HEALTH_CONNECT_PERMISSIONS: HealthConnectPermission = {
  READ_STEPS: 'android.permission.health.READ_STEPS',
  READ_HEART_RATE: 'android.permission.health.READ_HEART_RATE',
  READ_SLEEP: 'android.permission.health.READ_SLEEP',
  READ_EXERCISE: 'android.permission.health.READ_EXERCISE',
  READ_NUTRITION: 'android.permission.health.READ_NUTRITION',
  READ_BODY_COMPOSITION: 'android.permission.health.READ_BODY_COMPOSITION',
  READ_BLOOD_PRESSURE: 'android.permission.health.READ_BLOOD_PRESSURE',
  WRITE_STEPS: 'android.permission.health.WRITE_STEPS',
  WRITE_HEART_RATE: 'android.permission.health.WRITE_HEART_RATE',
  WRITE_SLEEP: 'android.permission.health.WRITE_SLEEP',
  WRITE_EXERCISE: 'android.permission.health.WRITE_EXERCISE',
  WRITE_NUTRITION: 'android.permission.health.WRITE_NUTRITION',
  WRITE_BODY_COMPOSITION: 'android.permission.health.WRITE_BODY_COMPOSITION',
  WRITE_BLOOD_PRESSURE: 'android.permission.health.WRITE_BLOOD_PRESSURE',
};
