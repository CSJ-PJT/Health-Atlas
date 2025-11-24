import { WebPlugin } from '@capacitor/core';
import type { HealthConnectPlugin, HealthData } from './HealthConnectPlugin';

export class HealthConnectPluginWeb extends WebPlugin implements HealthConnectPlugin {
  async isAvailable(): Promise<{ available: boolean }> {
    console.log('Health Connect is not available on web');
    return { available: false };
  }

  async requestPermissions(): Promise<{ granted: boolean }> {
    console.log('Health Connect permissions cannot be requested on web');
    return { granted: false };
  }

  async checkPermissions(): Promise<{ granted: { [key: string]: boolean } }> {
    console.log('Health Connect permissions cannot be checked on web');
    return { granted: {} };
  }

  async readHealthData(): Promise<{ data: HealthData }> {
    console.log('Health Connect data cannot be read on web');
    return {
      data: {
        steps: 0,
        distance: 0,
        calories: 0,
      },
    };
  }

  async writeHealthData(): Promise<{ success: boolean }> {
    console.log('Health Connect data cannot be written on web');
    return { success: false };
  }

  async getAggregatedData(): Promise<{ data: HealthData }> {
    console.log('Health Connect aggregated data cannot be retrieved on web');
    return {
      data: {
        steps: 0,
        distance: 0,
        calories: 0,
      },
    };
  }
}
