import { useEffect, useState } from "react";
import { Home, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
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
          <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <img src="/app-icon.png" alt="Logo" className="h-12 w-12" />
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold leading-tight">Roboheart Healthcare</h1>
              <p className="text-xs text-muted-foreground">{providerMeta.subtitle}</p>
            </div>
          </Link>
          <div className="text-xs text-muted-foreground">{nickname}</div>
        </div>

        {showNav && (
          <nav
            className={`-mx-4 flex gap-1 border-y border-primary/20 bg-primary/5 px-2 transition-all duration-300 ease-in-out ${
              isNavVisible ? "max-h-24 py-4 opacity-100" : "max-h-0 overflow-hidden py-0 opacity-0"
            }`}
          >
            <NavLink
              to="/"
              className="flex flex-1 items-center justify-center rounded-lg bg-primary/20 px-6 py-3.5 text-center transition-colors hover:bg-primary/30"
            >
              <Home className="h-6 w-6" />
            </NavLink>
            <NavLink
              to="/history"
              className="flex flex-1 items-center justify-center rounded-lg bg-accent/20 px-6 py-3.5 text-center transition-colors hover:bg-accent/30"
            >
              <span className="whitespace-nowrap text-base font-medium">기록</span>
            </NavLink>
            <NavLink
              to="/comparison"
              className="flex flex-1 items-center justify-center rounded-lg bg-secondary/30 px-6 py-3.5 text-center transition-colors hover:bg-secondary/50"
            >
              <span className="whitespace-nowrap text-base font-medium">비교</span>
            </NavLink>
            <NavLink
              to="/monitor"
              className="flex flex-1 items-center justify-center rounded-lg bg-muted/50 px-6 py-3.5 text-center transition-colors hover:bg-muted/70"
            >
              <span className="whitespace-nowrap text-base font-medium">연동</span>
            </NavLink>
            <NavLink
              to="/admin"
              className="flex flex-1 items-center justify-center rounded-lg bg-primary/20 px-6 py-3.5 text-center transition-colors hover:bg-primary/30"
            >
              <Settings className="h-6 w-6" />
            </NavLink>
          </nav>
        )}
      </div>
    </header>
  );
};
