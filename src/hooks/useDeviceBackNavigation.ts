import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function useDeviceBackNavigation(fallback = "/") {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const targetFallback =
      typeof location.state === "object" &&
      location.state !== null &&
      "from" in location.state &&
      typeof (location.state as { from?: unknown }).from === "string"
        ? ((location.state as { from: string }).from || fallback)
        : fallback;

    window.history.pushState({ guard: true, path: location.pathname }, "", window.location.href);

    const handlePopState = () => {
      navigate(targetFallback, { replace: true });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [fallback, location.pathname, location.state, navigate]);
}
