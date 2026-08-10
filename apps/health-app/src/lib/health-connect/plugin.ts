import { registerPlugin } from '@capacitor/core';
import type {
  HealthConnectStatus,
  HealthConnectPermissionStatus,
  TodaySnapshot,
  SnapshotRangeOptions,
} from './types';

/**
 * Health Connect Plugin Interface
 * Capacitor ?뚮윭洹몄씤 硫붿꽌???뺤쓽
 */
export interface HealthConnectPlugin {
  ping(): Promise<{ value: string }>;
  /**
   * Health Connect SDK ?ъ슜 媛???щ? ?뺤씤
   * @returns status 肄붾뱶 諛??곹깭 ?띿뒪??
   * - status: SDK_AVAILABLE(3), SDK_UNAVAILABLE(1), SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED(2)
   * - statusText: "AVAILABLE" | "UNAVAILABLE" | "PROVIDER_UPDATE_REQUIRED" | "UNKNOWN"
   */
  getStatus(): Promise<HealthConnectStatus>;

  /**
   * Health Connect 沅뚰븳 ?붿껌
   * @returns 沅뚰븳 ?붿껌 寃곌낵
   */
  requestPermissions(): Promise<{ granted: boolean }>;

  /**
   * ?꾩옱 遺?щ맂 Health Connect 沅뚰븳 ?곹깭 ?뺤씤
   * @returns 沅뚰븳 遺???곹깭 諛?紐⑸줉
   */
  checkPermissions(): Promise<HealthConnectPermissionStatus>;
  getPermissionStatus(): Promise<HealthConnectPermissionStatus>;
  openHealthConnectSettings(): Promise<{ opened: boolean }>;
  readSummary(options?: { period?: string; dataOriginPackage?: string; dataOriginPackages?: string[] }): Promise<unknown>;

  /**
   * ?ㅻ뒛 ?섎（(0??~ ?꾩옱) ?꾩껜 嫄닿컯 ?곗씠???ㅻ깄??媛?몄삤湲?
   * @returns ?ㅻ뒛??紐⑤뱺 嫄닿컯 ?곗씠??
   * - aggregate: 吏묎퀎 ?곗씠??(嫄몄쓬?? 嫄곕━, 移쇰줈由? ?대룞?쒓컙, ?섎㈃?쒓컙)
   * - heartRate: ?щ컯???섑뵆 諛곗뿴
   * - exerciseSessions: ?대룞 ?몄뀡 諛곗뿴 (?몄뀡蹂?移쇰줈由??ы븿)
   * - sleepSessions: ?섎㈃ ?몄뀡 諛곗뿴 (?쒕ぉ, ?쒖옉/醫낅즺 ?쒓컖, 硫붾え)
   * - weight: 泥댁쨷 湲곕줉 諛곗뿴
   * - bodyFat: 泥댁?諛?湲곕줉 諛곗뿴
   * - vo2max: VO2Max 湲곕줉 諛곗뿴
   * - hydration: ?섎텇 ??랬 湲곕줉 諛곗뿴
   * - nutrition: ?곸뼇 湲곕줉 諛곗뿴
   */
  getTodaySnapshot(options?: { dataOriginPackage?: string; dataOriginPackages?: string[] }): Promise<TodaySnapshot>;

  /**
   * ?꾩쓽 湲곌컙??嫄닿컯 ?곗씠???ㅻ깄??媛?몄삤湲?(?ν썑 援ы쁽)
   * @param options ?쒖옉/醫낅즺 ?쒓컖 (ISO 8601 ?뺤떇)
   * @returns ?대떦 湲곌컙??嫄닿컯 ?곗씠??
   */
  getSnapshotForRange(options: SnapshotRangeOptions & { dataOriginPackage?: string; dataOriginPackages?: string[] }): Promise<TodaySnapshot>;
}

/**
 * Health Connect Plugin ?깅줉
 */
const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect', {
  web: () => import('./web').then((m) => new m.HealthConnectWeb()),
});

export default HealthConnect;
