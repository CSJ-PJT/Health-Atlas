import { getKakaoAuthConfig } from "@/services/auth/socialAuthStore";
import { setSecret } from "@/services/security/secretStorage";

export interface KakaoTokenResponse {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
}

export function buildKakaoAuthorizeUrl() {
  const config = getKakaoAuthConfig();
  const state = `kakao-${Date.now()}`;
  localStorage.setItem("kakao_oauth_state", state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.restApiKey,
    redirect_uri: config.redirectUri,
    state,
  });

  if (config.consentScope.trim()) {
    params.set("scope", config.consentScope.trim());
  }

  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeKakaoCode(code: string) {
  const config = getKakaoAuthConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.restApiKey,
    redirect_uri: config.redirectUri,
    code,
  });

  if (config.clientSecret.trim()) {
    body.set("client_secret", config.clientSecret.trim());
  }

  const response = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const json = (await response.json()) as KakaoTokenResponse;
  setSecret("kakao_access_token", json.access_token);
  if (json.refresh_token) {
    setSecret("kakao_refresh_token", json.refresh_token);
  }
  return json;
}

export async function getKakaoUserProfile(accessToken: string) {
  const response = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export function startKakaoLogin() {
  const url = buildKakaoAuthorizeUrl();
  window.location.href = url;
}
