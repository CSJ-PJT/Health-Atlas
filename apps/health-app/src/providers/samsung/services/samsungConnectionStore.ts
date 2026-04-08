import { supabase } from "@/integrations/supabase/client";

export async function persistSamsungConnection(deviceId: string) {
  const profileId = localStorage.getItem("profile_id");
  if (!profileId) {
    throw new Error("프로필 정보를 찾을 수 없습니다.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      samsung_health_device_id: deviceId,
      samsung_health_connected_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) {
    throw error;
  }

  localStorage.setItem("samsung_health_device_id", deviceId);
  localStorage.setItem("samsung_health_connected", "true");
}

export function getSamsungLastSyncAt() {
  return localStorage.getItem("samsung_health_last_sync");
}

export function setSamsungLastSyncAt(isoString: string) {
  localStorage.setItem("samsung_health_last_sync", isoString);
}
