import { createTransferLog } from "@/providers/shared/services/transferLogRepository";

export async function createAuditLog(message: string, status: "success" | "error" = "success") {
  try {
    await createTransferLog("audit", status, message);
  } catch (error) {
    console.warn("Failed to write audit log:", error);
  }
}
