import { Home } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Link } from "react-router-dom";

interface HeaderProps {
  showNav?: boolean;
}

export const Header = ({ showNav = false }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-4">
        <div className="flex h-20 items-center gap-3">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/app-icon.png" alt="Logo" className="h-12 w-12" />
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold leading-tight">Roboheart Healthcare</h1>
              <p className="text-xs text-muted-foreground">Samsung Health Sync GPT</p>
            </div>
          </Link>
        </div>
        
        {showNav && (
          <nav className="flex gap-2 pb-4">
            <NavLink to="/" className="px-4 py-2 rounded-lg hover:bg-accent transition-colors">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span className="text-sm font-medium">모니터링</span>
              </div>
            </NavLink>
            <NavLink to="/history" className="px-4 py-2 rounded-lg hover:bg-accent transition-colors">
              <span className="text-sm font-medium">기록</span>
            </NavLink>
            <NavLink to="/comparison" className="px-4 py-2 rounded-lg hover:bg-accent transition-colors">
              <span className="text-sm font-medium">비교</span>
            </NavLink>
            <NavLink to="/monitor" className="px-4 py-2 rounded-lg hover:bg-accent transition-colors">
              <span className="text-sm font-medium">연동</span>
            </NavLink>
          </nav>
        )}
      </div>
    </header>
  );
};
