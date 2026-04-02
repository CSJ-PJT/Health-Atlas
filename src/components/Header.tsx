import { useEffect, useState } from "react";
import { Activity, BarChart3, Gamepad2, Home, MessageCircleMore, Settings, Users, View } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AdviceDrawer } from "@/components/AdviceDrawer";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HeaderProps {
  showNav?: boolean;
}

export const Header = ({ showNav = false }: HeaderProps) => {
  const location = useLocation();
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    setNickname(localStorage.getItem("user_nickname") || "");
    setAvatarUrl(localStorage.getItem("user_avatar") || "");
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 24) {
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/96 backdrop-blur supports-[backdrop-filter]:bg-background/76">
      <div className="container px-3">
        <div className="flex h-16 items-center justify-between gap-2">
          <Link to="/" className="flex min-w-0 flex-1 items-center gap-2 transition-opacity hover:opacity-80">
            <img src="/app-icon.png" alt="Logo" className="h-10 w-10 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold leading-tight text-foreground sm:text-lg">Roboheart Healthcare</h1>
              <p className="line-clamp-1 text-[11px] text-muted-foreground">{nickname}</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Avatar className="h-8 w-8 border border-primary/20">
              <AvatarImage src={avatarUrl} alt={nickname || "profile"} />
              <AvatarFallback>{(nickname || "U").slice(0, 1)}</AvatarFallback>
            </Avatar>
            <AdviceDrawer />
          </div>
        </div>

        {showNav ? (
          <nav
            className={`-mx-3 overflow-x-auto border-y border-primary/15 bg-primary/5 px-2 transition-all duration-300 ease-in-out ${
              isNavVisible ? "max-h-20 py-2 opacity-100" : "max-h-0 overflow-hidden py-0 opacity-0"
            }`}
          >
            <div className="flex min-w-max gap-1.5">
              <NavLink
                to="/"
                className="flex min-w-[64px] flex-1 items-center justify-center rounded-xl bg-primary/12 px-3 py-2.5 transition-colors hover:bg-primary/20"
                activeClassName="ring-2 ring-primary/40"
              >
                <Home className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/history"
                className="flex min-w-[64px] flex-1 items-center justify-center rounded-xl bg-secondary px-3 py-2.5 text-center transition-colors hover:bg-secondary/80"
                activeClassName="ring-2 ring-primary/40"
              >
                <Activity className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/comparison"
                className="flex min-w-[64px] flex-1 items-center justify-center rounded-xl bg-secondary px-3 py-2.5 text-center transition-colors hover:bg-secondary/80"
                activeClassName="ring-2 ring-primary/40"
              >
                <BarChart3 className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/friends"
                className="flex min-w-[64px] flex-1 items-center justify-center rounded-xl bg-secondary px-3 py-2.5 text-center transition-colors hover:bg-secondary/80"
                activeClassName="ring-2 ring-primary/40"
              >
                <Users className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/chat"
                className="flex min-w-[64px] flex-1 items-center justify-center rounded-xl bg-secondary px-3 py-2.5 text-center transition-colors hover:bg-secondary/80"
                activeClassName="ring-2 ring-primary/40"
              >
                <MessageCircleMore className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/feed"
                className="flex min-w-[64px] flex-1 items-center justify-center rounded-xl bg-secondary px-3 py-2.5 text-center transition-colors hover:bg-secondary/80"
                activeClassName="ring-2 ring-primary/40"
              >
                <View className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/game"
                className="flex min-w-[64px] flex-1 items-center justify-center rounded-xl bg-primary/10 px-3 py-2.5 text-center transition-colors hover:bg-primary/18"
                activeClassName="ring-2 ring-primary/40"
              >
                <Gamepad2 className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/admin"
                className="flex min-w-[64px] flex-1 items-center justify-center rounded-xl bg-primary/12 px-3 py-2.5 transition-colors hover:bg-primary/20"
                activeClassName="ring-2 ring-primary/40"
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
