import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

type BackNavigationOptions = {
  fallback?: string;
  isRootPage?: boolean;
  exitMessage?: string;
  onBackWithinPage?: () => boolean | void;
};

type CapacitorAppPlugin = {
  addListener?: (eventName: string, listener: () => void) => Promise<{ remove: () => void }> | { remove: () => void };
  exitApp?: () => void;
};

type CapacitorWindow = Window & {
  Capacitor?: {
    Plugins?: {
      App?: CapacitorAppPlugin;
    };
  };
};

function isOptions(value: string | BackNavigationOptions): value is BackNavigationOptions {
  return typeof value === "object";
}

let lastBackAttemptAt = 0;
let lastBackHandledAt = 0;

export function useDeviceBackNavigation(input: string | BackNavigationOptions = "/") {
  const navigate = useNavigate();
  const location = useLocation();
  const options = isOptions(input) ? input : { fallback: input };
  const onBackWithinPageRef = useRef<BackNavigationOptions["onBackWithinPage"]>(options.onBackWithinPage);

  useEffect(() => {
    onBackWithinPageRef.current = options.onBackWithinPage;
  }, [options.onBackWithinPage]);

  useEffect(() => {
    const fallback = options.fallback || "/";
    const targetFallback =
      typeof location.state === "object" &&
      location.state !== null &&
      "from" in location.state &&
      typeof (location.state as { from?: unknown }).from === "string"
        ? ((location.state as { from?: string }).from || fallback)
        : fallback;

    const pushGuardState = () => {
      window.history.pushState({ guard: true, path: location.pathname }, "", window.location.href);
    };

    const tryExitApp = () => {
      const appPlugin = (window as CapacitorWindow).Capacitor?.Plugins?.App;
      appPlugin?.exitApp?.();
      const navigatorWithApp = navigator as Navigator & { app?: { exitApp?: () => void } };
      navigatorWithApp.app?.exitApp?.();
      window.close();
      window.setTimeout(pushGuardState, 150);
    };

    const handleBackAttempt = () => {
      const now = Date.now();
      if (now - lastBackHandledAt < 250) {
        return;
      }
      lastBackHandledAt = now;

      if (onBackWithinPageRef.current?.()) {
        pushGuardState();
        return;
      }

      if (options.isRootPage) {
        if (now - lastBackAttemptAt < 2000) {
          tryExitApp();
        } else {
          lastBackAttemptAt = now;
          toast(options.exitMessage || "종료하려면 다시 눌러 주세요");
          pushGuardState();
        }
        return;
      }

      navigate(targetFallback, {
        replace: true,
        state: { from: location.pathname },
      });
    };

    pushGuardState();

    const handlePopState = () => handleBackAttempt();
    const handleNativeBack = (event: Event) => {
      event.preventDefault();
      handleBackAttempt();
    };

    window.addEventListener("popstate", handlePopState);
    document.addEventListener("backbutton", handleNativeBack, false);

    let removeNativeListener: (() => void) | undefined;
    const appPlugin = (window as CapacitorWindow).Capacitor?.Plugins?.App;
    const listenerResult = appPlugin?.addListener?.("backButton", () => {
      handleBackAttempt();
    });

    Promise.resolve(listenerResult)
      .then((listener) => {
        removeNativeListener = listener?.remove;
      })
      .catch(() => {
        removeNativeListener = undefined;
      });

    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("backbutton", handleNativeBack, false);
      removeNativeListener?.();
    };
  }, [location.pathname, location.state, navigate, options.exitMessage, options.fallback, options.isRootPage]);
}
