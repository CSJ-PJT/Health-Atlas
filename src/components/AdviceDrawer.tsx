import { MessageSquareText } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const AdviceDrawer = () => {
  const location = useLocation();

  return (
    <Button asChild size="icon" className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90">
      <Link to="/ai-coach" state={{ from: location.pathname }} aria-label="AI 코치">
        <MessageSquareText className="h-4 w-4" />
      </Link>
    </Button>
  );
};
