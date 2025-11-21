import { Home, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

interface HeaderProps {
  showNav?: boolean;
}

export const Header = ({ showNav = false }: HeaderProps) => {
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    const storedNickname = localStorage.getItem("user_nickname") || "";
    setNickname(storedNickname);
  }, []);

  const openGPT = () => {
    // Try to open ChatGPT app, fallback to web
    const chatGPTAppURL = "chatgpt://";
    const chatGPTWebURL = "https://chat.openai.com";
    
    // Attempt to open app
    window.location.href = chatGPTAppURL;
    
    // Fallback to web after a short delay
    setTimeout(() => {
      window.open(chatGPTWebURL, '_blank');
    }, 500);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-4">
        <div className="flex h-20 items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/app-icon.png" alt="Logo" className="h-12 w-12" />
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold leading-tight">Roboheart Healthcare</h1>
              <p className="text-xs text-muted-foreground">Samsung Health Sync GPT</p>
            </div>
          </Link>
          <button 
            onClick={openGPT}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-white hover:bg-white/90 transition-colors shadow-sm"
            aria-label="Open ChatGPT"
          >
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" 
              alt="ChatGPT" 
              className="h-8 w-8"
            />
            <span className="text-xs text-gray-700">{nickname}</span>
          </button>
        </div>
        
        {showNav && (
          <nav className="flex gap-1 bg-primary/5 -mx-4 px-2 py-4 border-y border-primary/20">
            <NavLink to="/" className="flex-1 px-6 py-3.5 rounded-lg hover:bg-primary/30 transition-colors bg-primary/20 text-center flex items-center justify-center">
              <Home className="h-6 w-6" />
            </NavLink>
            <NavLink to="/history" className="flex-1 px-6 py-3.5 rounded-lg hover:bg-accent/30 transition-colors bg-accent/20 text-center flex items-center justify-center">
              <span className="text-base font-medium whitespace-nowrap">기록</span>
            </NavLink>
            <NavLink to="/comparison" className="flex-1 px-6 py-3.5 rounded-lg hover:bg-secondary/50 transition-colors bg-secondary/30 text-center flex items-center justify-center">
              <span className="text-base font-medium whitespace-nowrap">비교</span>
            </NavLink>
            <NavLink to="/monitor" className="flex-1 px-6 py-3.5 rounded-lg hover:bg-muted/70 transition-colors bg-muted/50 text-center flex items-center justify-center">
              <span className="text-base font-medium whitespace-nowrap">연동</span>
            </NavLink>
            <NavLink to="/admin" className="flex-1 px-6 py-3.5 rounded-lg hover:bg-primary/30 transition-colors bg-primary/20 text-center flex items-center justify-center">
              <Settings className="h-6 w-6" />
            </NavLink>
          </nav>
        )}
      </div>
    </header>
  );
};
