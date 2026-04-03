import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type BackNavigationOptions = {
  fallback?: string;
  isRootPage?: boolean;
  exitMessage?: string;
  onBackWithinPage?: () => boolean | void;
};

function isOptions(value: string | BackNavigationOptions): value is BackNavigationOptions {
  return typeof value === "object";
}

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
        ? ((location.state as { from: string }).from || fallback)
        : fallback;

    const pushGuardState = () => {
      window.history.pushState({ guard: true, path: location.pathname }, "", window.location.href);
    };

    const tryExitApp = () => {
      const navigatorWithApp = navigator as Navigator & {
        app?: { exitApp?: () => void };
      };
      navigatorWithApp.app?.exitApp?.();
      window.close();
      window.setTimeout(pushGuardState, 150);
    };

    const handleBackAttempt = () => {
      if (onBackWithinPageRef.current?.()) {
        pushGuardState();
        return;
      }

      if (options.isRootPage) {
        const shouldExit = window.confirm(options.exitMessage || "어플을 종료할까요?");
        if (shouldExit) {
          tryExitApp();
        } else {
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

    const handlePopState = () => {
      handleBackAttempt();
    };

    const handleNativeBack = (event: Event) => {
      event.preventDefault();
      handleBackAttempt();
    };

    window.addEventListener("popstate", handlePopState);
    document.addEventListener("backbutton", handleNativeBack, false);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("backbutton", handleNativeBack, false);
    };
  }, [location.pathname, location.state, navigate, options.exitMessage, options.fallback, options.isRootPage]);
}
