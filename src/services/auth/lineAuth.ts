import { getLineAuthConfig } from "@/services/auth/socialAuthStore";

export function buildLineAuthorizeUrl() {
  const config = getLineAuthConfig();
  const state = `line-${Date.now()}`;
  const nonce = `nonce-${Date.now()}`;
  localStorage.setItem("line_oauth_state", state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.channelId,
    redirect_uri: config.redirectUri,
    state,
    nonce,
    scope: config.scope,
  });

  return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
}

export function startLineLogin() {
  window.location.href = buildLineAuthorizeUrl();
}
