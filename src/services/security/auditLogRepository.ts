import { supabase } from "@/integrations/supabase/client";
import { createTransferLog } from "@/providers/shared/services/transferLogRepository";

type AuditCategory = "privacy" | "security" | "export" | "deletion" | "general";

export async function createAuditLog(
  message: string,
  status: "success" | "error" = "success",
  category: AuditCategory = "general",
  payload: Record<string, unknown> = {},
) {
  const profileId = localStorage.getItem("profile_id");
  try {
    if (profileId) {
      await supabase.from("app_audit_events" as never).insert({
        profile_id: profileId,
        category,
        status,
        message,
        payload,
      } as never);
    }
    await createTransferLog("audit", status, message);
  } catch (error) {
    console.warn("Failed to write audit log:", error);
  }
}
