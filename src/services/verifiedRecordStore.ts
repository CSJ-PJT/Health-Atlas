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

function readJson<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getVerifiedRecords() {
  return readJson<VerifiedRecord[]>(RECORDS_KEY, []);
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
  writeJson(RECORDS_KEY, next);
  return next;
}

export function getDisplayedRecordType(): RecordType {
  return (localStorage.getItem(DISPLAY_KEY) as RecordType) || "full";
}

export function setDisplayedRecordType(type: RecordType) {
  localStorage.setItem(DISPLAY_KEY, type);
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
