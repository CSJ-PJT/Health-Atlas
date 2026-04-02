import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TAB_ROUTES = ["/", "/history", "/comparison", "/friends", "/chat", "/feed", "/game"];

const INTERACTIVE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "VIDEO"]);

export const SwipeTabNavigator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const interactiveStart = useRef(false);

  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      const target = event.target as HTMLElement | null;
      interactiveStart.current = !!target?.closest("input, textarea, select, button, video, [data-no-swipe='true']");
      startX.current = touch.clientX;
      startY.current = touch.clientY;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (interactiveStart.current || startX.current === null || startY.current === null) {
        startX.current = null;
        startY.current = null;
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startX.current;
      const deltaY = touch.clientY - startY.current;

      startX.current = null;
      startY.current = null;

      if (Math.abs(deltaX) < 70 || Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      const currentIndex = TAB_ROUTES.indexOf(location.pathname);
      if (currentIndex === -1) {
        return;
      }

      if (deltaX < 0 && currentIndex < TAB_ROUTES.length - 1) {
        navigate(TAB_ROUTES[currentIndex + 1]);
      }

      if (deltaX > 0 && currentIndex > 0) {
        navigate(TAB_ROUTES[currentIndex - 1]);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [location.pathname, navigate]);

  return null;
};
