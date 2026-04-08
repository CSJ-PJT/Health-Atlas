import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

export function GameShell({ title, subtitle, onClose, children }: Props) {
  return (
    <div className="rounded-3xl border bg-background/95 shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <div className="text-xl font-bold">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div> : null}
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="게임 닫기">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
