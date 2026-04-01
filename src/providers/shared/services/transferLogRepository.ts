import { supabase } from "@/integrations/supabase/client";

export type TransferLogStatus = "success" | "error" | "pending";

export async function createTransferLog(
  logType: string,
  status: TransferLogStatus,
  message: string,
) {
  const profileId = localStorage.getItem("profile_id");
  if (!profileId) {
    return;
  }

  const { error } = await supabase.from("transfer_logs").insert({
    profile_id: profileId,
    log_type: logType,
    status,
    message,
  });

  if (error) {
    throw error;
  }
}
