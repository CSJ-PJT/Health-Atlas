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

  useEffect(() => {
    setNickname(localStorage.getItem("user_nickname") || "");
    setAvatarUrl(localStorage.getItem("user_avatar") || "");
  }, [location]);

  useEffect(() => {
    if (!showNav) {
      document.body.style.paddingBottom = "";
      return;
    }
    document.body.style.paddingBottom = "122px";
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [showNav]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/96 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/76">
        <div className="container px-3">
          <div className="flex min-h-[4.5rem] items-center justify-between gap-2 py-2">
            <Link to="/" className="flex min-w-0 flex-1 items-center gap-2 transition-opacity hover:opacity-80">
              <img src="/app-icon.png" alt="Logo" className="h-10 w-10 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold leading-tight text-foreground sm:text-3xl">RH Healthcare</h1>
              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              <AdviceDrawer />
              <p className="max-w-[96px] truncate text-xs text-muted-foreground">{nickname}</p>
              <Avatar className="h-8 w-8 border border-primary/20">
                <AvatarImage src={avatarUrl} alt={nickname || "profile"} />
                <AvatarFallback>{(nickname || "U").slice(0, 1)}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {showNav ? (
        <div className="fixed inset-x-0 bottom-0 z-[70] px-2 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2">
          <nav
            className="mx-auto max-w-screen-md rounded-2xl border border-primary/15 bg-background/98 px-2 py-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur supports-[backdrop-filter]:bg-background/84"
          >
            <div className="grid grid-cols-8 gap-1.5">
              <NavLink
                to="/"
                className="flex min-w-0 items-center justify-center rounded-xl bg-primary/12 px-2 py-3 text-foreground transition-colors hover:bg-primary/20"
                activeClassName="ring-2 ring-primary/40"
              >
                <Home className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/history"
                className="flex min-w-0 items-center justify-center rounded-xl bg-secondary px-2 py-3 text-foreground transition-colors hover:bg-secondary/80"
                activeClassName="ring-2 ring-primary/40"
              >
                <Activity className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/comparison"
                className="flex min-w-0 items-center justify-center rounded-xl bg-secondary px-2 py-3 text-foreground transition-colors hover:bg-secondary/80"
                activeClassName="ring-2 ring-primary/40"
              >
                <BarChart3 className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/friends"
                className="flex min-w-0 items-center justify-center rounded-xl bg-secondary px-2 py-3 text-foreground transition-colors hover:bg-secondary/80"
                activeClassName="ring-2 ring-primary/40"
              >
                <Users className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/chat"
                className="flex min-w-0 items-center justify-center rounded-xl bg-secondary px-2 py-3 text-foreground transition-colors hover:bg-secondary/80"
                activeClassName="ring-2 ring-primary/40"
              >
                <MessageCircleMore className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/feed"
                className="flex min-w-0 items-center justify-center rounded-xl bg-secondary px-2 py-3 text-foreground transition-colors hover:bg-secondary/80"
                activeClassName="ring-2 ring-primary/40"
              >
                <View className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/game"
                className="flex min-w-0 items-center justify-center rounded-xl bg-primary/10 px-2 py-3 text-foreground transition-colors hover:bg-primary/18"
                activeClassName="ring-2 ring-primary/40"
              >
                <Gamepad2 className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/admin"
                className="flex min-w-0 items-center justify-center rounded-xl bg-primary/12 px-2 py-3 text-foreground transition-colors hover:bg-primary/20"
                activeClassName="ring-2 ring-primary/40"
              >
                <Settings className="h-5 w-5" />
              </NavLink>
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
};
