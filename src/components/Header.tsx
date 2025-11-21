import { History, BarChart3, Activity, TrendingUp } from "lucide-react";
import { NavLink } from "@/components/NavLink";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src="/app-icon.png" alt="Logo" className="h-12 w-12" />
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold leading-tight">Roboheart Healthcare</h1>
            <p className="text-xs text-muted-foreground">Samsung Health Sync GPT</p>
          </div>
        </div>
        
        <nav className="flex gap-2">
          <NavLink to="/" className="flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-accent transition-colors">
            <Activity className="h-5 w-5" />
            <span className="text-sm font-medium">홈</span>
          </NavLink>
          <NavLink to="/history" className="flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-accent transition-colors">
            <History className="h-5 w-5" />
            <span className="text-sm font-medium">기록</span>
          </NavLink>
          <NavLink to="/comparison?tab=general" className="flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-accent transition-colors">
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm font-medium">일반비교</span>
          </NavLink>
          <NavLink to="/comparison?tab=running" className="flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-accent transition-colors">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-medium">러닝비교</span>
          </NavLink>
          <NavLink to="/monitor" className="flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-accent transition-colors">
            <Activity className="h-5 w-5" />
            <span className="text-sm font-medium">모니터링</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
};
