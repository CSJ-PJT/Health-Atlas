import { MessageSquareText } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const AdviceDrawer = () => {
  const location = useLocation();

  return (
    <Button asChild size="sm" className="gap-2 bg-cyan-500 text-white hover:bg-cyan-600">
      <Link to="/ai-coach" state={{ from: location.pathname }}>
        <MessageSquareText className="h-4 w-4" />
        AI 코치
      </Link>
    </Button>
  );
};
