export interface AdviceArchiveEntry {
  id: string;
  providerId: string;
  createdAt: string;
  summary: string;
  conversation: Array<{
    role: "assistant" | "user";
    content: string;
  }>;
}

const ARCHIVE_KEY = "gpt_advice_archive";

export function getAdviceArchive(): AdviceArchiveEntry[] {
  const stored = localStorage.getItem(ARCHIVE_KEY);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as AdviceArchiveEntry[];
  } catch {
    return [];
  }
}

export function saveAdviceArchive(entry: AdviceArchiveEntry) {
  const current = getAdviceArchive();
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify([entry, ...current].slice(0, 50)));
}
