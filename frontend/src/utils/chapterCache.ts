import { get as idbGet, set as idbSet } from "idb-keyval";
import type { Chapter } from "@/api/client";

function chapterListKey(bookUrl: string, sourceUrl: string) {
  return `toc:${sourceUrl}::${bookUrl}`;
}

export async function saveChapterList(bookUrl: string, sourceUrl: string, chapters: Chapter[]) {
  if (!bookUrl || !sourceUrl || chapters.length === 0) return;
  await idbSet(chapterListKey(bookUrl, sourceUrl), chapters);
}

export async function getCachedChapterList(bookUrl: string, sourceUrl: string): Promise<Chapter[]> {
  if (!bookUrl || !sourceUrl) return [];
  const cached = await idbGet<Chapter[]>(chapterListKey(bookUrl, sourceUrl)).catch(() => undefined);
  return Array.isArray(cached) ? cached : [];
}
