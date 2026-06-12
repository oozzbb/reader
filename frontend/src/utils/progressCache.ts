import type { ProgressItem } from "@/api/client";

const STORAGE_KEY = "reader_progress_cache_v1";
const MAX_ITEMS = 50;

function readProgressMap(): Record<string, ProgressItem> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeProgressMap(map: Record<string, ProgressItem>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore quota or private-mode storage failures.
  }
}

export function saveLocalProgress(item: Omit<ProgressItem, "updated_at"> & { updated_at?: string }) {
  const map = readProgressMap();
  map[item.book_url] = {
    ...item,
    updated_at: item.updated_at || new Date().toISOString(),
  };

  const entries = Object.values(map)
    .sort((a, b) => Date.parse(b.updated_at || "") - Date.parse(a.updated_at || ""));
  writeProgressMap(Object.fromEntries(entries.slice(0, MAX_ITEMS).map((progress) => [progress.book_url, progress])));
}

export function getLocalProgress(bookUrl: string): ProgressItem | null {
  return readProgressMap()[bookUrl] || null;
}

export function getLocalProgressList(): ProgressItem[] {
  return Object.values(readProgressMap())
    .sort((a, b) => Date.parse(b.updated_at || "") - Date.parse(a.updated_at || ""));
}

export function mergeProgress(serverItems: ProgressItem[], localItems: ProgressItem[]): ProgressItem[] {
  const map = new Map<string, ProgressItem>();
  for (const item of [...serverItems, ...localItems]) {
    const existing = map.get(item.book_url);
    if (!existing || Date.parse(item.updated_at || "") >= Date.parse(existing.updated_at || "")) {
      map.set(item.book_url, item);
    }
  }
  return Array.from(map.values())
    .sort((a, b) => Date.parse(b.updated_at || "") - Date.parse(a.updated_at || ""));
}
