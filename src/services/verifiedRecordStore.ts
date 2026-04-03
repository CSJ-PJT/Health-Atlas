import { readScopedJson, readScopedValue, writeScopedJson, writeScopedValue } from "@/services/persistence/scopedStorage";

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

export function getVerifiedRecords() {
  return readScopedJson<VerifiedRecord[]>(RECORDS_KEY, []);
}

export function saveVerifiedRecord(record: Omit<VerifiedRecord, "id" | "uploadedAt">) {
  const records = getVerifiedRecords();
  const next = [
    {
      ...record,
      id: `record-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    },
    ...records,
  ];
  writeScopedJson(RECORDS_KEY, next);
  return next;
}

export function getDisplayedRecordType(): RecordType {
  return (readScopedValue(DISPLAY_KEY, "full") as RecordType) || "full";
}

export function setDisplayedRecordType(type: RecordType) {
  writeScopedValue(DISPLAY_KEY, type);
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
