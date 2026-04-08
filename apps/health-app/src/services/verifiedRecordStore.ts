import { supabase } from "@/integrations/supabase/client";
import { readScopedJson, readScopedValue, writeScopedJson, writeScopedValue } from "@/services/persistence/scopedStorage";
import { loadServerSnapshot, saveServerSnapshot } from "@/services/repositories/serverSnapshotRepository";

export type RecordType = "10k" | "half" | "full";

export interface VerifiedRecord {
  id: string;
  type: RecordType;
  label: string;
  officialTime: string;
  certified: boolean;
  uploadedAt: string;
}

const RECORDS_KEY = "verified_records_v1";
const DISPLAY_KEY = "profile_display_record_type_v1";

function getProfileId() {
  return localStorage.getItem("profile_id");
}

export function getVerifiedRecords() {
  return readScopedJson<VerifiedRecord[]>(RECORDS_KEY, []);
}

export function saveVerifiedRecord(record: Omit<VerifiedRecord, "id" | "uploadedAt">) {
  const records = getVerifiedRecords();
  const newRecord = {
    ...record,
    id: `record-${Date.now()}`,
    uploadedAt: new Date().toISOString(),
  };
  const next = [newRecord, ...records];
  writeScopedJson(RECORDS_KEY, next);
  void saveServerVerifiedRecord(newRecord, next);
  return next;
}

export function getDisplayedRecordType(): RecordType {
  return (readScopedValue(DISPLAY_KEY, "full") as RecordType) || "full";
}

export function setDisplayedRecordType(type: RecordType) {
  writeScopedValue(DISPLAY_KEY, type);
  void saveServerDisplayRecordType(type);
}

export function findDisplayedRecord() {
  const type = getDisplayedRecordType();
  return getVerifiedRecords().find((record) => record.type === type && record.certified) || null;
}

export function buildRecordTag(record: VerifiedRecord | null) {
  if (!record) return null;

  if (record.type === "full") {
    const [hours = "0"] = record.officialTime.split(":");
    if (Number(hours) < 3) return "Sub3";
    if (Number(hours) < 4) return "Sub4";
    return `Full ${record.officialTime}`;
  }
  if (record.type === "half") return `Half ${record.officialTime}`;
  if (record.type === "10k") return `10K ${record.officialTime}`;
  return record.officialTime;
}

export async function hydrateVerifiedRecordsFromServer() {
  const [records, displayType] = await Promise.all([loadServerVerifiedRecords(), loadServerDisplayRecordType()]);

  let changed = false;

  if (Array.isArray(records)) {
    writeScopedJson(RECORDS_KEY, records);
    changed = true;
  } else {
    const snapshotRecords = await loadServerSnapshot<VerifiedRecord[]>("verified_records");
    if (Array.isArray(snapshotRecords)) {
      writeScopedJson(RECORDS_KEY, snapshotRecords);
      changed = true;
    }
  }

  if (displayType === "10k" || displayType === "half" || displayType === "full") {
    writeScopedValue(DISPLAY_KEY, displayType);
    changed = true;
  } else {
    const snapshotDisplay = await loadServerSnapshot<RecordType>("display_record_type");
    if (snapshotDisplay === "10k" || snapshotDisplay === "half" || snapshotDisplay === "full") {
      writeScopedValue(DISPLAY_KEY, snapshotDisplay);
      changed = true;
    }
  }

  return changed;
}

async function saveServerVerifiedRecord(record: VerifiedRecord, records: VerifiedRecord[]) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }
  const { error } = await supabase.from("user_verified_records").upsert({
    id: record.id,
    profile_id: profileId,
    record_type: record.type,
    label: record.label,
    official_time: record.officialTime,
    certified: record.certified,
    uploaded_at: record.uploadedAt,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    void saveServerSnapshot("verified_records", records);
    return false;
  }

  return true;
}

async function saveServerDisplayRecordType(type: RecordType) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }

  const { error } = await supabase.from("user_profile_preferences").upsert({
    profile_id: profileId,
    display_record_type: type,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    void saveServerSnapshot("display_record_type", type);
    return false;
  }

  return true;
}

async function loadServerVerifiedRecords() {
  const profileId = getProfileId();
  if (!profileId) {
    return null;
  }

  const { data, error } = await supabase.from("user_verified_records").select("*").eq("profile_id", profileId).order("uploaded_at", { ascending: false });
  if (error) {
    return null;
  }

  return (data || []).map(
    (row): VerifiedRecord => ({
      id: row.id,
      type: row.record_type as RecordType,
      label: row.label,
      officialTime: row.official_time,
      certified: row.certified,
      uploadedAt: row.uploaded_at,
    }),
  );
}

async function loadServerDisplayRecordType() {
  const profileId = getProfileId();
  if (!profileId) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_profile_preferences")
    .select("display_record_type")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error || !data?.display_record_type) {
    return null;
  }

  return data.display_record_type as RecordType;
}
