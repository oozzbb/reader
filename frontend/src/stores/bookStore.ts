import { create } from "zustand";
import { SearchResult, Chapter } from "@/api/client";
import { api } from "@/api/client";

function scoreResult(item: SearchResult, keyword: string): number {
  const kw = keyword.toLowerCase();
  const name = (item.name || "").toLowerCase();
  if (name === kw) return 3;
  if (name.includes(kw)) return 2;
  const author = (item.author || "").toLowerCase();
  const intro = (item.intro || "").toLowerCase();
  if (author.includes(kw) || intro.includes(kw)) return 1;
  return 0;
}

function dedupeAndSort(results: SearchResult[], keyword: string): SearchResult[] {
  const scored = results.map((r) => ({ ...r, _score: scoreResult(r, keyword) }));
  scored.sort((a, b) => b._score - a._score);

  const seen = new Map<string, number>();
  const deduped: SearchResult[] = [];
  for (const item of scored) {
    const key = `${item.name}|${item.author}`.toLowerCase();
    const existing = seen.get(key);
    if (existing !== undefined) continue;
    seen.set(key, deduped.length);
    deduped.push(item);
  }
  return deduped;
}

interface BookState {
  searchResults: SearchResult[];
  searchKeyword: string;
  chapters: Chapter[];
  loading: boolean;
  error: string;
  search: (keyword: string) => Promise<void>;
  loadChapters: (bookUrl: string, sourceUrl: string) => Promise<void>;
}

export const useBookStore = create<BookState>((set) => ({
  searchResults: [],
  searchKeyword: "",
  chapters: [],
  loading: false,
  error: "",

  search: async (keyword: string) => {
    set({ searchResults: [], searchKeyword: keyword, loading: true, error: "" });

    try {
      const response = await fetch(
        `/api/search?keyword=${encodeURIComponent(keyword)}`
      );
      if (!response.ok) throw new Error(`Search failed: ${response.status}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let allResults: SearchResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;

          try {
            const batch: SearchResult[] = JSON.parse(payload);
            allResults = [...allResults, ...batch];
            set({ searchResults: dedupeAndSort(allResults, keyword) });
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ loading: false });
    }
  },

  loadChapters: async (bookUrl: string, sourceUrl: string) => {
    set({ loading: true, error: "" });
    try {
      const chapters = await api.getChapters(bookUrl, sourceUrl);
      set({ chapters, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
}));
