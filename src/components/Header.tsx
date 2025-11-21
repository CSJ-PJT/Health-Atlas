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
          <nav className="flex gap-0 bg-secondary/30 -mx-4 px-4 py-3 border-y border-border/50">
            <NavLink to="/" className="flex-1 px-4 py-2.5 rounded-lg hover:bg-primary/20 transition-colors bg-primary/10 text-center">
              <Home className="h-5 w-5 mx-auto" />
            </NavLink>
            <NavLink to="/history" className="flex-1 px-4 py-2.5 rounded-lg hover:bg-primary/20 transition-colors bg-primary/10 text-center">
              <span className="text-sm font-medium">기록</span>
            </NavLink>
            <NavLink to="/comparison" className="flex-1 px-4 py-2.5 rounded-lg hover:bg-primary/20 transition-colors bg-primary/10 text-center">
              <span className="text-sm font-medium">비교</span>
            </NavLink>
            <NavLink to="/monitor" className="flex-1 px-4 py-2.5 rounded-lg hover:bg-primary/20 transition-colors bg-primary/10 text-center">
              <span className="text-sm font-medium">연동</span>
            </NavLink>
            <NavLink to="/admin" className="flex-1 px-4 py-2.5 rounded-lg hover:bg-primary/20 transition-colors bg-primary/10 text-center">
              <span className="text-sm font-medium">관리</span>
            </NavLink>
          </nav>
        )}
      </div>
    </header>
  );
};
