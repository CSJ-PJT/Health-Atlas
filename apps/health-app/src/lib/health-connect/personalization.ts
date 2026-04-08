export type Sex = "male" | "female" | "unknown";

export interface UserProfile {
  heightCm?: number;     // 선택
  weightKg?: number;     // 선택 (없으면 body_composition_data의 latest로 대체)
  age?: number;          // 선택
  sex?: Sex;             // 선택
}

export interface CalcPrefs {
  // 1) 가능한 경우 health connect 값을 그대로 쓰고, 없을 때만 아래 사용
  strideMeters?: number;         // 기본 0.67m
  kcalPerStep?: number;          // 기본 0.043 (걷기 기준)
  stepsPerMinute?: number;       // 기본 105 (걷기 기준)
  restingKcalMethod?: "fixed" | "mifflin" | "none";
  restingKcalFixed?: number;     // fixed일 때 사용
}

const KEY_PROFILE = "user_profile";
const KEY_PREFS = "calc_prefs";

export const defaultPrefs: CalcPrefs = {
  strideMeters: 0.67,
  kcalPerStep: 0.043,
  stepsPerMinute: 105,
  restingKcalMethod: "mifflin",
  restingKcalFixed: 1900,
};

export function loadUserProfile(): UserProfile {
  try {
    return JSON.parse(localStorage.getItem(KEY_PROFILE) || "{}");
  } catch {
    return {};
  }
}

export function saveUserProfile(p: UserProfile) {
  localStorage.setItem(KEY_PROFILE, JSON.stringify(p));
}

export function loadCalcPrefs(): CalcPrefs {
  try {
    return { ...defaultPrefs, ...(JSON.parse(localStorage.getItem(KEY_PREFS) || "{}")) };
  } catch {
    return { ...defaultPrefs };
  }
}

export function saveCalcPrefs(p: CalcPrefs) {
  localStorage.setItem(KEY_PREFS, JSON.stringify(p));
}

// Mifflin-St Jeor BMR (kcal/day)
// 남: 10w + 6.25h - 5a + 5
// 여: 10w + 6.25h - 5a - 161
export function estimateBmrMifflin(profile: UserProfile): number | null {
  const w = profile.weightKg;
  const h = profile.heightCm;
  const a = profile.age;
  if (!w || !h || !a) return null;

  const base = 10 * w + 6.25 * h - 5 * a;
  if (profile.sex === "male") return Math.round(base + 5);
  if (profile.sex === "female") return Math.round(base - 161);
  return Math.round(base); // unknown이면 보정 없이
}
