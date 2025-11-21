import { History, BarChart3, Activity } from "lucide-react";
import { NavLink } from "@/components/NavLink";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src="/app-icon.png" alt="Logo" className="h-10 w-10" />
          <div className="flex flex-col">
            <h1 className="text-xl font-bold leading-tight">Roboheart Healthcare</h1>
            <p className="text-xs text-muted-foreground">Samsung Health Sync GPT</p>
          </div>
        </div>
        
        <nav className="flex gap-1">
          <NavLink to="/" className="flex flex-col items-center gap-1 px-3 py-2">
            <Activity className="h-4 w-4" />
            <span className="text-[10px]">홈</span>
          </NavLink>
          <NavLink to="/history" className="flex flex-col items-center gap-1 px-3 py-2">
            <History className="h-4 w-4" />
            <span className="text-[10px]">기록</span>
          </NavLink>
          <NavLink to="/comparison" className="flex flex-col items-center gap-1 px-3 py-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-[10px]">비교</span>
          </NavLink>
          <NavLink to="/monitor" className="flex flex-col items-center gap-1 px-3 py-2">
            <Activity className="h-4 w-4" />
            <span className="text-[10px]">모니터링</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
};
