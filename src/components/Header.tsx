import { useEffect, useState } from "react";
import { Activity, BarChart3, Gamepad2, Home, MessageCircleMore, Settings, View } from "lucide-react";
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
    document.body.style.paddingTop = "calc(env(safe-area-inset-top) + 84px)";
    document.body.style.paddingBottom = showNav ? "148px" : "";
    return () => {
      document.body.style.paddingTop = "";
      document.body.style.paddingBottom = "";
    };
  }, [showNav]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 w-full border-b bg-background pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="container px-3">
          <div className="flex min-h-[4.5rem] items-center justify-between gap-2 py-2">
            <Link to="/" className="flex min-w-0 flex-1 items-center gap-2 transition-opacity hover:opacity-80">
              <img src="/app-icon.png" alt="Logo" className="h-10 w-10 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold leading-tight text-foreground sm:text-3xl">RH Healthcare</h1>
              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              <p className="max-w-[96px] truncate text-xs text-muted-foreground">{nickname}</p>
              <AdviceDrawer />
              <Avatar className="h-8 w-8 border border-primary/20">
                <AvatarImage src={avatarUrl} alt={nickname || "profile"} />
                <AvatarFallback>{(nickname || "U").slice(0, 1)}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {showNav ? (
        <div className="fixed inset-x-0 bottom-0 z-[70] bg-background px-2 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-3">
          <nav
            className="mx-auto max-w-screen-md rounded-2xl border border-primary/15 bg-background px-2 py-2.5 shadow-[0_-10px_28px_rgba(0,0,0,0.14)]"
          >
            <div className="grid grid-cols-7 gap-1.5">
              <NavLink
                to="/"
                className="flex min-w-0 items-center justify-center rounded-xl bg-violet-500/14 px-2 py-3 text-violet-700 transition-colors hover:bg-violet-500/22 dark:text-violet-200"
                activeClassName="ring-2 ring-primary/40"
              >
                <Home className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/history"
                className="flex min-w-0 items-center justify-center rounded-xl bg-sky-500/14 px-2 py-3 text-sky-700 transition-colors hover:bg-sky-500/22 dark:text-sky-200"
                activeClassName="ring-2 ring-primary/40"
              >
                <Activity className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/comparison"
                className="flex min-w-0 items-center justify-center rounded-xl bg-emerald-500/14 px-2 py-3 text-emerald-700 transition-colors hover:bg-emerald-500/22 dark:text-emerald-200"
                activeClassName="ring-2 ring-primary/40"
              >
                <BarChart3 className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/chat"
                className="flex min-w-0 items-center justify-center rounded-xl bg-rose-500/14 px-2 py-3 text-rose-700 transition-colors hover:bg-rose-500/22 dark:text-rose-200"
                activeClassName="ring-2 ring-primary/40"
              >
                <MessageCircleMore className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/feed"
                className="flex min-w-0 items-center justify-center rounded-xl bg-fuchsia-500/14 px-2 py-3 text-fuchsia-700 transition-colors hover:bg-fuchsia-500/22 dark:text-fuchsia-200"
                activeClassName="ring-2 ring-primary/40"
              >
                <View className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/game"
                className="flex min-w-0 items-center justify-center rounded-xl bg-cyan-500/14 px-2 py-3 text-cyan-700 transition-colors hover:bg-cyan-500/22 dark:text-cyan-200"
                activeClassName="ring-2 ring-primary/40"
              >
                <Gamepad2 className="h-5 w-5" />
              </NavLink>
              <NavLink
                to="/admin"
                className="flex min-w-0 items-center justify-center rounded-xl bg-indigo-500/14 px-2 py-3 text-indigo-700 transition-colors hover:bg-indigo-500/22 dark:text-indigo-200"
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
