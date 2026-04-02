import { MessageSquareText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const AdviceDrawer = () => {
  return (
    <Button asChild size="sm" className="gap-2 bg-primary/90 text-primary-foreground hover:bg-primary">
      <Link to="/ai-coach">
        <MessageSquareText className="h-4 w-4" />
        AI 코치
      </Link>
    </Button>
  );
};
