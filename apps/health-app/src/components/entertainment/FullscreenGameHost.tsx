import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Expand, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
};

export function FullscreenGameHost({ title, subtitle, onBack, children }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIsFullscreen(document.fullscreenElement === hostRef.current);
    };

    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const handleToggleFullscreen = async () => {
    if (!hostRef.current) return;
    if (document.fullscreenElement === hostRef.current) {
      await document.exitFullscreen?.();
      return;
    }
    await hostRef.current.requestFullscreen?.();
  };

  return (
    <div
      ref={hostRef}
      className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(145,190,120,0.24),_transparent_34%),linear-gradient(180deg,#0f172a_0%,#15231a_100%)] text-white"
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-black/25 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="icon" onClick={onBack} aria-label="엔터테인먼트로 돌아가기">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="text-lg font-semibold">{title}</div>
            {subtitle ? <div className="text-xs text-white/70">{subtitle}</div> : null}
          </div>
        </div>
        <Button variant="secondary" size="sm" className="gap-2" onClick={handleToggleFullscreen}>
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          {isFullscreen ? "창 모드" : "전체 화면"}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
