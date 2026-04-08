const memorySecrets = new Map<string, string>();

function hasSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function setSecret(key: string, value: string) {
  const normalized = value.trim();
  if (!normalized) {
    removeSecret(key);
    return;
  }

  memorySecrets.set(key, normalized);
  if (hasSessionStorage()) {
    window.sessionStorage.setItem(key, normalized);
  }
}

export function getSecret(key: string) {
  const memoryValue = memorySecrets.get(key);
  if (memoryValue) {
    return memoryValue;
  }

  if (!hasSessionStorage()) {
    return "";
  }

  const stored = window.sessionStorage.getItem(key)?.trim() || "";
  if (stored) {
    memorySecrets.set(key, stored);
  }
  return stored;
}

export function hasSecret(key: string) {
  return Boolean(getSecret(key));
}

export function removeSecret(key: string) {
  memorySecrets.delete(key);
  if (hasSessionStorage()) {
    window.sessionStorage.removeItem(key);
  }
}
