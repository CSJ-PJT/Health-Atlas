import { getSecret, setSecret } from "@/services/security/secretStorage";

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
const KAKAO_SECRET_KEY = "kakao_auth_config_client_secret";
const LINE_SECRET_KEY = "line_auth_config_client_secret";

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
  const config = readJson<KakaoAuthConfig>(KAKAO_KEY, {
    restApiKey: "",
    clientSecret: "",
    redirectUri: "https://rhhealthcare.app/auth/kakao/callback",
    consentScope: "profile_nickname,account_email,name,phone_number",
  });
  return {
    ...config,
    clientSecret: getSecret(KAKAO_SECRET_KEY),
  };
}

export function setKakaoAuthConfig(config: KakaoAuthConfig) {
  setSecret(KAKAO_SECRET_KEY, config.clientSecret);
  writeJson(KAKAO_KEY, {
    ...config,
    clientSecret: "",
  });
}

export function getLineAuthConfig(): LineAuthConfig {
  const config = readJson<LineAuthConfig>(LINE_KEY, {
    channelId: "",
    clientSecret: "",
    redirectUri: "https://rhhealthcare.app/auth/line/callback",
    scope: "profile openid email",
  });
  return {
    ...config,
    clientSecret: getSecret(LINE_SECRET_KEY),
  };
}

export function setLineAuthConfig(config: LineAuthConfig) {
  setSecret(LINE_SECRET_KEY, config.clientSecret);
  writeJson(LINE_KEY, {
    ...config,
    clientSecret: "",
  });
}
