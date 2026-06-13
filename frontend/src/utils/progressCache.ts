import type { ProgressItem } from "@/api/client";
import { get as idbGet, set as idbSet } from "idb-keyval";

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

function toProgressMap(items: ProgressItem[]) {
  return Object.fromEntries(items.slice(0, MAX_ITEMS).map((progress) => [progress.book_url, progress]));
}

export function saveLocalProgress(item: Omit<ProgressItem, "updated_at"> & { updated_at?: string }) {
  const map = readProgressMap();
  map[item.book_url] = {
    ...item,
    updated_at: item.updated_at || new Date().toISOString(),
  };

  const entries = Object.values(map)
    .sort((a, b) => Date.parse(b.updated_at || "") - Date.parse(a.updated_at || ""));
  const nextMap = toProgressMap(entries);
  writeProgressMap(nextMap);
  idbGet<Record<string, ProgressItem>>(STORAGE_KEY)
    .then((cached) => {
      const merged = mergeProgress(Object.values(cached || {}), Object.values(nextMap));
      return idbSet(STORAGE_KEY, toProgressMap(merged));
    })
    .catch(() => idbSet(STORAGE_KEY, nextMap).catch(() => {}));
}

export function getLocalProgress(bookUrl: string): ProgressItem | null {
  return readProgressMap()[bookUrl] || null;
}

export function getLocalProgressList(): ProgressItem[] {
  return Object.values(readProgressMap())
    .sort((a, b) => Date.parse(b.updated_at || "") - Date.parse(a.updated_at || ""));
}

export async function getCachedProgress(bookUrl: string): Promise<ProgressItem | null> {
  const local = getLocalProgress(bookUrl);
  const cachedMap = await idbGet<Record<string, ProgressItem>>(STORAGE_KEY).catch(() => undefined);
  const cached = cachedMap?.[bookUrl] || null;
  if (!cached) return local;
  if (!local || Date.parse(cached.updated_at || "") >= Date.parse(local.updated_at || "")) {
    return cached;
  }
  return local;
}

export async function getCachedProgressList(): Promise<ProgressItem[]> {
  const localItems = getLocalProgressList();
  const cachedMap = await idbGet<Record<string, ProgressItem>>(STORAGE_KEY).catch(() => undefined);
  const cachedItems = Object.values(cachedMap || {});
  const merged = mergeProgress(cachedItems, localItems);
  if (merged.length) writeProgressMap(toProgressMap(merged));
  return merged;
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
