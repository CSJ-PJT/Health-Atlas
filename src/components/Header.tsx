import { useEffect, useState } from "react";
import { Home, MessageCircleMore, Settings, UserRoundPlus, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AdviceDrawer } from "@/components/AdviceDrawer";
import { NavLink } from "@/components/NavLink";
import { getProviderMeta, getStoredProviderId } from "@/providers/shared";

interface HeaderProps {
  showNav?: boolean;
}

export const Header = ({ showNav = false }: HeaderProps) => {
  const location = useLocation();
  const [nickname, setNickname] = useState("");
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const providerMeta = getProviderMeta(getStoredProviderId());

  useEffect(() => {
    const storedNickname = localStorage.getItem("user_nickname") || "";
    setNickname(storedNickname);
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 30) {
        setIsNavVisible(false);
      } else {
        setIsNavVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-4">
        <div className="flex h-20 items-center justify-between gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80">
            <img src="/app-icon.png" alt="Logo" className="h-12 w-12" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold leading-tight">Roboheart Healthcare</h1>
              <p className="truncate text-xs text-muted-foreground">{providerMeta.subtitle}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden text-xs text-muted-foreground sm:block">{nickname}</div>
            <AdviceDrawer />
          </div>
        </div>

        {showNav ? (
          <nav
            className={`-mx-4 overflow-x-auto border-y border-primary/20 bg-primary/5 px-2 transition-all duration-300 ease-in-out ${
              isNavVisible ? "max-h-24 py-3 opacity-100" : "max-h-0 overflow-hidden py-0 opacity-0"
            }`}
          >
            <div className="flex min-w-max gap-1">
              <NavLink
                to="/"
                className="flex min-w-[72px] flex-1 items-center justify-center rounded-lg bg-primary/20 px-4 py-3.5 transition-colors hover:bg-primary/30"
              >
                <Home className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/history"
                className="flex min-w-[84px] flex-1 items-center justify-center rounded-lg bg-accent/20 px-4 py-3.5 text-center transition-colors hover:bg-accent/30"
              >
                <span className="whitespace-nowrap text-sm font-medium">기록</span>
              </NavLink>
              <NavLink
                to="/comparison"
                className="flex min-w-[84px] flex-1 items-center justify-center rounded-lg bg-secondary/30 px-4 py-3.5 text-center transition-colors hover:bg-secondary/50"
              >
                <span className="whitespace-nowrap text-sm font-medium">비교</span>
              </NavLink>
              <NavLink
                to="/friends"
                className="flex min-w-[84px] flex-1 items-center justify-center rounded-lg bg-emerald-500/15 px-4 py-3.5 text-center transition-colors hover:bg-emerald-500/25"
              >
                <span className="flex items-center gap-2 whitespace-nowrap text-sm font-medium">
                  <UserRoundPlus className="h-4 w-4" />
                  친구
                </span>
              </NavLink>
              <NavLink
                to="/chat"
                className="flex min-w-[84px] flex-1 items-center justify-center rounded-lg bg-sky-500/15 px-4 py-3.5 text-center transition-colors hover:bg-sky-500/25"
              >
                <span className="flex items-center gap-2 whitespace-nowrap text-sm font-medium">
                  <MessageCircleMore className="h-4 w-4" />
                  대화
                </span>
              </NavLink>
              <NavLink
                to="/monitor"
                className="flex min-w-[84px] flex-1 items-center justify-center rounded-lg bg-muted/50 px-4 py-3.5 text-center transition-colors hover:bg-muted/70"
              >
                <span className="whitespace-nowrap text-sm font-medium">연동</span>
              </NavLink>
              <NavLink
                to="/admin"
                className="flex min-w-[72px] flex-1 items-center justify-center rounded-lg bg-primary/20 px-4 py-3.5 transition-colors hover:bg-primary/30"
              >
                <Settings className="h-5 w-5" />
              </NavLink>
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
};
