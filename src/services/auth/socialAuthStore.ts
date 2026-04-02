export interface KakaoAuthConfig {
  restApiKey: string;
  clientSecret: string;
  redirectUri: string;
  consentScope: string;
}

export interface LineAuthConfig {
  channelId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
}

const KAKAO_KEY = "kakao_auth_config";
const LINE_KEY = "line_auth_config";

function readJson<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) {
    return fallback;
  }
  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getKakaoAuthConfig(): KakaoAuthConfig {
  return readJson<KakaoAuthConfig>(KAKAO_KEY, {
    restApiKey: "",
    clientSecret: "",
    redirectUri: "https://rhhealthcare.app/auth/kakao/callback",
    consentScope: "profile_nickname,account_email,name,phone_number",
  });
}

export function setKakaoAuthConfig(config: KakaoAuthConfig) {
  writeJson(KAKAO_KEY, config);
}

export function getLineAuthConfig(): LineAuthConfig {
  return readJson<LineAuthConfig>(LINE_KEY, {
    channelId: "",
    clientSecret: "",
    redirectUri: "https://rhhealthcare.app/auth/line/callback",
    scope: "profile openid email",
  });
}

export function setLineAuthConfig(config: LineAuthConfig) {
  writeJson(LINE_KEY, config);
}
