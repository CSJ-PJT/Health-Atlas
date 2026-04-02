import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TAB_ROUTES = ["/", "/history", "/comparison", "/chat", "/feed", "/game"];

const INTERACTIVE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "VIDEO"]);

export const SwipeTabNavigator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const currentX = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);
  const interactiveStart = useRef(false);

  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      const target = event.target as HTMLElement | null;
      interactiveStart.current = !!target?.closest("input, textarea, select, button, video, [data-no-swipe='true']");
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      currentX.current = touch.clientX;
      currentY.current = touch.clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (startX.current === null || startY.current === null) {
        return;
      }
      const touch = event.touches[0];
      currentX.current = touch.clientX;
      currentY.current = touch.clientY;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (interactiveStart.current || startX.current === null || startY.current === null) {
        startX.current = null;
        startY.current = null;
        currentX.current = null;
        currentY.current = null;
        return;
      }

      const touch = event.changedTouches[0];
      const endX = currentX.current ?? touch.clientX;
      const endY = currentY.current ?? touch.clientY;
      const deltaX = endX - startX.current;
      const deltaY = endY - startY.current;

      startX.current = null;
      startY.current = null;
      currentX.current = null;
      currentY.current = null;

      if (Math.abs(deltaX) < 42 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) {
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
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [location.pathname, navigate]);

  return null;
};
