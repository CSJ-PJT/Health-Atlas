import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type BackNavigationOptions = {
  fallback?: string;
  isRootPage?: boolean;
  onBackWithinPage?: () => boolean | void;
};

type BackHandlerWindow = Window & {
  __rhHandleBack?: () => boolean;
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
        ? ((location.state as { from?: string }).from || fallback)
        : fallback;

    const handleBack = () => {
      if (onBackWithinPageRef.current?.()) {
        return true;
      }

      if (options.isRootPage) {
        return false;
      }

      navigate(targetFallback, {
        replace: true,
        state: { from: location.pathname },
      });
      return true;
    };

    (window as BackHandlerWindow).__rhHandleBack = handleBack;

    return () => {
      if ((window as BackHandlerWindow).__rhHandleBack === handleBack) {
        delete (window as BackHandlerWindow).__rhHandleBack;
      }
    };
  }, [location.pathname, location.state, navigate, options.fallback, options.isRootPage]);
}
